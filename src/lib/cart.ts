import { sessionContext, type SessionId } from '#/lib/session-context'
import { PRODUCT_BY_ID, type Width } from '#/lib/catalog'
import { cartLineKey } from '#/lib/cart-key'

export { cartLineKey }

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

export function getCart() {
  return Array.from(getCartForSession().values())
}

export interface DetailedCartLine {
  productId: string
  name: string
  brand: string
  size: string
  width: Width
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface DetailedCart {
  items: Array<DetailedCartLine>
  itemCount: number
  subtotal: number
}

export function getCartDetailed(): DetailedCart {
  const cart = getCartForSession()
  const items: Array<DetailedCartLine> = Array.from(cart.values()).map((line) => {
    const p = PRODUCT_BY_ID.get(line.productId)
    const unitPrice = p?.price ?? 0
    return {
      productId: line.productId,
      name: p?.name ?? 'Unknown',
      brand: p?.brand ?? 'Unknown',
      size: line.size,
      width: line.width,
      quantity: line.quantity,
      unitPrice,
      lineTotal: unitPrice * line.quantity,
    }
  })
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
