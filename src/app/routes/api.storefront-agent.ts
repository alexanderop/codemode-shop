import { createFileRoute } from '@tanstack/react-router'
import { chat, maxIterations, toServerSentEventsStream } from '@tanstack/ai'
import type { ModelMessage } from '@tanstack/ai'
import { anthropicText } from '@tanstack/ai-anthropic'
import { storefrontModel } from '#/config/model'
import { createStorefrontUIPrompt } from '#/features/storefront/api/ui-prompt'
import { createAiUiPrompt } from '#/features/ai-ui/prompt'
import { createAiUiBindings } from '#/features/ai-ui/bindings'
import { buildStorefrontCodeMode } from '#/features/storefront/api/code-mode'
import { getStorefrontDriver } from '#/features/storefront/api/driver'
import { withSession } from '#/lib/session'
import { sessionContext } from '#/lib/session-context'
import { getSkillStorageForSession } from '#/features/storefront/api/skill-storage'
import { buildStorefrontSkillTools } from '#/features/storefront/api/skill-to-storefront-tool'
import { createRegisterSkillTool } from '#/features/storefront/api/register-skill-tool'

const TIMEOUT_MS = 45_000

const STOREFRONT_PROMPT = `You are Storekeeper, the AI shopping assistant for codemode.shop — a boutique shoe store with 30 products in the catalog.

## How you work

Your only tool is \`execute_typescript\`. Inside the sandbox you compose three families of \`external_*\` / \`ui_*\` calls:

- **Catalog (read-only)** — typed declarations are in the *Code mode* section: \`external_searchProducts\`, \`external_getProduct\`, \`external_getStockAndShipping\`, \`external_getReviewSummary\`, \`external_getPriceHistory\`. (Ignore the weather example there — it's generic SDK boilerplate.)
- **UI rendering** — typed declarations are in the *UI rendering* section: \`ui_addProductCard\`, \`ui_addCartSummary\`, \`ui_addCheckoutForm\`, \`ui_addOrderConfirmation\`, etc.
- **Cart & checkout** — these are runtime-only and listed below. Same call style as the catalog (async, prefixed \`external_\`):

\`\`\`typescript
external_getCart(): Promise<{ items: CartLine[]; itemCount: number; subtotal: number }>
external_addToCart({ productId, size, width?, quantity? }): Promise<{ itemCount; lineCount }>
external_removeFromCart({ productId, size, width? }): Promise<{ itemCount; lineCount }>
external_setCartQuantity({ productId, size, width?, quantity }): Promise<{ itemCount; lineCount }>  // quantity=0 removes
external_clearCart(): Promise<{ itemCount; lineCount }>
external_placeOrder({ shippingAddress, payment }): Promise<Order>  // see note below
external_getOrder({ id }): Promise<Order>
\`\`\`

## Workflows

**Shopping query** — find/compare/recommend products:
1. \`external_searchProducts\` first. For category words (running, trail, basketball, training, racing, lifestyle), use the \`category\` filter — don't stuff them into \`query\`.
2. \`Promise.all\` to fetch product + stock + reviews + (if price-sensitive) price history in parallel.
3. Filter / rank / compare in code. That's the point of code mode — don't round-trip through me.
4. Render every recommended product with \`ui_addProductCard\`. Use \`id: 'cta'\` for the primary call-to-action.
5. Return a one- or two-sentence recommendation.

**Cart inspection** ("what's in my cart", "show my cart"):
1. \`external_getCart()\`, then \`ui_addCartSummary({ id: 'cart', ...cart })\`. The summary is interactive (quantity adjust + checkout).
2. Return a one-line summary. Do NOT search products.

**Checkout** ("check out", "place my order", "let me pay"):
1. \`external_getCart()\` to confirm non-empty.
2. Render \`ui_addCheckoutForm({ id: 'checkout', subtotal, lineCount })\`. The form posts directly to /api/checkout — you do NOTHING else.
3. Return a one-sentence prompt like "Fill in your address and card and you're done."

> Never call \`external_placeOrder\` from a chat message. The checkout form is the only legitimate path; card details must come from the form, not the conversation.

## Rules

- One \`execute_typescript\` call per turn. \`await\` every \`external_*\` and \`ui_*\` call.
- The canvas is the answer. When a UI primitive shows the result (cart summary, comparison, product cards, order confirmation), keep your prose return to a single short sentence — don't restate values already on screen.
- Use the shopper's zip code from the *Shopper context* section for \`getStockAndShipping\`.
- Don't invent products, prices, or shipping ETAs — read them from the tools.
- If a search returns no IDs, broaden filters and try once more. Never render a comparison or CTA from an empty array.
- For vague queries, default to size 10 / standard width / shipper's zip.

## Saved shortcuts (skill memoization)

A skill is a zero-arg TypeScript snippet that handles a recurring catalog query for this shopper. They appear as tools whose description starts with \`[SKILL]\`.

**Using a skill:** if one matches the shopper's request, call it directly. Don't re-derive with \`execute_typescript\` afterward.

**Registering a skill:** after a successful \`execute_typescript\` for a catalog query, call \`register_skill\` once, alongside your final text reply. SKIP only if:
- the query was vague or one-off,
- it was a cart/checkout flow (those can't be skills),
- a skill with the same name already exists,
- it's unlikely to repeat.

When in doubt, register.

Skill body must use only catalog \`external_*\` (searchProducts, getProduct, getStockAndShipping, getReviewSummary, getPriceHistory) and \`ui_*\` — never cart/order. Bake concrete shopper constants (brand, size, zip) directly into the code; skills take no arguments. See the \`register_skill\` tool's input schema for the exact shape.`

