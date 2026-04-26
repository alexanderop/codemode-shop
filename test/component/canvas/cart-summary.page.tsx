import { CartSummary } from '#/features/storefront/components/canvas/cart-summary'
import type { CartSummaryProps } from '#/features/storefront/types/ui-types'
import type { Width } from '#/lib/catalog'
import { renderWithQuery } from '../with-query'

type Item = CartSummaryProps['items'][number]

export const cartItem = (overrides?: Partial<Item>): Item => ({
  productId: 'p1',
  name: 'Pegasus 41',
  brand: 'Nike',
  size: '10',
  width: 'standard' as Width,
  quantity: 1,
  unitPrice: 139,
  lineTotal: 139,
  ...overrides,
})

export const cartSummaryProps = (overrides?: Partial<CartSummaryProps>): CartSummaryProps => ({
  items: [cartItem()],
  itemCount: 1,
  subtotal: 139,
  ...overrides,
})

export async function renderCartSummary(overrides?: Partial<CartSummaryProps>) {
  const props = cartSummaryProps(overrides)
  const { screen, queryClient } = await renderWithQuery(<CartSummary {...props} />)
  return {
    screen,
    queryClient,
    props,
    decreaseFor: () => screen.getByRole('button', { name: 'Decrease quantity' }),
    increaseFor: () => screen.getByRole('button', { name: 'Increase quantity' }),
    removeFor: () => screen.getByRole('button', { name: 'Remove line' }),
    checkoutButton: () => screen.getByRole('button', { name: /Proceed to checkout/ }),
  }
}
