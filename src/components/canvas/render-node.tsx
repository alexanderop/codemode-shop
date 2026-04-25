import type { UINode } from '#/lib/storefront/ui-types'
import { Loading } from '#/components/canvas/loading'
import { LiveProductCard } from '#/components/canvas/product-card'
import { StockPill } from '#/components/canvas/stock-pill'
import { PriceSparkline } from '#/components/canvas/price-sparkline'
import { ReviewBar } from '#/components/canvas/review-bar'
import { ComparisonTable } from '#/components/canvas/comparison-table'
import { CTAButton } from '#/components/canvas/cta-button'
import { CartSummary } from '#/components/canvas/cart-summary'

export type NodeLookup = {
  get: (id: string) => UINode | undefined
}

export function asLookup(nodes: Map<string, UINode> | Record<string, UINode>): NodeLookup {
  if (nodes instanceof Map) return { get: (id) => nodes.get(id) }
  return { get: (id) => nodes[id] }
}

export function renderNode(id: string, lookup: NodeLookup): React.ReactNode {
  const node = lookup.get(id)
  if (!node) return null
  const children = node.childIds.map((cid) => <div key={cid}>{renderNode(cid, lookup)}</div>)

  switch (node.type) {
    case 'loading':
      return <Loading {...node.props} />
    case 'productCard':
      return (
        <LiveProductCard props={node.props}>{children.length ? children : null}</LiveProductCard>
      )
    case 'stockPill':
      return <StockPill {...node.props} />
    case 'priceSparkline':
      return <PriceSparkline {...node.props} />
    case 'reviewBar':
      return <ReviewBar {...node.props} />
    case 'comparisonTable':
      return <ComparisonTable {...node.props} />
    case 'ctaButton':
      return <CTAButton {...node.props} />
    case 'cartSummary':
      return <CartSummary {...node.props} />
    default:
      return null
  }
}
