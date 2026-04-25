import { createFileRoute } from '@tanstack/react-router'
import { chat, maxIterations, toServerSentEventsStream } from '@tanstack/ai'
import { anthropicText } from '@tanstack/ai-anthropic'
import { storefrontModel } from '#/config/model'
import { createStorefrontUIPrompt } from '#/features/storefront/api/ui-prompt'
import { createHandlerExtraBindings } from '#/features/storefront/api/handler-bindings'
import { buildStorefrontCodeMode } from '#/features/storefront/api/code-mode'
import { getStorefrontDriver } from '#/features/storefront/api/driver'
import { withSession } from '#/lib/session'
import { sessionContext } from '#/lib/session-context'
import type { HandlerRequest } from '#/features/storefront/api/run-handler'

const TIMEOUT_MS = 20_000

const HANDLER_PROMPT = `You are the Storekeeper handler — a short-lived agent that executes a single click from the shopper.

You'll receive a handler id and its payload. Your job:
1. Re-verify stock with \`external_getStockAndShipping\` (prices/inventory may have shifted).
2. If in stock: call \`external_addToCart\`, then \`cart_update({})\` to push the new cart to the browser.
3. Use \`ui_update\` to update the CTA button in place — set \`label: 'Added to cart'\` and \`variant: 'secondary'\` on success, or to 'Out of stock' if not.
4. Return a one-sentence confirmation for the shopper.

Do everything in ONE execute_typescript call. The CTA's id is \`cta\` (use that as the \`ui_update\` target). The main agent is required to use \`id: 'cta'\` for the primary CTA, so target that id with \`ui_update\`. The ui_* vocabulary is the same as the main agent.`

export const Route = createFileRoute('/api/storefront-handler')({
  server: {
    handlers: {
      POST: ({ request }) =>
        withSession(request, async () => {
          if (request.signal.aborted) {
            return new Response(null, { status: 499 })
          }

          const { sessionId } = sessionContext.get()
          const { handlerId, payload, zipCode } = (await request.json()) as HandlerRequest

          const adapter = anthropicText(storefrontModel)
          const zip = zipCode ?? '94107'
          const abortController = new AbortController()
          request.signal.addEventListener('abort', () => abortController.abort())
          const driver = await getStorefrontDriver({ timeout: TIMEOUT_MS, memoryLimit: 128 })
          const codeMode = buildStorefrontCodeMode({
            driver,
            sessionId,
            timeout: TIMEOUT_MS,
            extraBindings: createHandlerExtraBindings({ sessionId }),
          })

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
        }),
    },
  },
})
