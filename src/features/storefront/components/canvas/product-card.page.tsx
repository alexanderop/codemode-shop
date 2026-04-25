import type { ReactNode } from 'react'
import { render } from 'vitest-browser-react'
import { LiveProductCard } from './product-card'
import type { ProductCardProps } from '#/features/storefront/types/ui-types'

export const productCardProps = (overrides?: Partial<ProductCardProps>): ProductCardProps => ({
  productId: 'shoe-01',
  name: 'Pegasus 41',
  brand: 'Nike',
  price: 139,
  imageUrl: 'https://example.com/p.png',
  ...overrides,
})

export async function renderProductCard(
  overrides?: Partial<ProductCardProps>,
  children?: ReactNode,
) {
  const props = productCardProps(overrides)
  const screen = await render(<LiveProductCard props={props}>{children}</LiveProductCard>)
  return {
    screen,
    props,
    brand: screen.getByText(props.brand),
    name: screen.getByText(props.name),
    price: screen.getByText(`$${props.price}`),
    highlightBadge: screen.getByText('Best match'),
    ratingFor: (value: number) => screen.getByText(value.toFixed(1)),
  }
}
