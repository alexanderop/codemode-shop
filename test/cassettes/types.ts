import type { UIEvent } from '#/features/storefront/types/ui-types'

/**
 * A `Cassette` is a recorded SSE response for the storefront pipeline.
 *
 * It captures the chunks the client (`run-handler.ts` for the handler route,
 * `useChat` for the agent route) will receive and re-emit them with realistic
 * inter-chunk delays during tests. The cassette is the unit of replay shared
 * between hand-authored fixtures and (eventually) recorded real-LLM runs.
 */
export interface Cassette {
  name: string
  route: '/api/storefront-agent' | '/api/storefront-handler'
  match?: (request: { url: string; method: string; body: unknown }) => boolean
  chunks: ReadonlyArray<CassetteChunk>
}

export type CassetteChunk =
  | { type: 'text'; delta: string; delayMs?: number }
  | { type: 'ui'; event: UIEvent; delayMs?: number }
  | { type: 'cart'; cart: unknown; delayMs?: number }
  | { type: 'raw'; data: string; delayMs?: number }

export function chunkToSSE(chunk: CassetteChunk): string {
  if (chunk.type === 'raw') return chunk.data.endsWith('\n\n') ? chunk.data : `${chunk.data}\n\n`
  const value =
    chunk.type === 'text'
      ? { type: 'TEXT_MESSAGE_CONTENT', delta: chunk.delta }
      : chunk.type === 'ui'
        ? { type: 'CUSTOM', name: 'storefront:ui', value: chunk.event }
        : { type: 'CUSTOM', name: 'cart:update', value: chunk.cart }
  return `data: ${JSON.stringify(value)}\n\n`
}
