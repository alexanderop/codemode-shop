import { expect, test } from './test-utils'

test.describe('streaming convergence', () => {
  test('cassette duration and SSE shape reach the browser via MSW handler', async ({ page }) => {
    await page.goto('/')

    // `page.route` buffers the MSW response before fulfilling, so we assert
    // total duration and payload shape rather than incremental arrival.
    const result = await page.evaluate(async () => {
      const start = performance.now()
      const res = await fetch('/api/storefront-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'go slow please' }],
        }),
      })
      const text = await res.text()
      return {
        status: res.status,
        contentType: res.headers.get('content-type') ?? '',
        text,
        total: performance.now() - start,
      }
    })

    expect(result.status).toBe(200)
    expect(result.contentType).toContain('text/event-stream')
    // The slow-streaming cassette sums to ≥1130ms of inter-chunk delay.
    expect(result.total).toBeGreaterThanOrEqual(700)
    // The handler emits the slow-streaming chunks plus the [DONE] terminator.
    expect(result.text).toContain('storefront:ui')
    expect(result.text).toContain('[DONE]')
  })
})
