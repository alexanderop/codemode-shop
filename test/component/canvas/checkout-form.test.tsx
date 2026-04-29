import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const navigateMock = vi.fn()
const toastErrorMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
  notFound: () => new Error('NotFound'),
}))

vi.mock('sonner', () => ({
  toast: { error: (...args: Array<unknown>) => toastErrorMock(...args) },
}))

import { checkout } from '#/queries/checkout'
import { renderCheckoutForm } from './checkout-form.page'

const checkoutMock = vi.mocked(checkout)

beforeEach(() => {
  navigateMock.mockReset()
  toastErrorMock.mockReset()
  checkoutMock.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CheckoutForm', () => {
  it('shows the line count and subtotal in the header', async () => {
    const view = await renderCheckoutForm({ lineCount: 2, subtotal: 250 })
    await expect.element(view.screen.getByText(/2 lines · \$250\.00/)).toBeVisible()
  })

  it('uses singular "line" when lineCount is 1', async () => {
    const view = await renderCheckoutForm({ lineCount: 1, subtotal: 139 })
    await expect.element(view.screen.getByText(/1 line · \$139\.00/)).toBeVisible()
  })

  it('disables the submit button while a request is in flight', async () => {
    let resolve!: (value: { orderId: string }) => void
    checkoutMock.mockReturnValueOnce(new Promise<{ orderId: string }>((r) => (resolve = r)))

    const view = await renderCheckoutForm()
    await view.submitButton().click()

    await expect
      .element(view.screen.getByRole('button', { name: /Processing payment/ }))
      .toBeDisabled()

    resolve({ orderId: 'ord_x' })
  })

  it('navigates to the order page on a successful response', async () => {
    checkoutMock.mockResolvedValueOnce({ orderId: 'ord_42' })

    const view = await renderCheckoutForm()
    await view.submitButton().click()

    await vi.waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith({
        to: '/orders/$orderId',
        params: { orderId: 'ord_42' },
      }),
    )
  })

  it('toasts the thrown error message on a server-side failure', async () => {
    checkoutMock.mockRejectedValueOnce(new Error('card declined'))

    const view = await renderCheckoutForm()
    await view.submitButton().click()

    await vi.waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('card declined'))
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('falls back to "Checkout failed" when rejection is a non-Error value', async () => {
    checkoutMock.mockRejectedValueOnce('boom')

    const view = await renderCheckoutForm()
    await view.submitButton().click()

    await vi.waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Checkout failed'))
  })

  it('re-enables the submit button after a successful submission', async () => {
    checkoutMock.mockResolvedValueOnce({ orderId: 'ord_42' })

    const view = await renderCheckoutForm()
    await view.submitButton().click()
    await vi.waitFor(() => expect(navigateMock).toHaveBeenCalled())

    await expect.element(view.submitButton()).toBeEnabled()
  })
})
