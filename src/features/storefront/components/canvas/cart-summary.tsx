import { useState } from 'react'
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { currency } from '#/lib/format'
import { errorMessage } from '#/lib/utils'
import { uiStore } from '#/features/storefront/stores/ui-store'
import { useCart, useCartMutation } from '#/queries/cart'
import { cartLineKey } from '#/lib/cart-mutation'
import type { CartSummaryProps } from '#/features/storefront/types/ui-types'

function mountCheckoutForm(subtotal: number, lineCount: number) {
  uiStore.dispatch({
    op: 'add',
    id: 'checkout-form',
    type: 'checkoutForm',
    props: { subtotal, lineCount },
  })
}

export function CartSummary(_props: CartSummaryProps) {
  const cart = useCart()
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const cartMutation = useCartMutation()

  async function withPending(key: string, fn: () => Promise<unknown>) {
    setPendingKey(key)
    try {
      await fn()
    } catch (err) {
      toast.error(errorMessage(err, 'Cart update failed'))
    } finally {
      setPendingKey(null)
    }
  }

  if (cart.items.length === 0) {
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
          {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'}
        </div>
      </div>

      <div className="divide-y">
        {cart.items.map((item) => {
          const lineKey = cartLineKey(item.productId, item.size, item.width)
          const isPending = pendingKey === lineKey
          const setQty = (quantity: number) =>
            void withPending(lineKey, () =>
              cartMutation.mutateAsync({
                action: 'set',
                productId: item.productId,
                size: item.size,
                width: item.width,
                quantity,
              }),
            )
          const removeLine = () =>
            void withPending(lineKey, () =>
              cartMutation.mutateAsync({
                action: 'remove',
                productId: item.productId,
                size: item.size,
                width: item.width,
              }),
            )
          return (
            <div key={lineKey} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate font-medium leading-tight">{item.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {item.brand} · size {item.size} · {item.width}
                </div>
                <div className="mt-2 flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={isPending}
                    onClick={() => setQty(item.quantity - 1)}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="tabular w-6 text-center text-xs font-medium">
                    {item.quantity}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={isPending}
                    onClick={() => setQty(item.quantity + 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    disabled={isPending}
                    onClick={removeLine}
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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
          )
        })}
      </div>

      <div className="flex items-center justify-between border-t bg-muted/40 px-4 py-3 font-semibold">
        <span>Subtotal</span>
        <span>{currency.format(cart.subtotal)}</span>
      </div>
      <div className="border-t px-4 py-3">
        <Button
          type="button"
          className="w-full"
          onClick={() => mountCheckoutForm(cart.subtotal, cart.items.length)}
        >
          Proceed to checkout
        </Button>
      </div>
    </div>
  )
}
