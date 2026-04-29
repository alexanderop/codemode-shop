import { sessionContext, type SessionId } from '#/lib/session-context'
import {
  applyMutationToCart,
  EMPTY_CART,
  type CartMutation,
  type DetailedCart,
} from '#/lib/cart-mutation'

export type { DetailedCart, DetailedCartLine, CartMutation } from '#/lib/cart-mutation'

const carts = new Map<SessionId, DetailedCart>()

export function getCart(): DetailedCart {
  const { sessionId } = sessionContext.get()
  return carts.get(sessionId) ?? EMPTY_CART
}

export function mutateCart(mutation: CartMutation): DetailedCart {
  const { sessionId } = sessionContext.get()
  const next = applyMutationToCart(carts.get(sessionId) ?? EMPTY_CART, mutation)
  carts.set(sessionId, next)
  return next
}
