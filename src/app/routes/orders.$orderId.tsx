import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { SiteHeader } from '#/components/site-header'
import { OrderConfirmation } from '#/features/storefront/components/canvas/order-confirmation'
import { orderQueryOptions, OrderNotFoundError } from '#/queries/cart'

export const Route = createFileRoute('/orders/$orderId')({
  component: OrderPage,
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(orderQueryOptions(params.orderId))
  },
})

function OrderPage() {
  const { orderId } = useParams({ from: '/orders/$orderId' })
  const { data, isPending, error } = useQuery(orderQueryOptions(orderId))

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-12">
        {isPending && (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading order…
          </div>
        )}
        {error instanceof OrderNotFoundError && (
          <div className="surface space-y-3 p-8 text-center">
            <div className="font-semibold">Order not found</div>
            <p className="text-sm text-muted-foreground">
              This order may have expired (state resets on server restart).
            </p>
            <Button asChild>
              <Link to="/">Back home</Link>
            </Button>
          </div>
        )}
        {error && !(error instanceof OrderNotFoundError) && (
          <div className="surface space-y-3 p-8 text-center">
            <div className="font-semibold">Couldn't load order</div>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
        )}
        {data && <OrderConfirmation {...data} />}
      </main>
    </>
  )
}
