import type { ComponentPropsByType, ComponentType } from '#/features/storefront/types/ui-types'
import { Loading } from '#/features/storefront/components/canvas/loading'
import { LiveProductCard } from '#/features/storefront/components/canvas/product-card'
import { StockPill } from '#/features/storefront/components/canvas/stock-pill'
import { PriceSparkline } from '#/features/storefront/components/canvas/price-sparkline'
import { ReviewBar } from '#/features/storefront/components/canvas/review-bar'
import { ComparisonTable } from '#/features/storefront/components/canvas/comparison-table'
import { CTAButton } from '#/features/storefront/components/canvas/cta-button'
import { CartSummary } from '#/features/storefront/components/canvas/cart-summary'
import { CheckoutForm } from '#/features/storefront/components/canvas/checkout-form'
import { OrderConfirmation } from '#/features/storefront/components/canvas/order-confirmation'
import { SuggestedFollowups } from '#/features/storefront/components/canvas/suggested-followups'

type Renderer<T extends ComponentType> = (
  props: ComponentPropsByType[T],
  children: React.ReactNode,
) => React.ReactNode

export const storefrontUIRenderers: { [T in ComponentType]: Renderer<T> } = {
  loading: (props) => <Loading {...props} />,
  productCard: (props, children) => <LiveProductCard props={props}>{children}</LiveProductCard>,
  stockPill: (props) => <StockPill {...props} />,
  priceSparkline: (props) => <PriceSparkline {...props} />,
  reviewBar: (props) => <ReviewBar {...props} />,
  comparisonTable: (props) => <ComparisonTable {...props} />,
  ctaButton: (props) => <CTAButton {...props} />,
  cartSummary: (props) => <CartSummary {...props} />,
  checkoutForm: (props) => <CheckoutForm {...props} />,
  orderConfirmation: (props) => <OrderConfirmation {...props} />,
  suggestedFollowups: (props) => <SuggestedFollowups {...props} />,
}
