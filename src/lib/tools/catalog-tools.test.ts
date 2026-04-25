import { describe, expect, it } from 'vitest'
import { getProduct, getReviewSummary, getStockAndShipping, searchProducts } from './catalog-tools'
import { PRODUCTS } from '#/lib/catalog'

const sampleId = PRODUCTS[0]!.id

describe('searchProducts', () => {
  it('returns all products (up to limit) with no filters', async () => {
    const out = await searchProducts.execute!({ limit: 10 })
    expect(out.productIds.length).toBeGreaterThan(0)
    expect(out.totalMatches).toBeGreaterThanOrEqual(out.productIds.length)
  })

  it('filters by maxPrice', async () => {
    const out = await searchProducts.execute!({ limit: 100, maxPrice: 80 })
    for (const id of out.productIds) {
      const p = PRODUCTS.find((x) => x.id === id)!
      expect(p.price).toBeLessThanOrEqual(80)
    }
  })

  it('returns empty when query matches nothing', async () => {
    const out = await searchProducts.execute!({
      limit: 10,
      query: 'zzz-no-match-zzz',
    })
    expect(out.productIds).toEqual([])
    expect(out.totalMatches).toBe(0)
  })
})

describe('getProduct', () => {
  it('returns the product by id', async () => {
    const out = await getProduct.execute!({ id: sampleId })
    expect(out.id).toBe(sampleId)
  })

  it('throws on unknown id', () => {
    expect(() => getProduct.execute!({ id: 'no-such-id' })).toThrow()
  })
})

describe('getStockAndShipping', () => {
  it('returns ETA and stock info for a known sku', async () => {
    const p = PRODUCTS[0]!
    const out = await getStockAndShipping.execute!({
      productId: p.id,
      size: p.sizes[0]!,
      width: 'standard',
      zipCode: '94107',
    })
    expect(typeof out.inStock).toBe('boolean')
    expect(typeof out.arrivesBy).toBe('string')
  })
})

describe('getReviewSummary', () => {
  it('returns a review summary for a known product', async () => {
    const out = await getReviewSummary.execute!({ productId: sampleId })
    expect(typeof out.averageRating).toBe('number')
    expect(Array.isArray(out.commonPraise)).toBe(true)
  })
})
