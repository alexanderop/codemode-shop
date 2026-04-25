import { render } from 'vitest-browser-react'
import { ComparisonTable } from './comparison-table'
import type { ComparisonTableProps } from '#/features/storefront/types/ui-types'

export const comparisonTableProps = (
  overrides?: Partial<ComparisonTableProps>,
): ComparisonTableProps => ({
  columnHeaders: ['Pegasus', 'Bondi', 'Glycerin'],
  rows: [
    { label: 'Price', values: ['$139', '$160', '$180'] },
    { label: 'Drop', values: ['10mm', '4mm', '10mm'] },
  ],
  ...overrides,
})

export async function renderComparisonTable(overrides?: Partial<ComparisonTableProps>) {
  const props = comparisonTableProps(overrides)
  const screen = await render(<ComparisonTable {...props} />)
  return {
    screen,
    props,
    text: (s: string) => screen.getByText(s),
    winnerBadge: screen.getByText('best'),
  }
}
