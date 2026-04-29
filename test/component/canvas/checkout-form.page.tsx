import { vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { CheckoutForm } from '#/features/storefront/components/canvas/checkout-form'
import type { CheckoutFormProps } from '#/features/storefront/types/ui-types'
import { cartQueryKey, getCart } from '#/queries/cart'
import type { DetailedCart, DetailedCartLine } from '#/lib/cart-mutation'
import { renderWithQuery } from '../with-query'

const getCartMock = vi.mocked(getCart)

export const checkoutFormProps = (overrides?: Partial<CheckoutFormProps>): CheckoutFormProps => ({
  subtotal: 139,
  lineCount: 1,
  ...overrides,
})

function placeholderLine(i: number): DetailedCartLine {
  return {
    productId: `p${i}`,
    name: `Item ${i}`,
    brand: 'Test',
    imageUrl: '',
    size: '10',
    width: 'standard',
    quantity: 1,
    unitPrice: 0,
    lineTotal: 0,
  }
}

export async function renderCheckoutForm(overrides?: Partial<CheckoutFormProps>) {
  const props = checkoutFormProps(overrides)
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: Infinity },
      mutations: { retry: false },
    },
  })
  const cart: DetailedCart = {
    items: Array.from({ length: props.lineCount }, (_, i) => placeholderLine(i)),
    itemCount: props.lineCount,
    subtotal: props.subtotal,
  }
  queryClient.setQueryData(cartQueryKey, cart)
  getCartMock.mockResolvedValue(cart)
  const { screen } = await renderWithQuery(<CheckoutForm {...props} />, queryClient)
  return {
    screen,
    queryClient,
    props,
    submitButton: () => screen.getByRole('button', { name: /Place order/ }),
  }
}
