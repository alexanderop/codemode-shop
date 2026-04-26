import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const toastErrorMock = vi.fn()

vi.mock('sonner', () => ({
  toast: { error: (...args: Array<unknown>) => toastErrorMock(...args) },
}))

import { uiStore } from '#/features/storefront/stores/ui-store'
import { EMPTY_CART } from '#/lib/cart-mutation'
import { cartItem, renderCartSummary } from './cart-summary.page'

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

function lastCartPostBody(fetchMock: ReturnType<typeof vi.fn>): unknown {
  const calls = fetchMock.mock.calls.filter(
    (c) => c[0] === '/api/cart' && (c[1] as RequestInit | undefined)?.method === 'POST',
  )
  const last = calls[calls.length - 1]
  if (!last) throw new Error('No POST /api/cart was made')
  return JSON.parse(((last[1] as RequestInit).body as string) ?? '{}')
}

beforeEach(() => {
  toastErrorMock.mockReset()
})

afterEach(() => {
  uiStore.clear()
  vi.unstubAllGlobals()
})

describe('CartSummary', () => {
  it('renders an empty-state message when items is empty', async () => {
    const view = await renderCartSummary(EMPTY_CART)
    await expect.element(view.screen.getByText(/cart is empty/i)).toBeVisible()
  })

  it('shows the line item with name, brand, size, width and totals', async () => {
    const view = await renderCartSummary({
      items: [cartItem({ name: 'Pegasus 41', quantity: 1, lineTotal: 139 })],
      subtotal: 139,
    })
    await expect.element(view.screen.getByText('Pegasus 41')).toBeVisible()
    await expect.element(view.screen.getByText(/size 10/)).toBeVisible()
    await expect.element(view.screen.getByText('$139.00').first()).toBeVisible()
  })

  it('pluralizes the item count', async () => {
    const single = await renderCartSummary({ itemCount: 1 })
    await expect.element(single.screen.getByText('1 item')).toBeVisible()

    const multi = await renderCartSummary({ itemCount: 3 })
    await expect.element(multi.screen.getByText('3 items')).toBeVisible()
  })

  it('shows the per-unit price only when quantity > 1', async () => {
    const view = await renderCartSummary({
      items: [cartItem({ quantity: 2, lineTotal: 278, unitPrice: 139 })],
      subtotal: 278,
    })
    await expect.element(view.screen.getByText(/\$139\.00 each/)).toBeVisible()
  })

  it('dispatches a "set" mutation with quantity-1 when decrease is clicked', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(EMPTY_CART))
    vi.stubGlobal('fetch', fetchMock)
    const view = await renderCartSummary({ items: [cartItem({ quantity: 3 })] })
    await view.decreaseFor().click()
    await vi.waitFor(() =>
      expect(lastCartPostBody(fetchMock)).toEqual({
        action: 'set',
        productId: 'p1',
        size: '10',
        width: 'standard',
        quantity: 2,
      }),
    )
  })

  it('dispatches a "set" mutation with quantity+1 when increase is clicked', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(EMPTY_CART))
    vi.stubGlobal('fetch', fetchMock)
    const view = await renderCartSummary({ items: [cartItem({ quantity: 1 })] })
    await view.increaseFor().click()
    await vi.waitFor(() =>
      expect(lastCartPostBody(fetchMock)).toEqual({
        action: 'set',
        productId: 'p1',
        size: '10',
        width: 'standard',
        quantity: 2,
      }),
    )
  })

  it('dispatches a "remove" mutation when the trash button is clicked', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(EMPTY_CART))
    vi.stubGlobal('fetch', fetchMock)
    const view = await renderCartSummary()
    await view.removeFor().click()
    await vi.waitFor(() =>
      expect(lastCartPostBody(fetchMock)).toEqual({
        action: 'remove',
        productId: 'p1',
        size: '10',
        width: 'standard',
      }),
    )
  })

  it('toasts the error message when a mutation rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const view = await renderCartSummary()
    await view.removeFor().click()
    await vi.waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('offline'))
  })

  it('mounts the checkoutForm node when "Proceed to checkout" is clicked', async () => {
    const view = await renderCartSummary({
      subtotal: 250,
      items: [cartItem({ productId: 'p1' }), cartItem({ productId: 'p2' })],
    })
    await view.checkoutButton().click()
    const node = uiStore.get().nodes.get('checkout-form')
    expect(node?.type).toBe('checkoutForm')
    expect(node?.props).toEqual({ subtotal: 250, lineCount: 2 })
  })
})
