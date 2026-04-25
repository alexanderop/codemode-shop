import { describe, expect, it } from 'vitest'
import { addToCart, getCartDetailed } from './cart'
import { getOrder, placeOrder, type ShippingAddress } from './orders'
import { withTestSession } from '#/lib/test-utils/with-session'
import { sessionContext } from '#/lib/session-context'

const ADDRESS: ShippingAddress = {
  fullName: 'Alex Demo',
  line1: '1 Infinite Loop',
  city: 'Cupertino',
  state: 'CA',
  zipCode: '95014',
}

describe('placeOrder', () => {
  it('throws on empty cart', () =>
    withTestSession(() => {
      expect(() => placeOrder({ shippingAddress: ADDRESS, paymentLast4: '4242' })).toThrow(/empty/i)
    }))

  it('snapshots cart, mints id, computes totals, and clears cart', () =>
    withTestSession(() => {
      addToCart({ productId: 'shoe-01', size: '10', width: 'standard', quantity: 2 })
      const subtotal = getCartDetailed().subtotal
      const order = placeOrder({ shippingAddress: ADDRESS, paymentLast4: '4242' })

      expect(order.id).toMatch(/^ord_[0-9a-f-]{36}$/)
      expect(order.lines).toHaveLength(1)
      expect(order.subtotal).toBe(subtotal)
      expect(order.tax).toBeCloseTo(subtotal * 0.08, 2)
      expect(order.total).toBeCloseTo(subtotal + order.shippingCost + order.tax, 2)
      expect(order.shippingAddress).toEqual(ADDRESS)
      expect(order.paymentLast4).toBe('4242')
      expect(order.status).toBe('placed')
      expect(order.arrivesBy).toMatch(/^\d{4}-\d{2}-\d{2}$/)

      expect(getCartDetailed().items).toHaveLength(0)
    }))

  it('getOrder returns the placed order, undefined for unknown id', () =>
    withTestSession(() => {
      addToCart({ productId: 'shoe-01', size: '10', width: 'standard', quantity: 1 })
      const order = placeOrder({ shippingAddress: ADDRESS, paymentLast4: '4242' })
      expect(getOrder(order.id)).toEqual(order)
      expect(getOrder('ord_doesnotexist')).toBeUndefined()
    }))
})

describe('session isolation', () => {
  it('getOrder does not leak across sessions', () => {
    const placedId = withTestSession(() => {
      addToCart({ productId: 'shoe-01', size: '10', width: 'standard', quantity: 1 })
      return placeOrder({ shippingAddress: ADDRESS, paymentLast4: '4242' }).id
    }, 'session-A')

    const lookupFromOtherSession = withTestSession(() => getOrder(placedId), 'session-B')
    expect(lookupFromOtherSession).toBeUndefined()
  })

  it('sessionContext.get() throws when called outside run()', () => {
    expect(() => sessionContext.get()).toThrow(/outside sessionContext.run/)
  })
})
