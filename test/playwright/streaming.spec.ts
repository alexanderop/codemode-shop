import { expect, test } from './test-utils'

test.describe('streaming convergence', () => {
  test('cassette server progressively streams chunks (proves SSE round-trip)', async ({ page }) => {
    const cassetteUrl = process.env.CASSETTE_SERVER_URL
    test.skip(!cassetteUrl, 'cassette server not running')
    if (!cassetteUrl) return

    await page.goto('/')

    // Drive the cassette server directly from the page context to exercise
    // the streaming path in a real browser fetch implementation.
    const result = await page.evaluate(async (url: string) => {
      const res = await fetch(`${url}/api/storefront-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'go slow please' }],
        }),
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      const arrivals: Array<{ at: number; bytes: number }> = []
      const start = performance.now()

      /* oxlint-disable no-await-in-loop -- SSE reader is inherently sequential */
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        arrivals.push({ at: performance.now() - start, bytes: text.length })
      }
      /* oxlint-enable no-await-in-loop */

      return { arrivals, total: performance.now() - start, status: res.status }
    }, cassetteUrl)

    expect(result.status).toBe(200)
    expect(result.arrivals.length).toBeGreaterThanOrEqual(2)
    // The slow-streaming cassette has ≥800ms of delay across its chunks.
    expect(result.total).toBeGreaterThanOrEqual(700)
  })
})
