import { Check, Truck, X } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import type { StockPillProps } from '#/lib/storefront/ui-types'

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export function StockPill(props: StockPillProps) {
  if (!props.inStock) {
    return (
      <Badge variant="destructive" className="gap-1">
        <X className="h-3 w-3" /> Out of stock
      </Badge>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-100">
        <Check className="h-3 w-3" />
        {props.quantity ? `${props.quantity} in stock` : 'In stock'}
      </Badge>
      {props.arrivesBy && (
        <Badge variant="outline" className="gap-1">
          <Truck className="h-3 w-3" />
          {formatDate(props.arrivesBy)}
          {props.shippingCost != null && (
            <span className="text-muted-foreground">
              {props.shippingCost === 0 ? ' · free' : ` · $${props.shippingCost}`}
            </span>
          )}
        </Badge>
      )}
    </div>
  )
}
