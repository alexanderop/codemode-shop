import { PRODUCT_BY_ID, type Width } from '#/lib/catalog'
import { cartLineKey } from '#/lib/cart-key'

export type CartMutation =
  | { action: 'add'; productId: string; size: string; width?: Width; quantity?: number }
  | { action: 'set'; productId: string; size: string; width?: Width; quantity: number }
  | { action: 'remove'; productId: string; size: string; width?: Width }
  | { action: 'clear' }

export interface DetailedCartLine {
  productId: string
  name: string
  brand: string
  imageUrl: string
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

export const EMPTY_CART: DetailedCart = { items: [], itemCount: 0, subtotal: 0 }

function recompute(items: Array<DetailedCartLine>): DetailedCart {
  return {
    items,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    subtotal: items.reduce((n, i) => n + i.lineTotal, 0),
  }
}

export function buildDetailedLine(
  productId: string,
  size: string,
  width: Width,
  quantity: number,
): DetailedCartLine {
  const p = PRODUCT_BY_ID.get(productId)
  const unitPrice = p?.price ?? 0
  return {
    productId,
    name: p?.name ?? 'Unknown',
    brand: p?.brand ?? 'Unknown',
    imageUrl: p?.imageUrl ?? '',
    size,
    width,
    quantity,
    unitPrice,
    lineTotal: unitPrice * quantity,
  }
}

export function applyMutationToCart(cart: DetailedCart, mutation: CartMutation): DetailedCart {
  if (mutation.action === 'clear') return EMPTY_CART

  const width = mutation.width ?? 'standard'
  const targetKey = cartLineKey(mutation.productId, mutation.size, width)
  const existingIdx = cart.items.findIndex(
    (l) => cartLineKey(l.productId, l.size, l.width) === targetKey,
  )

  if (mutation.action === 'add') {
    const addQty = mutation.quantity ?? 1
    if (existingIdx >= 0) {
      const existing = cart.items[existingIdx]!
      const nextQty = existing.quantity + addQty
      const next = [...cart.items]
      next[existingIdx] = {
        ...existing,
        quantity: nextQty,
        lineTotal: existing.unitPrice * nextQty,
      }
      return recompute(next)
    }
    return recompute([
      ...cart.items,
      buildDetailedLine(mutation.productId, mutation.size, width, addQty),
    ])
  }

  if (mutation.action === 'set') {
    if (mutation.quantity <= 0) {
      if (existingIdx < 0) return cart
      return recompute(cart.items.filter((_, i) => i !== existingIdx))
    }
    if (existingIdx >= 0) {
      const existing = cart.items[existingIdx]!
      const next = [...cart.items]
      next[existingIdx] = {
        ...existing,
        quantity: mutation.quantity,
        lineTotal: existing.unitPrice * mutation.quantity,
      }
      return recompute(next)
    }
    return recompute([
      ...cart.items,
      buildDetailedLine(mutation.productId, mutation.size, width, mutation.quantity),
    ])
  }

  if (existingIdx < 0) return cart
  return recompute(cart.items.filter((_, i) => i !== existingIdx))
}
