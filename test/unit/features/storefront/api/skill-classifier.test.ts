// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { classifySkillCode } from '#/features/storefront/api/skill-classifier'

describe('classifySkillCode', () => {
  it.each([
    'await external_searchProducts({ category: "Running" })',
    'const p = await external_getProduct({ id: "sku-1" })',
    'await external_getStockAndShipping({ productId, size: "10", width: "standard", zipCode: "94107" })',
    'await external_getReviewSummary({ productId })',
    'await external_getPriceHistory({ productId, days: 30 })',
    'await ui_addProductCard({ id: "p1", productId: "sku-1", name: "x", brand: "y", price: 1, imageUrl: "" })',
    'await ui_addComparisonTable({ id: "cmp", columnHeaders: [], rows: [] })',
    'await ui_update({ id: "p1", props: {} })',
    'await ui_remove({ id: "p1" })',
    // Embedded literal strings that look like skills must not trigger
    'const brand = "Pegasus 41"; const zip = "94107";',
  ])('allows %#', (code) => {
    expect(classifySkillCode(code)).toEqual({ kind: 'read-only' })
  })

  it.each([
    ['external_addToCart', 'await external_addToCart({})'],
    ['external_removeFromCart', 'await external_removeFromCart({})'],
    ['external_setCartQuantity', 'await external_setCartQuantity({})'],
    ['external_clearCart', 'await external_clearCart()'],
    ['external_placeOrder', 'await external_placeOrder({})'],
    ['external_getOrder', 'await external_getOrder({ id })'],
  ])('rejects mutating tool %s', (token, code) => {
    const result = classifySkillCode(code)
    expect(result.kind).toBe('mutating')
    if (result.kind === 'mutating') {
      expect(result.disallowed).toContain(token)
    }
  })

  it.each([
    ['eval(', 'eval("external_clearCart()")'],
    ['Function(', 'new Function("return 1")()'],
    ['import(', 'await import("./bad")'],
    ['dynamic external_ dispatch', '(globalThis as any)["external_" + name]()'],
    ['dynamic external_ dispatch', '(globalThis)[`external_${name}`]()'],
  ])('rejects dynamic dispatch %s', (token, code) => {
    const result = classifySkillCode(code)
    expect(result.kind).toBe('mutating')
    if (result.kind === 'mutating') {
      expect(result.disallowed).toContain(token)
    }
  })

  it('returns all disallowed tokens, not just the first', () => {
    const result = classifySkillCode(
      'await external_addToCart({}); eval("x"); await external_clearCart()',
    )
    expect(result.kind).toBe('mutating')
    if (result.kind === 'mutating') {
      expect(result.disallowed).toEqual(
        expect.arrayContaining(['external_addToCart', 'external_clearCart', 'eval(']),
      )
    }
  })
})
