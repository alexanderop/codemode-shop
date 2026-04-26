import { render } from 'vitest-browser-react'
import { PriceSparkline } from '#/features/storefront/components/canvas/price-sparkline'
import type { PriceSparklineProps } from '#/features/storefront/types/ui-types'

export const priceSparklineProps = (
  overrides?: Partial<PriceSparklineProps>,
): PriceSparklineProps => ({
  points: [
    { date: '2026-04-01', price: 120 },
    { date: '2026-04-15', price: 110 },
    { date: '2026-04-26', price: 100 },
  ],
  currentPrice: 100,
  lowestPrice: 100,
  highestPrice: 120,
  ...overrides,
})

export async function renderPriceSparkline(overrides?: Partial<PriceSparklineProps>) {
  const props = priceSparklineProps(overrides)
  const screen = await render(
    <div data-testid="sparkline-host">
      <PriceSparkline {...props} />
    </div>,
  )
  const host = screen.getByTestId('sparkline-host').element() as HTMLElement
  return {
    screen,
    props,
    host,
    path: () => host.querySelector('path'),
  }
}