interface SkillCatalogEntry {
  name: string
  description: string
}

function buildSkillCatalogPrompt(skills: ReadonlyArray<SkillCatalogEntry>): string {
  if (skills.length === 0) return ''
  const lines = skills.map((s) => `- \`${s.name}\` — ${s.description}`).join('\n')
  return `## Saved shortcuts available this turn

${lines}

If one of these matches the shopper's request, call it directly instead of \`execute_typescript\`.`
}

type ChatPostBody = {
  messages: Array<ModelMessage<string>>
  data?: { zipCode?: string }
}

export type PromptSectionOrigin = 'static' | 'generated' | 'mixed'

export interface SystemPromptSection {
  label: string
  content: string
  origin: PromptSectionOrigin
  source: string
}

async function buildSystemPromptSections({
  sessionId,
  zipCode,
}: {
  sessionId: ReturnType<typeof sessionContext.get>['sessionId']
  zipCode: string
}): Promise<Array<SystemPromptSection>> {
  const driver = await getStorefrontDriver({ timeout: TIMEOUT_MS, memoryLimit: 128 })
  const codeMode = buildStorefrontCodeMode({ driver, sessionId, timeout: TIMEOUT_MS })

  const skillStorage = getSkillStorageForSession(sessionId)
  const savedSkills = await skillStorage.loadAll()
  const skillCatalog = buildSkillCatalogPrompt(
    savedSkills.map((s) => ({ name: s.name, description: s.description })),
  )

  const sections: Array<SystemPromptSection> = [
    {
      label: 'Storekeeper instructions',
      content: STOREFRONT_PROMPT,
      origin: 'static',
      source: 'STOREFRONT_PROMPT constant',
    },
    {
      label: 'Code mode',
      content: codeMode.systemPrompt,
      origin: 'generated',
      source: '@tanstack/ai-code-mode — built from registered tools',
    },
    {
      label: 'UI rendering',
      content: createStorefrontUIPrompt({ zipCode }),
      origin: 'mixed',
      source: 'createStorefrontUIPrompt — template + UI registry declarations',
    },
    {
      label: 'AI-controlled UI actions',
      content: createAiUiPrompt(),
      origin: 'generated',
      source: 'createAiUiPrompt — AI action registry declarations',
    },
    {
      label: 'Saved skills',
      content: skillCatalog,
      origin: 'generated',
      source: `${savedSkills.length} skill(s) loaded for this session`,
    },
    {
      label: 'Shopper context',
      content: `Shopper context: zipCode=${zipCode}. Today is ${new Date().toISOString().slice(0, 10)}.`,
      origin: 'generated',
      source: 'runtime: zipCode + today',
    },
  ]
  return sections.filter((s) => s.content.length > 0)
}

export const Route = createFileRoute('/api/storefront-agent')({
  server: {
    handlers: {
      GET: ({ request }) =>
        withSession(request, async () => {
          const { sessionId } = sessionContext.get()
          const url = new URL(request.url)
          const zipCode = url.searchParams.get('zipCode') ?? '94107'
          const sections = await buildSystemPromptSections({ sessionId, zipCode })
          return new Response(JSON.stringify({ sections }), {
            headers: { 'Content-Type': 'application/json' },
          })
        }),
      POST: ({ request }) =>
        withSession(request, async () => {
          if (request.signal.aborted) {
            return new Response(null, { status: 499 })
          }

          const { sessionId } = sessionContext.get()
          const body = await request.json()
          const { messages, data } = body as ChatPostBody
          const zipCode = data?.zipCode ?? '94107'
          const abortController = new AbortController()
          request.signal.addEventListener('abort', () => abortController.abort())

          const adapter = anthropicText(storefrontModel)
          const driver = await getStorefrontDriver({ timeout: TIMEOUT_MS, memoryLimit: 128 })
          const codeMode = buildStorefrontCodeMode({
            driver,
            sessionId,
            timeout: TIMEOUT_MS,
            extraBindings: createAiUiBindings(),
          })

          const skillStorage = getSkillStorageForSession(sessionId)
          const savedSkills = await skillStorage.loadAll()
          const skillTools = buildStorefrontSkillTools({
            skills: savedSkills,
            driver,
            storage: skillStorage,
            timeout: TIMEOUT_MS,
          })
          const registerTool = createRegisterSkillTool(sessionId)

          const skillCatalog = buildSkillCatalogPrompt(
            savedSkills.map((s) => ({ name: s.name, description: s.description })),
          )

          const stream = chat({
            adapter,
            messages,
            tools: [codeMode.tool, registerTool, ...skillTools],
            systemPrompts: [
              STOREFRONT_PROMPT,
              codeMode.systemPrompt,
              createStorefrontUIPrompt({ zipCode }),
              createAiUiPrompt(),
              skillCatalog,
              `Shopper context: zipCode=${zipCode}. Today is ${new Date().toISOString().slice(0, 10)}.`,
            ].filter((s) => s.length > 0),
            agentLoopStrategy: maxIterations(6),
            maxTokens: 4096,
            abortController,
          })

          return new Response(toServerSentEventsStream(stream, abortController), {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
            },
          })
        }),
    },
  },
})
