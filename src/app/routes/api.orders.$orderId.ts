import { createFileRoute } from '@tanstack/react-router'
import { getOrder } from '#/lib/orders'
import { withSession } from '#/lib/session'

export const Route = createFileRoute('/api/orders/$orderId')({
  server: {
    handlers: {
      GET: ({ request, params }) =>
        withSession(request, () => {
          const order = getOrder(params.orderId)
          if (!order) {
            return new Response(JSON.stringify({ error: 'Order not found' }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' },
            })
          }
          return new Response(JSON.stringify(order), {
            headers: { 'Content-Type': 'application/json' },
          })
        }),
    },
  },
})
