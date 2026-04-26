import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EventType, type StreamChunk } from '@tanstack/ai'
import type { DetailedCart } from '#/lib/cart'
import { uiStore } from '#/features/storefront/stores/ui-store'
import { clientCart } from '#/stores/client-cart'
import { runHandler, type HandlerRequest } from '#/features/storefront/api/run-handler'

const REQ: HandlerRequest = {
  handlerId: 'addToCart',
  payload: { productId: 'p1', size: '10', width: 'standard', quantity: 1 },
  zipCode: '94107',
}

const CART_AFTER_ADD: DetailedCart = {
  items: [
    {
      productId: 'p1',
      name: 'Sneaker',
      brand: 'Brand',
      imageUrl: '',
      size: '10',
      width: 'standard',
      quantity: 1,
      unitPrice: 100,
      lineTotal: 100,
    },
  ],
  itemCount: 1,
  subtotal: 100,
}

const REFRESHED_CART: DetailedCart = {
  items: CART_AFTER_ADD.items,
  itemCount: 1,
  subtotal: 100,
}

const encoder = new TextEncoder()

function frame(chunk: StreamChunk): string {
  return `data: ${JSON.stringify(chunk)}\n\n`
}

function streamingResponse(chunks: ReadonlyArray<string>): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c))
      controller.close()
    },
  })
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

interface Routes {
  handler?: () => Response | Promise<Response>
  cartGet?: () => Response | Promise<Response>
}

function installFetch(routes: Routes) {
  const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = (init?.method ?? 'GET').toUpperCase()
    if (url === '/api/storefront-handler' && method === 'POST') {
      if (!routes.handler) throw new Error('No handler route configured')
      return routes.handler()
    }
    if (url === '/api/cart' && method === 'GET') {
      if (!routes.cartGet) throw new Error('No cartGet route configured')
      return routes.cartGet()
    }
    throw new Error(`Unexpected fetch in test: ${method} ${url}`)
  })
  globalThis.fetch = mock as typeof fetch
  return mock
}

describe('runHandler', () => {
  let originalFetch: typeof fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('should dispatch storefront:ui frames to uiStore when the stream emits them', async () => {
    installFetch({
      handler: () =>
        streamingResponse([
          frame({
            type: EventType.CUSTOM,
            name: 'storefront:ui',
            value: {
              op: 'add',
              id: 'cta-1',
              type: 'ctaButton',
              props: {
                label: 'Add to cart',
                handlerId: 'addToCart',
                payload: { productId: 'p1', size: '10' },
              },
            },
          }),
          frame({ type: EventType.CUSTOM, name: 'cart:update', value: CART_AFTER_ADD }),
        ]),
    })

    await runHandler(REQ)

    expect(uiStore.get().nodes.has('cta-1')).toBe(true)
  })

  it('should set clientCart from cart:update frames and skip the refresh fetch', async () => {
    const fetchMock = installFetch({
      handler: () =>
        streamingResponse([
          frame({ type: EventType.CUSTOM, name: 'cart:update', value: CART_AFTER_ADD }),
          frame({ type: EventType.TEXT_MESSAGE_CONTENT, messageId: 'm1', delta: 'done' }),
        ]),
    })

    await runHandler(REQ)

    expect(clientCart.get()).toEqual(CART_AFTER_ADD)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/storefront-handler', expect.anything())
  })

  it('should fall back to GET /api/cart when the stream finishes without cart:update', async () => {
    const fetchMock = installFetch({
      handler: () =>
        streamingResponse([
          frame({
            type: EventType.CUSTOM,
            name: 'storefront:ui',
            value: {
              op: 'update',
              id: 'cta',
              props: { label: 'Out of stock', variant: 'secondary' },
            },
          }),
          frame({ type: EventType.TEXT_MESSAGE_CONTENT, messageId: 'm1', delta: 'sorry' }),
        ]),
      cartGet: () =>
        new Response(JSON.stringify(REFRESHED_CART), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    })

    await runHandler(REQ)

    expect(fetchMock).toHaveBeenCalledWith('/api/cart')
    expect(clientCart.get()).toEqual(REFRESHED_CART)
  })

  it('should accumulate TEXT_MESSAGE_CONTENT deltas and trim the returned string', async () => {
    installFetch({
      handler: () =>
        streamingResponse([
          frame({ type: EventType.TEXT_MESSAGE_CONTENT, messageId: 'm1', delta: '  added ' }),
          frame({ type: EventType.TEXT_MESSAGE_CONTENT, messageId: 'm1', delta: 'one item ' }),
          frame({ type: EventType.CUSTOM, name: 'cart:update', value: CART_AFTER_ADD }),
        ]),
    })

    const text = await runHandler(REQ)

    expect(text).toBe('added one item')
  })

  it('should reassemble a single SSE frame split across two stream reads', async () => {
    const full = frame({ type: EventType.CUSTOM, name: 'cart:update', value: CART_AFTER_ADD })
    const cut = Math.floor(full.length / 2)
    installFetch({
      handler: () => streamingResponse([full.slice(0, cut), full.slice(cut)]),
    })

    await runHandler(REQ)

    expect(clientCart.get()).toEqual(CART_AFTER_ADD)
  })

  it('should throw when the response is not OK', async () => {
    installFetch({
      handler: () => new Response('boom', { status: 500 }),
    })

    await expect(runHandler(REQ)).rejects.toThrow(/Handler failed: 500/)
  })

  it('should silently skip malformed JSON frames between valid ones', async () => {
    installFetch({
      handler: () =>
        streamingResponse([
          'data: not-json\n\n',
          frame({ type: EventType.CUSTOM, name: 'cart:update', value: CART_AFTER_ADD }),
        ]),
    })

    await runHandler(REQ)

    expect(clientCart.get()).toEqual(CART_AFTER_ADD)
  })
})
