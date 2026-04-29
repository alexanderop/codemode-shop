import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getCart } from '#/lib/cart'
import { placeOrder } from '#/lib/orders'
import { processFakePayment } from '#/lib/payment'
import { sessionMiddleware } from '#/lib/session-middleware'

const checkoutSchema = z.object({
  shippingAddress: z.object({
    fullName: z.string().min(1),
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    zipCode: z.string().min(1),
  }),
  payment: z.object({
    cardNumber: z.string().min(1),
    expiry: z.string().min(1),
    cvc: z.string().min(1),
  }),
})

export const checkout = createServerFn({ method: 'POST' })
  .middleware([sessionMiddleware])
  .inputValidator(checkoutSchema)
  .handler(async ({ data }): Promise<{ orderId: string }> => {
    const cart = getCart()
    if (cart.items.length === 0) {
      throw new Error('Cart is empty')
    }
    const result = await processFakePayment({
      ...data.payment,
      amount: cart.subtotal,
    })
    const order = placeOrder({
      shippingAddress: data.shippingAddress,
      paymentLast4: result.last4,
    })
    return { orderId: order.id }
  })
