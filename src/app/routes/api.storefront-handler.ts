// Raw file-based route: returns a multi-frame ReadableStream (storefront:ui +
// optional cart:update + text frame) parsed manually by `run-handler.ts`.
// Streaming protocol, not RPC — stays raw. See [[brain/architecture/client-server-rpc]].
import { createFileRoute } from '@tanstack/react-router'
import { addToCart, getCartDetailed, type DetailedCart } from '#/lib/cart'
import { PRODUCT_BY_ID, findStock, shippingEtaDays, type Width } from '#/lib/catalog'
import { withSession } from '#/lib/session'
import type { UIEvent } from '#/features/storefront/types/ui-types'
import type { HandlerRequest } from '#/features/storefront/api/run-handler'

interface ResolvedHandler {
  uiEvent: UIEvent
  cart: DetailedCart | null
  message: string
}

function resolveAddToCart(payload: HandlerRequest['payload'], zipCode: string): ResolvedHandler {
  const width: Width = payload.width ?? 'standard'
  const quantity = payload.quantity ?? 1
  const product = PRODUCT_BY_ID.get(payload.productId)
  const stock = findStock(payload.productId, payload.size, width)
  const inStock = product != null && (stock?.quantity ?? 0) >= quantity

  if (!inStock) {
    return {
      uiEvent: {
        op: 'update',
        id: 'cta',
        props: { label: 'Out of stock', variant: 'secondary' },
      },
      cart: null,
      message: product
        ? `Sorry, the ${product.name} in size ${payload.size} (${width}) is out of stock.`
        : 'Sorry, that product is no longer available.',
    }
  }

  addToCart({ productId: payload.productId, size: payload.size, width, quantity })
  const cart = getCartDetailed()
  const arrival = new Date()
  arrival.setDate(arrival.getDate() + shippingEtaDays(zipCode))
  const arrivesBy = arrival.toISOString().slice(0, 10)
  return {
    uiEvent: {
      op: 'update',
      id: 'cta',
      props: { label: 'Added to cart', variant: 'secondary' },
    },
    cart,
    message: `Added ${product.name} (size ${payload.size}, ${width}) to your cart — arrives by ${arrivesBy}.`,
  }
}

function buildEventStream(resolved: ResolvedHandler): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const frames: Array<Record<string, unknown>> = [
    { type: 'CUSTOM', name: 'storefront:ui', value: resolved.uiEvent },
  ]
  if (resolved.cart) {
    frames.push({ type: 'CUSTOM', name: 'cart:update', value: resolved.cart })
  }
  frames.push({
    type: 'TEXT_MESSAGE_CONTENT',
    messageId: crypto.randomUUID(),
    delta: resolved.message,
  })

  return new ReadableStream({
    start(controller) {
      for (const frame of frames) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(frame)}\n\n`))
      }
      controller.close()
    },
  })
}

export const Route = createFileRoute('/api/storefront-handler')({
  server: {
    handlers: {
      POST: ({ request }) =>
        withSession(request, async () => {
          if (request.signal.aborted) return new Response(null, { status: 499 })

          const { handlerId, payload, zipCode } = (await request.json()) as HandlerRequest
          if (handlerId !== 'addToCart') {
            return new Response(`Unknown handlerId: ${String(handlerId)}`, { status: 400 })
          }

          const resolved = resolveAddToCart(payload, zipCode ?? '94107')
          return new Response(buildEventStream(resolved), {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
            },
          })
        }),
    },
  },
})
