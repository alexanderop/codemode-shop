import { describe, expect, it } from 'vitest'
import { renderPriceSparkline } from './price-sparkline.page'

describe('PriceSparkline', () => {
  it('renders nothing when fewer than 2 points are provided', async () => {
    const view = await renderPriceSparkline({
      points: [{ date: '2026-04-26', price: 100 }],
    })
    expect(view.path()).toBeNull()
  })

  it('uses the down-trend stroke when current price is below the first point', async () => {
    const view = await renderPriceSparkline({
      points: [
        { date: '2026-04-01', price: 120 },
        { date: '2026-04-26', price: 100 },
      ],
      currentPrice: 100,
    })
    const path = view.path()
    expect(path?.getAttribute('class')).toContain('stroke-emerald-500')
  })

  it('uses the up-trend stroke when current price is above the first point', async () => {
    const view = await renderPriceSparkline({
      points: [
        { date: '2026-04-01', price: 90 },
        { date: '2026-04-26', price: 120 },
      ],
      currentPrice: 120,
    })
    expect(view.path()?.getAttribute('class')).toContain('stroke-red-500')
  })

  it('uses the flat-trend stroke when current price equals the first point', async () => {
    const view = await renderPriceSparkline({
      points: [
        { date: '2026-04-01', price: 100 },
        { date: '2026-04-26', price: 100 },
      ],
      currentPrice: 100,
    })
    expect(view.path()?.getAttribute('class')).toContain('stroke-muted-foreground')
  })

  it('renders the low/high price summary', async () => {
    const view = await renderPriceSparkline({ lowestPrice: 100, highestPrice: 120 })
    await expect.element(view.screen.getByText(/low \$100 · high \$120/)).toBeVisible()
  })
})
