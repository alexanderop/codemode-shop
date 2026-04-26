import { CheckoutForm } from '#/features/storefront/components/canvas/checkout-form'
import type { CheckoutFormProps } from '#/features/storefront/types/ui-types'
import { renderWithQuery } from '../with-query'

export const checkoutFormProps = (overrides?: Partial<CheckoutFormProps>): CheckoutFormProps => ({
  subtotal: 139,
  lineCount: 1,
  ...overrides,
})

export async function renderCheckoutForm(overrides?: Partial<CheckoutFormProps>) {
  const props = checkoutFormProps(overrides)
  const { screen, queryClient } = await renderWithQuery(<CheckoutForm {...props} />)
  return {
    screen,
    queryClient,
    props,
    submitButton: () => screen.getByRole('button', { name: /Place order/ }),
  }
}
