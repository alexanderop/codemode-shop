import { describe, expect, it } from 'vitest'
import { createStorefrontUIBindings } from './ui-bindings'
import { mkContext } from '#/features/storefront/testing/mk-context'
import { createStorefrontUIPromptDeclarations, storefrontUIPrimitives } from './ui-registry'
import { storefrontUIRenderers } from '#/features/storefront/components/canvas/render-registry'
import type { ComponentType } from '#/features/storefront/types/ui-types'

const bindings = createStorefrontUIBindings()

describe('storefront UI bindings', () => {
  it('registry primitives all have a binding, prompt declaration, and renderer', () => {
    const promptDeclarations = createStorefrontUIPromptDeclarations()

    for (const primitive of storefrontUIPrimitives) {
      expect(bindings[primitive.functionName], primitive.functionName).toBeDefined()
      expect(promptDeclarations).toContain(`declare function ${primitive.functionName}`)
      expect(storefrontUIRenderers[primitive.type as ComponentType]).toBeDefined()
    }
  })

  it('ui_showLoading emits an add event with type loading', async () => {
    const { events, ctx } = mkContext()
    await bindings.ui_showLoading.execute({ id: 'l1', label: 'Searching…' }, ctx)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      name: 'storefront:ui',
      value: { op: 'add', type: 'loading', id: 'l1' },
    })
  })

  it('ui_addProductCard emits an add event with productCard type', async () => {
    const { events, ctx } = mkContext()
    await bindings.ui_addProductCard.execute(
      {
        id: 'p1',
        productId: 'sku-1',
        name: 'Runner X',
        brand: 'Acme',
        price: 129,
        imageUrl: 'https://x/y.png',
      },
      ctx,
    )
    expect(events).toEqual([
      {
        name: 'storefront:ui',
        value: expect.objectContaining({
          op: 'add',
          type: 'productCard',
          id: 'p1',
        }),
      },
    ])
  })

  it('ui_addStockPill emits an add event under a parentId', async () => {
    const { events, ctx } = mkContext()
    await bindings.ui_addStockPill.execute(
      { id: 's1', parentId: 'p1', inStock: true, quantity: 4 },
      ctx,
    )
    expect(events[0]?.value).toMatchObject({
      op: 'add',
      type: 'stockPill',
      id: 's1',
      parentId: 'p1',
    })
  })

  it('ui_addPriceSparkline emits an add event with price points', async () => {
    const { events, ctx } = mkContext()
    await bindings.ui_addPriceSparkline.execute(
      {
        id: 'sp1',
        parentId: 'p1',
        points: [{ date: '2026-04-01', price: 130 }],
        currentPrice: 130,
        lowestPrice: 110,
        highestPrice: 145,
      },
      ctx,
    )
    expect(events[0]?.value).toMatchObject({
      op: 'add',
      type: 'priceSparkline',
      id: 'sp1',
    })
  })

  it('ui_addReviewBar emits an add event', async () => {
    const { events, ctx } = mkContext()
    await bindings.ui_addReviewBar.execute(
      {
        id: 'r1',
        parentId: 'p1',
        rating: 4.5,
        reviewCount: 220,
        praise: ['comfortable'],
        complaints: ['runs small'],
      },
      ctx,
    )
    expect(events[0]?.value).toMatchObject({
      op: 'add',
      type: 'reviewBar',
      id: 'r1',
    })
  })

  it('ui_addComparisonTable emits an add event', async () => {
    const { events, ctx } = mkContext()
    await bindings.ui_addComparisonTable.execute(
      {
        id: 'cmp1',
        columnHeaders: ['A', 'B'],
        rows: [{ label: 'Price', values: ['$100', '$120'] }],
      },
      ctx,
    )
    expect(events[0]?.value).toMatchObject({
      op: 'add',
      type: 'comparisonTable',
      id: 'cmp1',
    })
  })

  it('ui_addCTA accepts the addToCart handler shape', async () => {
    const { events, ctx } = mkContext()
    await bindings.ui_addCTA.execute(
      {
        id: 'cta',
        label: 'Add to cart',
        handlerId: 'addToCart',
        payload: { productId: 'sku-1', size: '10' },
      },
      ctx,
    )
    expect(events).toHaveLength(1)
    const ev = events[0]?.value as { id: string; type: string }
    expect(ev.id).toBe('cta')
    expect(ev.type).toBe('ctaButton')
  })

  it('ui_update emits an op: update event with merged props', async () => {
    const { events, ctx } = mkContext()
    await bindings.ui_update?.execute({ id: 'p1', props: { highlight: true } }, ctx)
    expect(events[0]?.value).toMatchObject({ op: 'update', id: 'p1' })
  })

  it('ui_remove emits an op: remove event', async () => {
    const { events, ctx } = mkContext()
    await bindings.ui_remove?.execute({ id: 'p1' }, ctx)
    expect(events[0]?.value).toEqual({ op: 'remove', id: 'p1' })
  })

  it('rejects missing required fields via zod', async () => {
    const { ctx } = mkContext()
    await expect(bindings.ui_addProductCard.execute({ id: 'p1' }, ctx)).rejects.toThrow()
  })

  it('rejects ui_addCTA without payload', async () => {
    const { ctx } = mkContext()
    await expect(
      bindings.ui_addCTA.execute({ id: 'cta', label: 'Buy', handlerId: 'addToCart' }, ctx),
    ).rejects.toThrow()
  })
})
