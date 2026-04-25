import { describe, expect, it } from 'vitest'
import { renderProductCard } from './product-card.page'

describe('LiveProductCard', () => {
  it('shows brand, name, price', async () => {
    const card = await renderProductCard()
    await expect.element(card.brand).toBeVisible()
    await expect.element(card.name).toBeVisible()
    await expect.element(card.price).toBeVisible()
  })

  it('omits the rating when absent and shows it when provided', async () => {
    const without = await renderProductCard()
    await expect.element(without.ratingFor(4.5)).not.toBeInTheDocument()

    const withRating = await renderProductCard({ rating: 4.5 })
    await expect.element(withRating.ratingFor(4.5)).toBeVisible()
  })

  it('shows the highlight badge only when highlight=true', async () => {
    const plain = await renderProductCard()
    await expect.element(plain.highlightBadge).not.toBeInTheDocument()

    const highlighted = await renderProductCard({ highlight: true })
    await expect.element(highlighted.highlightBadge).toBeVisible()
  })

  it('renders children when provided (for composed CTA / pills)', async () => {
    const card = await renderProductCard(undefined, <button type="button">Child slot</button>)
    await expect.element(card.screen.getByRole('button', { name: 'Child slot' })).toBeVisible()
  })
})
