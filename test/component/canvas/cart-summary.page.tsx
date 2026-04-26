import { QueryClient } from '@tanstack/react-query'
import { CartSummary } from '#/features/storefront/components/canvas/cart-summary'
import type { CartSummaryProps } from '#/features/storefront/types/ui-types'
import type { Width } from '#/lib/catalog'
import { cartQueryKey } from '#/queries/cart'
import type { DetailedCart, DetailedCartLine } from '#/lib/cart-mutation'
import { renderWithQuery } from '../with-query'

export const cartItem = (overrides?: Partial<DetailedCartLine>): DetailedCartLine => ({
  productId: 'p1',
  name: 'Pegasus 41',
  brand: 'Nike',
  imageUrl: '',
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
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: Infinity },
      mutations: { retry: false },
    },
  })
  const cart: DetailedCart = {
    items: props.items as Array<DetailedCartLine>,
    itemCount: props.itemCount,
    subtotal: props.subtotal,
  }
  queryClient.setQueryData(cartQueryKey, cart)
  const { screen } = await renderWithQuery(<CartSummary {...props} />, queryClient)
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
