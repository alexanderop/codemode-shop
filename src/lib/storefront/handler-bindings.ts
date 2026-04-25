import { z } from 'zod'
import { convertSchemaToJsonSchema } from '@tanstack/ai'
import type { ToolBinding, ToolExecutionContext } from '@tanstack/ai-code-mode'

export function createHandlerExtraBindings(): Record<string, ToolBinding> {
  const schema = z.object({
    itemCount: z.number().describe('New total item count in the cart'),
  })
  return {
    cart_update: {
      name: 'cart_update',
      description:
        'Notify the client that the cart total changed. Call this after a successful external_addToCart.',
      inputSchema: convertSchemaToJsonSchema(schema) || {
        type: 'object',
        properties: {},
      },
      outputSchema: convertSchemaToJsonSchema(z.object({ ok: z.boolean() })),
      execute: async (args: unknown, context?: ToolExecutionContext) => {
        const parsed = schema.parse(args)
        context?.emitCustomEvent?.('cart:update', parsed)
        return { ok: true }
      },
    },
  }
}
