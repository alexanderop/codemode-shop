import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, ShoppingBag } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { SiteHeader } from '#/components/site-header'
import { CheckoutForm } from '#/features/storefront/components/canvas/checkout-form'
import { useCart } from '#/queries/cart'

export const Route = createFileRoute('/checkout')({ component: CheckoutPage })

function CheckoutPage() {
  const cart = useCart()

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-12">
        {cart.items.length === 0 ? (
          <div className="surface space-y-3 p-8 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" />
            <div className="font-semibold">Nothing to check out</div>
            <p className="text-sm text-muted-foreground">Add some shoes to your cart first.</p>
            <Button asChild>
              <Link to="/">Browse the drop</Link>
            </Button>
          </div>
        ) : (
          <>
            <Link
              to="/cart"
              className="text-tag mb-6 inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to cart
            </Link>
            <h1 className="display-title mb-8 text-4xl">Checkout</h1>
            <CheckoutForm subtotal={cart.subtotal} lineCount={cart.items.length} />
          </>
        )}
      </main>
    </>
  )
}
