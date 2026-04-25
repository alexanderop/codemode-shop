import { uiStore } from '#/features/storefront/stores/ui-store'
import { clientCart } from '#/stores/client-cart'
import type { DetailedCart } from '#/lib/cart'
import type { Width } from '#/lib/catalog'
import { parseSSEFrames } from './sse-parser'
import type { UIEvent } from '#/features/storefront/types/ui-types'

export interface HandlerRequest {
  handlerId: 'addToCart'
  payload: {
    productId: string
    size: string
    width?: Width
    quantity?: number
  }
  zipCode?: string
}

export async function runHandler(req: HandlerRequest, signal?: AbortSignal): Promise<string> {
  const res = await fetch('/api/storefront-handler', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  })
  if (!res.ok || !res.body) {
    throw new Error(`Handler failed: ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let assistantText = ''
  let cartPushed = false

  /* oxlint-disable no-await-in-loop -- SSE reader is sequential by definition */
  while (true) {
    if (signal?.aborted) {
      await reader.cancel()
      return assistantText.trim()
    }

    let result: ReadableStreamReadResult<Uint8Array>
    try {
      result = await reader.read()
    } catch (err) {
      if (signal?.aborted) return assistantText.trim()
      throw err
    }
    if (signal?.aborted) {
      await reader.cancel()
      return assistantText.trim()
    }

    const { done, value } = result
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const parsed = parseSSEFrames(buffer)
    buffer = parsed.remainder

    for (const chunk of parsed.frames) {
      switch (chunk.type) {
        case 'CUSTOM':
          if (chunk.name === 'storefront:ui') {
            uiStore.dispatch(chunk.value as UIEvent)
          } else if (chunk.name === 'cart:update') {
            clientCart.set(chunk.value as DetailedCart)
            cartPushed = true
          }
          break
        case 'TEXT_MESSAGE_CONTENT':
          assistantText += chunk.delta
          break
        default:
          break
      }
    }
  }
  /* oxlint-enable no-await-in-loop */

  if (!cartPushed) {
    await clientCart.refresh()
  }

  return assistantText.trim()
}
