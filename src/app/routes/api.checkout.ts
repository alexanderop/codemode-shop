import { createFileRoute } from '@tanstack/react-router'
import { getCartDetailed } from '#/lib/cart'
import { placeOrder, type ShippingAddress } from '#/lib/orders'
import { processFakePayment } from '#/lib/payment'
import { withSession } from '#/lib/session'

interface CheckoutBody {
  shippingAddress: ShippingAddress
  payment: {
    cardNumber: string
    expiry: string
    cvc: string
  }
}

export const Route = createFileRoute('/api/checkout')({
  server: {
    handlers: {
      POST: ({ request }) =>
        withSession(request, async () => {
          const body = (await request.json()) as CheckoutBody
          const cart = getCartDetailed()
          if (cart.items.length === 0) {
            return new Response(JSON.stringify({ error: 'Cart is empty' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          }
          try {
            const result = await processFakePayment({
              ...body.payment,
              amount: cart.subtotal,
            })
            const order = placeOrder({
              shippingAddress: body.shippingAddress,
              paymentLast4: result.last4,
            })
            return new Response(JSON.stringify({ orderId: order.id }), {
              headers: { 'Content-Type': 'application/json' },
            })
          } catch (err) {
            return new Response(
              JSON.stringify({ error: err instanceof Error ? err.message : 'Checkout failed' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } },
            )
          }
        }),
    },
  },
})
