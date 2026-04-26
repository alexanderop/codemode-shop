import { setTimeout as sleep } from 'node:timers/promises'
import { http, HttpResponse } from 'msw'
import { chunkToSSE, pickCassette } from '../cassettes'

const ENCODER = new TextEncoder()
const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  Connection: 'close',
} as const

export const handlers = [
  // Wildcard prefix so the same handler matches both the e2e baseURL and the
  // synthetic Request URLs used by unit tests.
  http.post('*/api/storefront-agent', async ({ request }) => {
    const bodyText = await request.text()
    let body: unknown = undefined
    if (bodyText) {
      try {
        body = JSON.parse(bodyText)
      } catch {
        body = bodyText
      }
    }

    const cassette = pickCassette({ url: request.url, method: request.method, body })
    if (!cassette) {
      return HttpResponse.json(
        { error: 'no matching cassette', url: request.url, method: request.method },
        { status: 404 },
      )
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        /* oxlint-disable no-await-in-loop -- cassette playback is sequential by design */
        for (const chunk of cassette.chunks) {
          if (chunk.delayMs) await sleep(chunk.delayMs)
          controller.enqueue(ENCODER.encode(chunkToSSE(chunk)))
        }
        /* oxlint-enable no-await-in-loop */
        controller.enqueue(ENCODER.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new HttpResponse(stream, { status: 200, headers: SSE_HEADERS })
  }),
]
