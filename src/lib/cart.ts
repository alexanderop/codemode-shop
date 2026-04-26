import { sessionContext, type SessionId } from '#/lib/session-context'
import type { Width } from '#/lib/catalog'
import { cartLineKey } from '#/lib/cart-key'
import { buildDetailedLine, type DetailedCart } from '#/lib/cart-mutation'

export { cartLineKey }
export type { DetailedCart, DetailedCartLine, CartMutation } from '#/lib/cart-mutation'

type CartLine = { productId: string; size: string; width: Width; quantity: number }

const carts = new Map<SessionId, Map<string, CartLine>>()

function getCartForSession(): Map<string, CartLine> {
  const { sessionId } = sessionContext.get()
  let cart = carts.get(sessionId)
  if (!cart) {
    cart = new Map()
    carts.set(sessionId, cart)
  }
  return cart
}

export function addToCart(args: {
  productId: string
  size: string
  width: Width
  quantity: number
}) {
  const cart = getCartForSession()
  const key = cartLineKey(args.productId, args.size, args.width)
  const existing = cart.get(key)
  if (existing) {
    existing.quantity += args.quantity
  } else {
    cart.set(key, { ...args })
  }
  return { itemCount: totalCartCount(), lineCount: cart.size }
}

export function removeFromCart(args: { productId: string; size: string; width: Width }) {
  const cart = getCartForSession()
  cart.delete(cartLineKey(args.productId, args.size, args.width))
  return { itemCount: totalCartCount(), lineCount: cart.size }
}

export function setCartLineQuantity(args: {
  productId: string
  size: string
  width: Width
  quantity: number
}) {
  const cart = getCartForSession()
  const key = cartLineKey(args.productId, args.size, args.width)
  if (args.quantity <= 0) {
    cart.delete(key)
  } else {
    const existing = cart.get(key)
    if (existing) {
      existing.quantity = args.quantity
    } else {
      cart.set(key, { ...args })
    }
  }
  return { itemCount: totalCartCount(), lineCount: cart.size }
}

export function clearCart() {
  getCartForSession().clear()
  return { itemCount: 0, lineCount: 0 }
}

export function getCartDetailed(): DetailedCart {
  const items = Array.from(getCartForSession().values()).map((line) =>
    buildDetailedLine(line.productId, line.size, line.width, line.quantity),
  )
  return {
    items,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    subtotal: items.reduce((n, i) => n + i.lineTotal, 0),
  }
}

export function totalCartCount() {
  let n = 0
  for (const line of getCartForSession().values()) n += line.quantity
  return n
}
