import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}))

import { renderOrderConfirmation } from './order-confirmation.page'

describe('OrderConfirmation', () => {
  it('shows the order id, address, and continue-shopping link', async () => {
    const view = await renderOrderConfirmation({ orderId: 'ord_42' })
    await expect.element(view.screen.getByText('ord_42')).toBeVisible()
    await expect
      .element(view.screen.getByText(/1 Infinite Loop, Cupertino, CA 95014/))
      .toBeVisible()
    await expect.element(view.screen.getByRole('link', { name: /Continue shopping/ })).toBeVisible()
  })

  it('formats arrivesBy as a localized date', async () => {
    const view = await renderOrderConfirmation({ arrivesBy: '2026-05-02' })
    // en-US "Sat, May 2"
    await expect.element(view.screen.getByText(/May 2/)).toBeVisible()
  })

  it('falls back to the raw arrival string when the date is unparseable', async () => {
    const view = await renderOrderConfirmation({ arrivesBy: 'not-a-date' })
    await expect.element(view.screen.getByText(/Invalid Date|not-a-date/)).toBeVisible()
  })

  it('renders one row per line item', async () => {
    const view = await renderOrderConfirmation({
      lines: [
        {
          productId: 'p1',
          name: 'Pegasus 41',
          brand: 'Nike',
          size: '10',
          width: 'standard',
          quantity: 1,
          unitPrice: 139,
          lineTotal: 139,
        },
        {
          productId: 'p2',
          name: 'Cloud X',
          brand: 'On',
          size: '11',
          width: 'standard',
          quantity: 2,
          unitPrice: 160,
          lineTotal: 320,
        },
      ],
    })
    await expect.element(view.screen.getByText('Pegasus 41')).toBeVisible()
    await expect.element(view.screen.getByText('Cloud X')).toBeVisible()
  })

  it('shows "Free" when shippingCost is 0 and a currency value otherwise', async () => {
    const free = await renderOrderConfirmation({ shippingCost: 0 })
    await expect.element(free.screen.getByText('Free')).toBeVisible()

    const paid = await renderOrderConfirmation({ shippingCost: 9 })
    await expect.element(paid.screen.getByText('$9.00')).toBeVisible()
  })

  it('renders the masked card number', async () => {
    const view = await renderOrderConfirmation({ paymentLast4: '4242' })
    await expect.element(view.screen.getByText('4242')).toBeVisible()
  })
})
