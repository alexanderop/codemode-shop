import { describe, expect, it } from 'vitest'
import { renderStockPill } from './stock-pill.page'

describe('StockPill', () => {
  it('shows the out-of-stock badge when inStock is false', async () => {
    const view = await renderStockPill({ inStock: false, quantity: undefined })
    await expect.element(view.screen.getByText(/out of stock/i)).toBeVisible()
  })

  it('shows the in-stock count when quantity is provided', async () => {
    const view = await renderStockPill({ inStock: true, quantity: 7 })
    await expect.element(view.screen.getByText('7 in stock')).toBeVisible()
  })

  it('falls back to "In stock" when quantity is omitted', async () => {
    const view = await renderStockPill({ inStock: true, quantity: undefined })
    await expect.element(view.screen.getByText('In stock')).toBeVisible()
  })

  it('renders a free-shipping arrival badge', async () => {
    const view = await renderStockPill({
      inStock: true,
      arrivesBy: '2026-05-01',
      shippingCost: 0,
    })
    await expect.element(view.screen.getByText(/free/i)).toBeVisible()
  })

  it('renders a paid-shipping arrival badge with the dollar amount', async () => {
    const view = await renderStockPill({
      inStock: true,
      arrivesBy: '2026-05-01',
      shippingCost: 9,
    })
    await expect.element(view.screen.getByText(/\$9/)).toBeVisible()
  })

  it('omits the shipping cost suffix when shippingCost is null', async () => {
    const view = await renderStockPill({
      inStock: true,
      arrivesBy: '2026-05-01',
      shippingCost: undefined,
    })
    await expect.element(view.screen.getByText(/free/i)).not.toBeInTheDocument()
  })
})
