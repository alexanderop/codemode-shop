import { describe, expect, it } from 'vitest'
import { renderReviewBar } from './review-bar.page'

describe('ReviewBar', () => {
  it('renders the rating to one decimal and a localized review count', async () => {
    const view = await renderReviewBar({ rating: 4.5, reviewCount: 1234 })
    await expect.element(view.screen.getByText('4.5')).toBeVisible()
    await expect.element(view.screen.getByText(/1,234 reviews/)).toBeVisible()
  })

  it('joins praise items with a separator', async () => {
    const view = await renderReviewBar({ praise: ['comfy', 'light'] })
    await expect.element(view.screen.getByText('comfy · light')).toBeVisible()
  })

  it('joins complaint items with a separator', async () => {
    const view = await renderReviewBar({ complaints: ['runs small', 'pricey'] })
    await expect.element(view.screen.getByText('runs small · pricey')).toBeVisible()
  })

  it('hides the praise row when praise is empty', async () => {
    const view = await renderReviewBar({ praise: [], complaints: ['x'] })
    await expect.element(view.screen.getByText('x')).toBeVisible()
  })

  it('hides the complaint row when complaints is empty', async () => {
    const view = await renderReviewBar({ praise: ['y'], complaints: [] })
    await expect.element(view.screen.getByText('y')).toBeVisible()
  })
})
