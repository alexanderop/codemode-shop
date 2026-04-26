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

import { renderCheckoutForm } from './checkout-form.page'

beforeEach(() => {
  navigateMock.mockReset()
  toastErrorMock.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

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
    let resolve!: (res: Response) => void
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((r) => (resolve = r))),
    )

    const view = await renderCheckoutForm()
    await view.submitButton().click()

    await expect
      .element(view.screen.getByRole('button', { name: /Processing payment/ }))
      .toBeDisabled()

    resolve(jsonResponse({ orderId: 'ord_x' }))
  })

  it('navigates to the order page on a successful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ orderId: 'ord_42' })))

    const view = await renderCheckoutForm()
    await view.submitButton().click()

    await vi.waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith({
        to: '/orders/$orderId',
        params: { orderId: 'ord_42' },
      }),
    )
  })

  it('toasts the server error message on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'card declined' }, { status: 402 })),
    )

    const view = await renderCheckoutForm()
    await view.submitButton().click()

    await vi.waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('card declined'))
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('falls back to "Checkout failed" when the error response has no message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, { status: 500 })))

    const view = await renderCheckoutForm()
    await view.submitButton().click()

    await vi.waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Checkout failed'))
  })

  it('toasts the thrown error message when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    const view = await renderCheckoutForm()
    await view.submitButton().click()

    await vi.waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('offline'))
  })

  it('falls back to "Checkout failed" when fetch rejects with a non-Error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('boom'))

    const view = await renderCheckoutForm()
    await view.submitButton().click()

    await vi.waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Checkout failed'))
  })

  it('re-enables the submit button after a successful submission', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ orderId: 'ord_42' })))

    const view = await renderCheckoutForm()
    await view.submitButton().click()
    await vi.waitFor(() => expect(navigateMock).toHaveBeenCalled())

    await expect.element(view.submitButton()).toBeEnabled()
  })
})
