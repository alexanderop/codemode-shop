import { render } from 'vitest-browser-react'
import { StockPill } from '#/features/storefront/components/canvas/stock-pill'
import type { StockPillProps } from '#/features/storefront/types/ui-types'

export const stockPillProps = (overrides?: Partial<StockPillProps>): StockPillProps => ({
  inStock: true,
  quantity: 12,
  ...overrides,
})

export async function renderStockPill(overrides?: Partial<StockPillProps>) {
  const props = stockPillProps(overrides)
  const screen = await render(<StockPill {...props} />)
  return { screen, props }
}
