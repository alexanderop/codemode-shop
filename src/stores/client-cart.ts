import { useSyncExternalStore } from 'react'
import type { Width } from '#/lib/catalog'
import type { DetailedCart } from '#/lib/cart'

export type CartMutation =
  | { action: 'add'; productId: string; size: string; width?: Width; quantity?: number }
  | { action: 'set'; productId: string; size: string; width?: Width; quantity: number }
  | { action: 'remove'; productId: string; size: string; width?: Width }
  | { action: 'clear' }

const EMPTY: DetailedCart = { items: [], itemCount: 0, subtotal: 0 }

let state: DetailedCart = EMPTY
const listeners = new Set<(c: DetailedCart) => void>()

function emit() {
  for (const l of listeners) l(state)
}

function cartEqual(a: DetailedCart, b: DetailedCart): boolean {
  if (a === b) return true
  if (a.itemCount !== b.itemCount || a.subtotal !== b.subtotal) return false
  if (a.items.length !== b.items.length) return false
  for (let i = 0; i < a.items.length; i++) {
    const x = a.items[i]!
    const y = b.items[i]!
    if (
      x.productId !== y.productId ||
      x.size !== y.size ||
      x.width !== y.width ||
      x.quantity !== y.quantity ||
      x.lineTotal !== y.lineTotal
    ) {
      return false
    }
  }
  return true
}

export const clientCart = {
  get: () => state,
  set: (next: DetailedCart) => {
    if (cartEqual(state, next)) return
    state = next
    emit()
  },
  refresh: async () => {
    try {
      const res = await fetch('/api/cart')
      if (!res.ok) return
      const next = (await res.json()) as DetailedCart
      clientCart.set(next)
    } catch {
      // best-effort refresh
    }
  },
  mutate: async (body: CartMutation): Promise<DetailedCart> => {
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Cart update failed: ${res.status}`)
    const next = (await res.json()) as DetailedCart
    clientCart.set(next)
    return next
  },
  subscribe: (l: (c: DetailedCart) => void) => {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
}

export function useCart(): DetailedCart {
  return useSyncExternalStore(
    clientCart.subscribe,
    () => state,
    () => EMPTY,
  )
}

export function useCartCount(): number {
  return useCart().itemCount
}
