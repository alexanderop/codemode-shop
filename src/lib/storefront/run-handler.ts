import { uiStore } from './ui-store'
import { clientCart } from '#/lib/client-cart'
import type { StreamChunk } from '@tanstack/ai'
import type { UIEvent } from './ui-types'

export interface HandlerRequest {
  handlerId: 'addToCart'
  payload: {
    productId: string
    size: string
    width?: 'narrow' | 'standard' | 'wide'
    quantity?: number
  }
  zipCode?: string
}

/**
 * Fire a CTA click at /api/storefront-handler and apply the streamed UI/cart
 * events as they arrive. Returns the shopper-facing confirmation text.
 */
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

    const frames = buffer.split('\n\n')
    buffer = frames.pop() ?? ''

    for (const frame of frames) {
      const dataLine = frame.split('\n').find((l) => l.startsWith('data:'))
      if (!dataLine) continue
      const json = dataLine.slice(5).trim()
      if (!json || json === '[DONE]') continue
      let chunk: StreamChunk
      try {
        chunk = JSON.parse(json) as StreamChunk
      } catch {
        continue
      }

      switch (chunk.type) {
        case 'CUSTOM':
          if (chunk.name === 'storefront:ui') {
            uiStore.dispatch(chunk.value as UIEvent)
          } else if (chunk.name === 'cart:update') {
            const v = chunk.value as { itemCount?: number }
            if (typeof v.itemCount === 'number') clientCart.set(v.itemCount)
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

  return assistantText.trim()
}
