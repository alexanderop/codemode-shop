import { CheckCircle2, Package, Truck } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { currency } from '#/lib/format'
import type { OrderConfirmationProps } from '#/features/storefront/types/ui-types'

const dateFmt = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

function formatArrival(iso: string): string {
  try {
    return dateFmt.format(new Date(`${iso}T00:00:00`))
  } catch {
    return iso
  }
}

export function OrderConfirmation(props: OrderConfirmationProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card text-sm shadow-sm">
      <div className="flex items-center gap-2 border-b bg-emerald-500/10 px-4 py-3 font-semibold text-emerald-300">
        <CheckCircle2 className="h-4 w-4" />
        Order confirmed
      </div>

      <div className="space-y-3 p-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Order ID</div>
          <div className="font-mono text-sm">{props.orderId}</div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs">
          <Truck className="h-3.5 w-3.5" />
          <span>
            Arrives by <span className="font-semibold">{formatArrival(props.arrivesBy)}</span> to{' '}
            {props.shippingAddress.line1}, {props.shippingAddress.city},{' '}
            {props.shippingAddress.state} {props.shippingAddress.zipCode}
          </span>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Items
          </div>
          <div className="divide-y rounded-lg border">
            {props.lines.map((line) => (
              <div
                key={`${line.productId}-${line.size}-${line.width}`}
                className="flex items-center gap-2 px-3 py-2"
              >
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate">{line.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {line.brand} · size {line.size} · {line.width} · qty {line.quantity}
                  </div>
                </div>
                <div className="font-medium">{currency.format(line.lineTotal)}</div>
              </div>
            ))}
          </div>
        </div>

        <dl className="space-y-1 text-xs">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{currency.format(props.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd>{props.shippingCost === 0 ? 'Free' : currency.format(props.shippingCost)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Tax</dt>
            <dd>{currency.format(props.tax)}</dd>
          </div>
          <div className="flex justify-between border-t pt-1 text-sm font-semibold">
            <dt>Total</dt>
            <dd>{currency.format(props.total)}</dd>
          </div>
        </dl>

        <div className="text-xs text-muted-foreground">
          Charged to card ending in <span className="font-mono">{props.paymentLast4}</span>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Continue shopping →
        </Link>
      </div>
    </div>
  )
}
