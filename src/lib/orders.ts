import { shippingEtaDays } from '#/lib/catalog'
import { clearCart, getCartDetailed, type DetailedCartLine } from '#/lib/cart'
import { sessionContext, type SessionId } from '#/lib/session-context'

export interface ShippingAddress {
  fullName: string
  line1: string
  line2?: string
  city: string
  state: string
  zipCode: string
}

export type OrderStatus = 'placed' | 'shipped' | 'delivered'

export type OrderLine = DetailedCartLine

export interface Order {
  id: string
  lines: Array<OrderLine>
  itemCount: number
  subtotal: number
  shippingCost: number
  tax: number
  total: number
  shippingAddress: ShippingAddress
  paymentLast4: string
  status: OrderStatus
  arrivesBy: string
  createdAt: string
}

const TAX_RATE = 0.08

const ordersBySession = new Map<SessionId, Map<string, Order>>()

function getOrdersForSession(): Map<string, Order> {
  const { sessionId } = sessionContext.get()
  let bucket = ordersBySession.get(sessionId)
  if (!bucket) {
    bucket = new Map()
    ordersBySession.set(sessionId, bucket)
  }
  return bucket
}

function shippingCostForZip(zipCode: string): number {
  const days = shippingEtaDays(zipCode)
  return days <= 2 ? 12 : days <= 3 ? 7 : 0
}

function arrivalForZip(zipCode: string): string {
  const days = shippingEtaDays(zipCode)
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function mintOrderId(): string {
  return `ord_${crypto.randomUUID()}`
}

export function placeOrder(input: {
  shippingAddress: ShippingAddress
  paymentLast4: string
}): Order {
  const cart = getCartDetailed()
  if (cart.items.length === 0) {
    throw new Error('Cannot place an order with an empty cart')
  }
  const shippingCost = shippingCostForZip(input.shippingAddress.zipCode)
  const tax = Math.round(cart.subtotal * TAX_RATE * 100) / 100
  const total = Math.round((cart.subtotal + shippingCost + tax) * 100) / 100
  const order: Order = {
    id: mintOrderId(),
    lines: cart.items,
    itemCount: cart.itemCount,
    subtotal: cart.subtotal,
    shippingCost,
    tax,
    total,
    shippingAddress: input.shippingAddress,
    paymentLast4: input.paymentLast4,
    status: 'placed',
    arrivesBy: arrivalForZip(input.shippingAddress.zipCode),
    createdAt: new Date().toISOString(),
  }
  getOrdersForSession().set(order.id, order)
  clearCart()
  return order
}

export function getOrder(id: string): Order | undefined {
  return getOrdersForSession().get(id)
}
