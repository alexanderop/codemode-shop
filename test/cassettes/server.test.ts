// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { startCassetteServer, type CassetteServer } from './server'
import { parseSSEFrames } from '#/features/storefront/api/sse-parser'

let server: CassetteServer

beforeEach(async () => {
  server = await startCassetteServer({ port: 0 })
})

afterEach(async () => {
  await server.stop()
})

describe('cassette server', () => {
  it('returns 404 for unknown route', async () => {
    const res = await fetch(`${server.url}/api/unknown`, {
      method: 'POST',
      body: JSON.stringify({ messages: [] }),
    })
    expect(res.status).toBe(404)
  })

  it('streams the happy-search-recommend cassette as SSE chunks', async () => {
    const res = await fetch(`${server.url}/api/storefront-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'show me running shoes' }],
      }),
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')

    const text = await res.text()
    const { frames } = parseSSEFrames(text)
    const types = frames.map((f) => `${f.type}${'name' in f ? `:${f.name}` : ''}`)

    expect(types).toEqual([
      'TEXT_MESSAGE_CONTENT',
      'CUSTOM:storefront:ui',
      'CUSTOM:storefront:ui',
      'TEXT_MESSAGE_CONTENT',
    ])
    expect(server.hits()).toBe(1)
    expect(server.matched()).toEqual(['happy-search-recommend'])
  })

  it('selects the slow-streaming cassette by message match', async () => {
    const res = await fetch(`${server.url}/api/storefront-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'go slow please' }],
      }),
    })
    const text = await res.text()
    const { frames } = parseSSEFrames(text)
    const ids = frames
      .filter((f) => f.type === 'CUSTOM' && f.name === 'storefront:ui')
      .map((f) => (f.value as { id?: string }).id)
    expect(ids).toContain('l1')
    expect(ids).toContain('cta')
    expect(server.matched()).toEqual(['slow-streaming'])
  })

  it('respects per-chunk delays (timing honored)', async () => {
    const start = Date.now()
    const res = await fetch(`${server.url}/api/storefront-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'go slow please' }],
      }),
    })
    await res.text()
    // slow-streaming sums to ~1130ms total inter-chunk delay
    expect(Date.now() - start).toBeGreaterThanOrEqual(800)
  })
})
