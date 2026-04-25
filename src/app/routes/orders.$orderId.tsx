import { useEffect, useState } from 'react'
import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { SiteHeader } from '#/components/site-header'
import { OrderConfirmation } from '#/features/storefront/components/canvas/order-confirmation'
import type { OrderConfirmationProps } from '#/features/storefront/types/ui-types'

export const Route = createFileRoute('/orders/$orderId')({ component: OrderPage })

type ServerOrder = Omit<OrderConfirmationProps, 'orderId'> & { id: string }

type FetchState =
  | { status: 'loading' }
  | { status: 'ready'; order: OrderConfirmationProps }
  | { status: 'missing' }
  | { status: 'error'; message: string }

function OrderPage() {
  const { orderId } = useParams({ from: '/orders/$orderId' })
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`)
        if (cancelled) return
        if (res.status === 404) {
          setFetchState({ status: 'missing' })
          return
        }
        if (!res.ok) {
          setFetchState({ status: 'error', message: `HTTP ${res.status}` })
          return
        }
        const raw = (await res.json()) as ServerOrder
        const { id, ...rest } = raw
        const order: OrderConfirmationProps = { ...rest, orderId: id }
        if (!cancelled) setFetchState({ status: 'ready', order })
      } catch (err) {
        if (cancelled) return
        setFetchState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to load order',
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orderId])

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-12">
        {fetchState.status === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading order…
          </div>
        )}
        {fetchState.status === 'missing' && (
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
        {fetchState.status === 'error' && (
          <div className="surface space-y-3 p-8 text-center">
            <div className="font-semibold">Couldn't load order</div>
            <p className="text-sm text-muted-foreground">{fetchState.message}</p>
          </div>
        )}
        {fetchState.status === 'ready' && <OrderConfirmation {...fetchState.order} />}
      </main>
    </>
  )
}
