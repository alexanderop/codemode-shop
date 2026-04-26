// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { getResponse } from 'msw'
import { handlers } from '../../msw/handlers'
import { parseSSEChunks } from '../../sse'

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/storefront-agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Mirrors the wire shape that `@tanstack/ai-client`'s `useChat` actually sends:
// the user message is `{ role, parts: [{ type: 'text', content }] }`, not
// `{ role, content }`. Tests must use this shape so cassette matchers stay honest.
function userMessage(text: string) {
  return { role: 'user', parts: [{ type: 'text', content: text }] }
}

describe('MSW storefront-agent handler', () => {
  it('returns 404 for unmatched cassettes', async () => {
    const res = await getResponse(handlers, makeRequest({ messages: [] }))
    expect(res?.status).toBe(404)
    const json = (await res?.json()) as { error: string; method: string }
    expect(json.error).toBe('no matching cassette')
    expect(json.method).toBe('POST')
  })

  it('streams the happy-search-recommend cassette as SSE chunks', async () => {
    const res = await getResponse(
      handlers,
      makeRequest({ messages: [userMessage('show me running shoes')] }),
    )
    expect(res?.status).toBe(200)
    expect(res?.headers.get('content-type')).toContain('text/event-stream')

    const text = await res!.text()
    const frames = parseSSEChunks(text)
    const types = frames.map((f) => `${f.type}${'name' in f ? `:${f.name}` : ''}`)

    expect(types).toEqual([
      'TEXT_MESSAGE_CONTENT',
      'CUSTOM:storefront:ui',
      'CUSTOM:storefront:ui',
      'TEXT_MESSAGE_CONTENT',
    ])
  })

  it('selects the slow-streaming cassette by request body match', async () => {
    const res = await getResponse(
      handlers,
      makeRequest({ messages: [userMessage('go slow please')] }),
    )
    const text = await res!.text()
    const frames = parseSSEChunks(text)
    const ids = frames
      .filter((f) => f.type === 'CUSTOM' && f.name === 'storefront:ui')
      .map((f) => (f.value as { id?: string }).id)
    expect(ids).toContain('l1')
    expect(ids).toContain('cta')
  })

  it('honors per-chunk delays during stream playback', async () => {
    const start = Date.now()
    const res = await getResponse(
      handlers,
      makeRequest({ messages: [userMessage('go slow please')] }),
    )
    await res!.text()
    // slow-streaming sums to ~1130ms total inter-chunk delay
    expect(Date.now() - start).toBeGreaterThanOrEqual(800)
  })

  it('still matches the legacy { role, content } shape', async () => {
    const res = await getResponse(
      handlers,
      makeRequest({ messages: [{ role: 'user', content: 'show me running shoes' }] }),
    )
    expect(res?.status).toBe(200)
  })
})
