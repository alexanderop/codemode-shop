import { render } from 'vitest-browser-react'
import { OrderConfirmation } from '#/features/storefront/components/canvas/order-confirmation'
import type { OrderConfirmationProps } from '#/features/storefront/types/ui-types'

export const orderConfirmationProps = (
  overrides?: Partial<OrderConfirmationProps>,
): OrderConfirmationProps => ({
  orderId: 'ord_123',
  arrivesBy: '2026-05-02',
  shippingAddress: {
    fullName: 'Alex Demo',
    line1: '1 Infinite Loop',
    city: 'Cupertino',
    state: 'CA',
    zipCode: '95014',
  },
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
  ],
  itemCount: 1,
  subtotal: 139,
  shippingCost: 0,
  tax: 11,
  total: 150,
  paymentLast4: '4242',
  ...overrides,
})

export async function renderOrderConfirmation(overrides?: Partial<OrderConfirmationProps>) {
  const props = orderConfirmationProps(overrides)
  const screen = await render(<OrderConfirmation {...props} />)
  return { screen, props }
}
