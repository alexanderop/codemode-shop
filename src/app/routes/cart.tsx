import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { currency } from '#/lib/format'
import { errorMessage } from '#/lib/utils'
import { SiteHeader } from '#/components/site-header'
import { clientCart, useCart } from '#/stores/client-cart'
import { assistantUi } from '#/stores/assistant-ui'
import { cartLineKey } from '#/lib/cart-key'

export const Route = createFileRoute('/cart')({ component: CartPage })

function CartPage() {
  const cart = useCart()
  const [pendingKey, setPendingKey] = useState<string | null>(null)

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

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link
          to="/"
          className="text-tag mb-6 inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Continue shopping
        </Link>

        <h1 className="display-title mb-8 text-4xl">Your cart</h1>

        {cart.items.length === 0 ? (
          <div className="surface space-y-3 p-8 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" />
            <div className="font-semibold">Your cart is empty</div>
            <p className="text-sm text-muted-foreground">
              Browse the drop or ask the Storekeeper for a recommendation.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Button asChild>
                <Link to="/">Browse</Link>
              </Button>
              <Button variant="outline" onClick={assistantUi.open}>
                Ask Storekeeper
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="surface divide-y overflow-hidden">
              {cart.items.map((item) => {
                const lineKey = cartLineKey(item.productId, item.size, item.width)
                const isPending = pendingKey === lineKey
                return (
                  <div key={lineKey} className="flex items-center gap-4 p-4">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-20 w-20 flex-shrink-0 rounded-md bg-surface-3 object-cover"
                        loading="lazy"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold leading-tight">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.brand} · size {item.size} · {item.width}
                      </div>
                      <div className="mt-2 flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={isPending}
                          onClick={() =>
                            void withPending(lineKey, () =>
                              clientCart.mutate({
                                action: 'set',
                                productId: item.productId,
                                size: item.size,
                                width: item.width,
                                quantity: item.quantity - 1,
                              }),
                            )
                          }
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
                          onClick={() =>
                            void withPending(lineKey, () =>
                              clientCart.mutate({
                                action: 'set',
                                productId: item.productId,
                                size: item.size,
                                width: item.width,
                                quantity: item.quantity + 1,
                              }),
                            )
                          }
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="ml-1 h-7 w-7 text-muted-foreground hover:text-destructive"
                          disabled={isPending}
                          onClick={() =>
                            void withPending(lineKey, () =>
                              clientCart.mutate({
                                action: 'remove',
                                productId: item.productId,
                                size: item.size,
                                width: item.width,
                              }),
                            )
                          }
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

            <aside className="surface h-fit space-y-4 p-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Subtotal ({cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'})
                </span>
                <span className="font-semibold">{currency.format(cart.subtotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Shipping and taxes are calculated at checkout.
              </p>
              <Button asChild className="w-full">
                <Link to="/checkout">Proceed to checkout</Link>
              </Button>
            </aside>
          </div>
        )}
      </main>
    </>
  )
}
