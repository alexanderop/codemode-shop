import { afterEach, describe, expect, it } from 'vitest'
import { clientCart } from './client-cart'

afterEach(() => {
  clientCart.set(0)
})

describe('clientCart', () => {
  it('starts at zero', () => {
    expect(clientCart.get()).toBe(0)
  })

  it('set replaces the count', () => {
    clientCart.set(7)
    expect(clientCart.get()).toBe(7)
  })

  it('add increments by delta', () => {
    clientCart.set(2)
    clientCart.add(3)
    expect(clientCart.get()).toBe(5)
  })

  it('subscribe fires on every mutation and returns an unsubscribe', () => {
    const seen: Array<number> = []
    const unsub = clientCart.subscribe((n) => seen.push(n))
    clientCart.set(1)
    clientCart.add(2)
    unsub()
    clientCart.set(99)
    expect(seen).toEqual([1, 3])
  })
})
