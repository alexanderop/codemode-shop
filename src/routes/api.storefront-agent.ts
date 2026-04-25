import { createFileRoute } from '@tanstack/react-router'
import { chat, maxIterations, toServerSentEventsStream } from '@tanstack/ai'
import type { ModelMessage } from '@tanstack/ai'
import { createCodeMode } from '@tanstack/ai-code-mode'
import { anthropicText } from '@tanstack/ai-anthropic'
import { catalogTools } from '#/lib/tools/catalog-tools'
import { storefrontModel } from '#/lib/model'
import { createStorefrontUIBindings } from '#/lib/storefront/ui-bindings'
import { createStorefrontUIPrompt } from '#/lib/storefront/ui-prompt'

let codeModeCache: ReturnType<typeof createCodeMode> | null = null

async function getCodeMode() {
  if (!codeModeCache) {
    const { createNodeIsolateDriver } = await import('@tanstack/ai-isolate-node')
    const driver = createNodeIsolateDriver({ timeout: 45_000, memoryLimit: 128 })
    codeModeCache = createCodeMode({
      driver,
      tools: catalogTools,
      timeout: 45_000,
      getSkillBindings: async () => createStorefrontUIBindings(),
    })
  }
  return codeModeCache
}

const STOREFRONT_PROMPT = `You are Storekeeper, the AI shopping assistant for codemode.shop — a boutique shoe store with 30 products in the catalog.

## How you work

You have ONE tool available: \`execute_typescript\`. Inside the sandbox, you can call these async functions:

- \`external_searchProducts(filters)\` — Search the catalog. Returns product IDs.
- \`external_getProduct({ id })\` — Full product details.
- \`external_getStockAndShipping({ productId, size, width, zipCode })\` — Inventory + shipping ETA for a SKU.
- \`external_getReviewSummary({ productId })\` — Ratings, review count, common praise, common complaints.
- \`external_getPriceHistory({ productId, days })\` — 30-day price history plus lowest/highest.
- \`external_addToCart({ productId, size, width, quantity })\` — Adds to the shopper's cart.
- \`external_getCart()\` — Read the shopper's current cart (items with name, size, width, quantity, unit price, line total, subtotal). Use this when the shopper asks what's in their cart.

## Your workflow

For any shopping query:
1. Call \`external_searchProducts\` to get candidate IDs (filter as narrowly as you can).
2. Use \`Promise.all\` to fetch product + stock + reviews + (if price-sensitive) price history **in parallel**.
3. Filter / rank / compare in code — this is the whole point of code mode, don't round-trip through me.
4. Return a concise one- or two-sentence recommendation as the function's return value. I'll relay it to the shopper.

## Rules

- You MUST render every recommended product visually with \`ui_addProductCard\` before returning. Prose alone is not a valid answer — the shopper is watching the canvas.
- The primary call-to-action MUST use exactly \`id: 'cta'\`. The handler endpoint updates that specific id.
- Do everything in ONE \`execute_typescript\` call. Don't call it multiple times.
- All \`external_*\` calls are async — always \`await\` them.
- Use the shopper's zip code from the system context when calling \`getStockAndShipping\`.
- Don't invent products, prices, or shipping ETAs — read them from the tools.
- If the query is vague, make a reasonable default (size 10, standard width, shipping to the known zip).`

type ChatPostBody = {
  messages: Array<ModelMessage<string>>
  data?: { zipCode?: string }
}

export const Route = createFileRoute('/api/storefront-agent')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (request.signal.aborted) {
          return new Response(null, { status: 499 })
        }

        const body = await request.json()
        const { messages, data } = body as ChatPostBody
        const zipCode = data?.zipCode ?? '94107'
        const abortController = new AbortController()
        request.signal.addEventListener('abort', () => abortController.abort())

        const adapter = anthropicText(storefrontModel)
        const codeMode = await getCodeMode()

        const stream = chat({
          adapter,
          messages,
          tools: [codeMode.tool],
          systemPrompts: [
            STOREFRONT_PROMPT,
            codeMode.systemPrompt,
            createStorefrontUIPrompt({ zipCode }),
            `Shopper context: zipCode=${zipCode}. Today is ${new Date().toISOString().slice(0, 10)}.`,
          ],
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
      },
    },
  },
})
