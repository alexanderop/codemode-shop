import { afterEach, describe, expect, it } from 'vitest'
import { clientCart } from './client-cart'
import type { DetailedCart } from '#/lib/cart'

const EMPTY: DetailedCart = { items: [], itemCount: 0, subtotal: 0 }

function cartOf(itemCount: number, subtotal: number): DetailedCart {
  return { items: [], itemCount, subtotal }
}

afterEach(() => {
  clientCart.set(EMPTY)
})

describe('clientCart', () => {
  it('starts empty', () => {
    expect(clientCart.get()).toEqual(EMPTY)
  })

  it('set replaces the cart shape', () => {
    clientCart.set(cartOf(7, 410))
    expect(clientCart.get().itemCount).toBe(7)
    expect(clientCart.get().subtotal).toBe(410)
  })

  it('subscribe fires on every mutation and returns an unsubscribe', () => {
    const seen: Array<number> = []
    const unsub = clientCart.subscribe((c) => seen.push(c.itemCount))
    clientCart.set(cartOf(1, 50))
    clientCart.set(cartOf(3, 200))
    unsub()
    clientCart.set(cartOf(99, 9999))
    expect(seen).toEqual([1, 3])
  })
})
