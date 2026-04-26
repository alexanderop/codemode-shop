import { expect } from 'vitest'
import { render } from 'vitest-browser-react'
import { CTAButton } from '#/features/storefront/components/canvas/cta-button'
import type { CTAButtonProps } from '#/features/storefront/types/ui-types'

export const ctaButtonProps = (overrides?: Partial<CTAButtonProps>): CTAButtonProps => ({
  label: 'Add Pegasus to cart',
  handlerId: 'addToCart',
  payload: { productId: 'shoe-01', size: '10' },
  ...overrides,
})

export async function renderCTAButton(overrides?: Partial<CTAButtonProps>) {
  const props = ctaButtonProps(overrides)
  const screen = await render(<CTAButton {...props} />)
  const button = screen.getByRole('button')
  return {
    screen,
    props,
    button,
    click: () => button.click(),
    expectIdle: () =>
      expect.element(screen.getByRole('button', { name: props.label })).toBeVisible(),
    expectLoading: () =>
      expect.element(screen.getByRole('button', { name: /Checking stock/ })).toBeDisabled(),
    expectDone: () =>
      expect.element(screen.getByRole('button', { name: /Added to cart/ })).toBeVisible(),
    expectRetry: () => screen.getByRole('button', { name: /Try again/ }),
  }
}
