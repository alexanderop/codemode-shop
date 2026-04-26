import { render } from 'vitest-browser-react'
import { ReviewBar } from '#/features/storefront/components/canvas/review-bar'
import type { ReviewBarProps } from '#/features/storefront/types/ui-types'

export const reviewBarProps = (overrides?: Partial<ReviewBarProps>): ReviewBarProps => ({
  rating: 4.5,
  reviewCount: 1234,
  praise: ['comfy', 'durable'],
  complaints: ['runs small'],
  ...overrides,
})

export async function renderReviewBar(overrides?: Partial<ReviewBarProps>) {
  const props = reviewBarProps(overrides)
  const screen = await render(<ReviewBar {...props} />)
  return { screen, props }
}
