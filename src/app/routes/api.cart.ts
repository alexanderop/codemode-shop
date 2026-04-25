import { createFileRoute } from '@tanstack/react-router'
import {
  addToCart,
  clearCart,
  getCartDetailed,
  removeFromCart,
  setCartLineQuantity,
} from '#/lib/cart'
import { withSession } from '#/lib/session'
import type { CartMutation } from '#/stores/client-cart'

function applyMutation(input: CartMutation) {
  if (input.action === 'clear') {
    clearCart()
    return
  }
  const width = input.width ?? 'standard'
  if (input.action === 'add') {
    addToCart({
      productId: input.productId,
      size: input.size,
      width,
      quantity: input.quantity ?? 1,
    })
    return
  }
  if (input.action === 'set') {
    setCartLineQuantity({
      productId: input.productId,
      size: input.size,
      width,
      quantity: input.quantity,
    })
    return
  }
  removeFromCart({ productId: input.productId, size: input.size, width })
}

export const Route = createFileRoute('/api/cart')({
  server: {
    handlers: {
      GET: ({ request }) =>
        withSession(
          request,
          () =>
            new Response(JSON.stringify(getCartDetailed()), {
              headers: { 'Content-Type': 'application/json' },
            }),
        ),
      POST: ({ request }) =>
        withSession(request, async () => {
          const body = (await request.json()) as CartMutation
          applyMutation(body)
          return new Response(JSON.stringify(getCartDetailed()), {
            headers: { 'Content-Type': 'application/json' },
          })
        }),
    },
  },
})
