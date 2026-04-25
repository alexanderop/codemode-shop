import { ShoppingBag } from 'lucide-react'
import type { CartSummaryProps } from '#/lib/storefront/ui-types'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function CartSummary(props: CartSummaryProps) {
  if (props.items.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4 text-sm shadow-sm">
        <div className="flex items-center gap-2 font-semibold">
          <ShoppingBag className="h-4 w-4" />
          Your cart is empty
        </div>
        <p className="mt-1 text-muted-foreground">
          Ask Storekeeper for a recommendation, then use the add-to-cart button.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card text-sm shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/60 px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <ShoppingBag className="h-4 w-4" />
          Your cart
        </div>
        <div className="text-xs text-muted-foreground">
          {props.itemCount} {props.itemCount === 1 ? 'item' : 'items'}
        </div>
      </div>

      <div className="divide-y">
        {props.items.map((item) => (
          <div
            key={`${item.productId}-${item.size}-${item.width}`}
            className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3"
          >
            <div>
              <div className="font-medium leading-tight">{item.name}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {item.brand} - size {item.size} - {item.width} width - qty {item.quantity}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{currency.format(item.lineTotal)}</div>
              {item.quantity > 1 && (
                <div className="text-xs text-muted-foreground">
                  {currency.format(item.unitPrice)} each
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t bg-muted/40 px-4 py-3 font-semibold">
        <span>Subtotal</span>
        <span>{currency.format(props.subtotal)}</span>
      </div>
    </div>
  )
}
