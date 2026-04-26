import { render } from 'vitest-browser-react'
import { CheckoutForm } from '#/features/storefront/components/canvas/checkout-form'
import type { CheckoutFormProps } from '#/features/storefront/types/ui-types'

export const checkoutFormProps = (overrides?: Partial<CheckoutFormProps>): CheckoutFormProps => ({
  subtotal: 139,
  lineCount: 1,
  ...overrides,
})

export async function renderCheckoutForm(overrides?: Partial<CheckoutFormProps>) {
  const props = checkoutFormProps(overrides)
  const screen = await render(<CheckoutForm {...props} />)
  return {
    screen,
    props,
    submitButton: () => screen.getByRole('button', { name: /Place order/ }),
  }
}
