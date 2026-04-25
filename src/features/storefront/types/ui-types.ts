export interface LoadingProps {
  label: string
}

export interface ProductCardProps {
  productId: string
  name: string
  brand: string
  price: number
  imageUrl: string
  rating?: number
  color?: string
  highlight?: boolean
}

export interface StockPillProps {
  inStock: boolean
  quantity?: number
  arrivesBy?: string
  shippingCost?: number
}

export interface PriceSparklineProps {
  points: Array<{ date: string; price: number }>
  currentPrice: number
  lowestPrice: number
  highestPrice: number
}

export interface ReviewBarProps {
  rating: number
  reviewCount: number
  praise: Array<string>
  complaints: Array<string>
}

export interface ComparisonTableProps {
  columnHeaders: Array<string>
  rows: Array<{ label: string; values: Array<string> }>
  winnerColumn?: number
}

import type { Width } from '#/lib/catalog'

export interface CTAButtonProps {
  label: string
  handlerId: 'addToCart'
  payload: {
    productId: string
    size: string
    width?: Width
    quantity?: number
  }
  variant?: 'primary' | 'secondary'
}

export interface CartSummaryProps {
  items: Array<{
    productId: string
    name: string
    brand: string
    size: string
    width: Width
    quantity: number
    unitPrice: number
    lineTotal: number
  }>
  itemCount: number
  subtotal: number
}

export interface CheckoutFormProps {
  subtotal: number
  lineCount: number
}

export interface OrderConfirmationLine {
  productId: string
  name: string
  brand: string
  size: string
  width: Width
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface OrderShippingAddress {
  fullName: string
  line1: string
  line2?: string
  city: string
  state: string
  zipCode: string
}

export interface OrderConfirmationProps {
  orderId: string
  lines: Array<OrderConfirmationLine>
  itemCount: number
  subtotal: number
  shippingCost: number
  tax: number
  total: number
  shippingAddress: OrderShippingAddress
  paymentLast4: string
  arrivesBy: string
}

export interface SuggestedFollowupsProps {
  suggestions: Array<{ text: string }>
}

export interface ComponentPropsByType {
  loading: LoadingProps
  productCard: ProductCardProps
  stockPill: StockPillProps
  priceSparkline: PriceSparklineProps
  reviewBar: ReviewBarProps
  comparisonTable: ComparisonTableProps
  ctaButton: CTAButtonProps
  cartSummary: CartSummaryProps
  checkoutForm: CheckoutFormProps
  orderConfirmation: OrderConfirmationProps
  suggestedFollowups: SuggestedFollowupsProps
}

export type ComponentType = keyof ComponentPropsByType

type UINodeFor<T extends ComponentType> = {
  id: string
  type: T
  parentId?: string
  props: ComponentPropsByType[T]
  childIds: Array<string>
}

export type UINode = {
  [T in ComponentType]: UINodeFor<T>
}[ComponentType]

type UIAddEvent = {
  [T in ComponentType]: {
    op: 'add'
    id: string
    type: T
    parentId?: string
    props: ComponentPropsByType[T]
  }
}[ComponentType]

export type UIEvent =
  | UIAddEvent
  | { op: 'update'; id: string; props: Record<string, unknown> }
  | { op: 'remove'; id: string }
  | { op: 'clear' }
