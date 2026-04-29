import { describe, expect, it } from 'vitest'
import { PRODUCTS, buildPriceHistory, shippingEtaDays } from '#/lib/catalog'
import { applyMutationToCart, EMPTY_CART } from '#/lib/cart-mutation'
import { getCart, mutateCart } from '#/lib/cart'
import { withTestSession } from '#/lib/test-utils/with-session'

describe('catalog data', () => {
  it('PRODUCTS is non-empty and ids are unique', () => {
    expect(PRODUCTS.length).toBeGreaterThan(0)
    const ids = new Set(PRODUCTS.map((p) => p.id))
    expect(ids.size).toBe(PRODUCTS.length)
  })

  it('every product has a price > 0 and at least one size', () => {
    for (const p of PRODUCTS) {
      expect(p.price).toBeGreaterThan(0)
      expect(p.sizes.length).toBeGreaterThan(0)
    }
  })
})

describe('shippingEtaDays', () => {
  it('returns 5 for a non-numeric zip', () => {
    expect(shippingEtaDays('abcde')).toBe(5)
  })

  it('returns 5 for east-coast (0-2) zips', () => {
    expect(shippingEtaDays('02134')).toBe(5)
  })

  it('returns 2 for inland (6-7) zips', () => {
    expect(shippingEtaDays('60601')).toBe(2)
    expect(shippingEtaDays('70112')).toBe(2)
  })

  it('returns 4 for west-coast (8-9) zips', () => {
    expect(shippingEtaDays('94107')).toBe(4)
  })
})

describe('buildPriceHistory', () => {
  it('returns the requested length', () => {
    const points = buildPriceHistory(PRODUCTS[0]!.id, 7)
    expect(points).toHaveLength(7)
    expect(new Date(points[0]!.date).toString()).not.toBe('Invalid Date')
    expect(typeof points[0]!.price).toBe('number')
  })
})

describe('applyMutationToCart', () => {
  it('aggregates same SKU additions, splits distinct widths', () => {
    const cart = [
      { action: 'add', productId: 'p1', size: '10', width: 'standard', quantity: 1 },
      { action: 'add', productId: 'p1', size: '10', width: 'standard', quantity: 2 },
      { action: 'add', productId: 'p1', size: '10', width: 'wide', quantity: 1 },
    ].reduce((acc, m) => applyMutationToCart(acc, m as never), EMPTY_CART)
    expect(cart.itemCount).toBe(4)
    expect(cart.items).toHaveLength(2)
  })

  it('remove drops the line entirely', () => {
    const added = applyMutationToCart(EMPTY_CART, {
      action: 'add',
      productId: 'shoe-01',
      size: '10',
      width: 'standard',
      quantity: 3,
    })
    expect(added.itemCount).toBe(3)
    const removed = applyMutationToCart(added, {
      action: 'remove',
      productId: 'shoe-01',
      size: '10',
      width: 'standard',
    })
    expect(removed.itemCount).toBe(0)
    expect(removed.items).toHaveLength(0)
  })

  it('set replaces the qty', () => {
    const added = applyMutationToCart(EMPTY_CART, {
      action: 'add',
      productId: 'shoe-01',
      size: '10',
      width: 'standard',
      quantity: 1,
    })
    const set = applyMutationToCart(added, {
      action: 'set',
      productId: 'shoe-01',
      size: '10',
      width: 'standard',
      quantity: 5,
    })
    expect(set.itemCount).toBe(5)
  })

  it('set to 0 removes the line', () => {
    const added = applyMutationToCart(EMPTY_CART, {
      action: 'add',
      productId: 'shoe-01',
      size: '10',
      width: 'standard',
      quantity: 1,
    })
    const zeroed = applyMutationToCart(added, {
      action: 'set',
      productId: 'shoe-01',
      size: '10',
      width: 'standard',
      quantity: 0,
    })
    expect(zeroed.itemCount).toBe(0)
    expect(zeroed.items).toHaveLength(0)
  })

  it('clear empties everything', () => {
    const built = [
      { action: 'add', productId: 'shoe-01', size: '10', width: 'standard', quantity: 1 },
      { action: 'add', productId: 'shoe-02', size: '11', width: 'standard', quantity: 2 },
    ].reduce((acc, m) => applyMutationToCart(acc, m as never), EMPTY_CART)
    const cleared = applyMutationToCart(built, { action: 'clear' })
    expect(cleared.itemCount).toBe(0)
    expect(cleared.items).toHaveLength(0)
  })

  it('enriches added lines with name + line totals', () => {
    const cart = applyMutationToCart(EMPTY_CART, {
      action: 'add',
      productId: 'shoe-01',
      size: '10',
      width: 'standard',
      quantity: 2,
    })
    expect(cart.items).toHaveLength(1)
    expect(cart.items[0]!.name).toBe('Air Max 90')
    expect(cart.items[0]!.lineTotal).toBe(cart.items[0]!.unitPrice * 2)
    expect(cart.subtotal).toBe(cart.items[0]!.lineTotal)
    expect(cart.itemCount).toBe(2)
  })
})

describe('mutateCart (server bridge)', () => {
  it('round-trips mutations through the session-scoped store', () =>
    withTestSession(() => {
      expect(getCart().itemCount).toBe(0)
      const next = mutateCart({
        action: 'add',
        productId: 'shoe-01',
        size: '10',
        width: 'standard',
        quantity: 2,
      })
      expect(next.itemCount).toBe(2)
      expect(getCart().itemCount).toBe(2)
    }))
})
