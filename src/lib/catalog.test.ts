import { describe, expect, it } from 'vitest'
import { PRODUCTS, addToCart, buildPriceHistory, shippingEtaDays, totalCartCount } from './catalog'

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

describe('addToCart + totalCartCount', () => {
  it('aggregates same SKU additions, splits distinct widths', () => {
    const before = totalCartCount()
    addToCart({ productId: 'p1', size: '10', width: 'standard', quantity: 1 })
    addToCart({ productId: 'p1', size: '10', width: 'standard', quantity: 2 })
    addToCart({ productId: 'p1', size: '10', width: 'wide', quantity: 1 })
    const after = totalCartCount()
    expect(after - before).toBe(4)
  })
})
