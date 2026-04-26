import { describe, expect, it } from 'vitest'
import { renderComparisonTable } from './comparison-table.page'

describe('ComparisonTable', () => {
  it('renders all column headers and row labels', async () => {
    const table = await renderComparisonTable()
    await expect.element(table.text('Pegasus')).toBeVisible()
    await expect.element(table.text('Bondi')).toBeVisible()
    await expect.element(table.text('Glycerin')).toBeVisible()
    await expect.element(table.text('Price')).toBeVisible()
    await expect.element(table.text('Drop')).toBeVisible()
    await expect.element(table.text('$160')).toBeVisible()
  })

  it('marks the winner column with a "best" badge', async () => {
    const table = await renderComparisonTable({
      columnHeaders: ['A', 'B'],
      rows: [{ label: 'x', values: ['1', '2'] }],
      winnerColumn: 1,
    })
    await expect.element(table.winnerBadge).toBeVisible()
  })

  it('omits the badge when no winner column is set', async () => {
    const table = await renderComparisonTable({
      columnHeaders: ['A', 'B'],
      rows: [{ label: 'x', values: ['1', '2'] }],
    })
    await expect.element(table.winnerBadge).not.toBeInTheDocument()
  })
})
