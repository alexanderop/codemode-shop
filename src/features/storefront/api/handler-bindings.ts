import { z } from 'zod'
import type { ToolBinding } from '@tanstack/ai-code-mode'
import { getCartDetailed } from '#/lib/cart'
import { sessionContext, type SessionId } from '#/lib/session-context'
import { makeBinding } from '#/features/storefront/api/binding'

export function createHandlerExtraBindings({
  sessionId,
}: {
  sessionId: SessionId
}): Record<string, ToolBinding> {
  return {
    cart_update: makeBinding(
      'cart_update',
      'Notify the client that the cart changed. Reads the current cart on the server and pushes the full detailed cart to the browser. Call this after any external_addToCart / removeFromCart / setCartQuantity / clearCart so the header badge and cart page update.',
      z.object({}),
      async (_parsed, context) => {
        const cart = sessionContext.run({ sessionId }, () => getCartDetailed())
        context?.emitCustomEvent?.('cart:update', cart)
        return { ok: true }
      },
    ),
  }
}
