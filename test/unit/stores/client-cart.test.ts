import { afterEach, describe, expect, it, vi } from 'vitest'
import { clientCart } from '#/stores/client-cart'
import type { DetailedCart, DetailedCartLine } from '#/lib/cart'

const EMPTY: DetailedCart = { items: [], itemCount: 0, subtotal: 0 }

function cartOf(itemCount: number, subtotal: number): DetailedCart {
  return { items: [], itemCount, subtotal }
}

function lineOf(overrides: Partial<DetailedCartLine> = {}): DetailedCartLine {
  return {
    productId: 'p1',
    name: 'Runner X',
    brand: 'Acme',
    imageUrl: '/x.png',
    size: '10',
    width: 'standard',
    quantity: 1,
    unitPrice: 100,
    lineTotal: 100,
    ...overrides,
  }
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

afterEach(() => {
  clientCart.set(EMPTY)
  vi.unstubAllGlobals()
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

  it('set is a no-op when the cart is structurally equal', () => {
    const a: DetailedCart = { items: [lineOf()], itemCount: 1, subtotal: 100 }
    const b: DetailedCart = { items: [lineOf()], itemCount: 1, subtotal: 100 }
    clientCart.set(a)
    const seen: Array<DetailedCart> = []
    const unsub = clientCart.subscribe((c) => seen.push(c))
    clientCart.set(b)
    unsub()
    expect(seen).toEqual([])
    expect(clientCart.get()).toBe(a)
  })

  it('set notifies when item counts differ', () => {
    clientCart.set({ items: [lineOf({ quantity: 1 })], itemCount: 1, subtotal: 100 })
    const seen: Array<number> = []
    const unsub = clientCart.subscribe((c) => seen.push(c.itemCount))
    clientCart.set({
      items: [lineOf({ quantity: 2, lineTotal: 200 })],
      itemCount: 2,
      subtotal: 200,
    })
    unsub()
    expect(seen).toEqual([2])
  })

  it('set notifies when a line field changes (different size)', () => {
    clientCart.set({ items: [lineOf({ size: '10' })], itemCount: 1, subtotal: 100 })
    let notified = false
    const unsub = clientCart.subscribe(() => {
      notified = true
    })
    clientCart.set({ items: [lineOf({ size: '11' })], itemCount: 1, subtotal: 100 })
    unsub()
    expect(notified).toBe(true)
  })

  it('refresh applies the server response on 200', async () => {
    const next = cartOf(4, 240)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(next)))
    await clientCart.refresh()
    expect(clientCart.get()).toEqual(next)
  })

  it('refresh leaves state unchanged on a non-ok response', async () => {
    clientCart.set(cartOf(2, 100))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 500 })))
    await clientCart.refresh()
    expect(clientCart.get()).toEqual(cartOf(2, 100))
  })

  it('refresh swallows network errors', async () => {
    clientCart.set(cartOf(2, 100))
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    await expect(clientCart.refresh()).resolves.toBeUndefined()
    expect(clientCart.get()).toEqual(cartOf(2, 100))
  })

  it('mutate POSTs the body and applies the result', async () => {
    const next = cartOf(1, 100)
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(next))
    vi.stubGlobal('fetch', fetchMock)

    const result = await clientCart.mutate({
      action: 'add',
      productId: 'p1',
      size: '10',
      width: 'standard',
      quantity: 1,
    })

    expect(result).toEqual(next)
    expect(clientCart.get()).toEqual(next)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/cart',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const sentBody = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)
    expect(sentBody).toEqual({
      action: 'add',
      productId: 'p1',
      size: '10',
      width: 'standard',
      quantity: 1,
    })
  })

  it('mutate throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 422 })))
    await expect(clientCart.mutate({ action: 'clear' })).rejects.toThrow(/Cart update failed: 422/)
  })
})
