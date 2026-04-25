import { createFileRoute } from '@tanstack/react-router'
import { chat, maxIterations, toServerSentEventsStream } from '@tanstack/ai'
import { createCodeMode } from '@tanstack/ai-code-mode'
import { anthropicText } from '@tanstack/ai-anthropic'
import { catalogTools } from '#/lib/tools/catalog-tools'
import { storefrontModel } from '#/lib/model'
import { createStorefrontUIBindings } from '#/lib/storefront/ui-bindings'
import { createStorefrontUIPrompt } from '#/lib/storefront/ui-prompt'
import { createHandlerExtraBindings } from '#/lib/storefront/handler-bindings'

let codeModeCache: ReturnType<typeof createCodeMode> | null = null

async function getCodeMode() {
  if (!codeModeCache) {
    const { createNodeIsolateDriver } = await import('@tanstack/ai-isolate-node')
    const driver = createNodeIsolateDriver({ timeout: 20_000, memoryLimit: 128 })
    codeModeCache = createCodeMode({
      driver,
      tools: catalogTools,
      timeout: 20_000,
      getSkillBindings: async () => ({
        ...createStorefrontUIBindings(),
        ...createHandlerExtraBindings(),
      }),
    })
  }
  return codeModeCache
}

const HANDLER_PROMPT = `You are the Storekeeper handler — a short-lived agent that executes a single click from the shopper.

You'll receive a handler id and its payload. Your job:
1. Re-verify stock with \`external_getStockAndShipping\` (prices/inventory may have shifted).
2. If in stock: call \`external_addToCart\`, then \`cart_update({ itemCount })\` to refresh the header badge.
3. Use \`ui_update\` to update the CTA button in place — set \`label: 'Added to cart'\` and \`variant: 'secondary'\` on success, or to 'Out of stock' if not.
4. Return a one-sentence confirmation for the shopper.

Do everything in ONE execute_typescript call. The CTA's id is \`cta\` (use that as the \`ui_update\` target). The main agent is required to use \`id: 'cta'\` for the primary CTA, so target that id with \`ui_update\`. The ui_* vocabulary is the same as the main agent.`

export const Route = createFileRoute('/api/storefront-handler')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (request.signal.aborted) {
          return new Response(null, { status: 499 })
        }

        const { handlerId, payload, zipCode } = (await request.json()) as {
          handlerId: 'addToCart'
          payload: {
            productId: string
            size: string
            width?: 'narrow' | 'standard' | 'wide'
            quantity?: number
          }
          zipCode?: string
        }

        const adapter = anthropicText(storefrontModel)
        const zip = zipCode ?? '94107'
        const abortController = new AbortController()
        request.signal.addEventListener('abort', () => abortController.abort())
        const codeMode = await getCodeMode()

        const userMessage = [
          `Handler: ${handlerId}`,
          `Payload: ${JSON.stringify(payload)}`,
          `Shopper zip: ${zip}`,
        ].join('\n')

        const stream = chat({
          adapter,
          messages: [{ role: 'user', content: userMessage }],
          tools: [codeMode.tool],
          systemPrompts: [
            HANDLER_PROMPT,
            codeMode.systemPrompt,
            createStorefrontUIPrompt({ zipCode: zip }),
          ],
          agentLoopStrategy: maxIterations(2),
          maxTokens: 1024,
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
