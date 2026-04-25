import { createServer, type Server } from 'node:http'
import { setTimeout as sleep } from 'node:timers/promises'
import { chunkToSSE, pickCassette } from './index'

export interface CassetteServer {
  port: number
  url: string
  stop: () => Promise<void>
  hits: () => number
  matched: () => ReadonlyArray<string>
}

export async function startCassetteServer({
  port = 0,
}: { port?: number } = {}): Promise<CassetteServer> {
  let hitCount = 0
  const matchedNames: Array<string> = []

  const server: Server = createServer((req, res) => {
    void (async () => {
      const parts: Array<Buffer> = []
      req.on('data', (c: Buffer) => parts.push(c))
      await new Promise<void>((resolve, reject) => {
        req.on('end', () => resolve())
        req.on('error', reject)
      })

      const url = req.url ?? '/'
      const method = req.method ?? 'GET'
      const bodyText = Buffer.concat(parts).toString('utf8')
      let body: unknown = undefined
      if (bodyText) {
        try {
          body = JSON.parse(bodyText)
        } catch {
          body = bodyText
        }
      }

      const cassette = pickCassette({ url: `http://localhost${url}`, method, body })
      if (!cassette) {
        res.statusCode = 404
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'no matching cassette', url, method }))
        return
      }

      hitCount += 1
      matchedNames.push(cassette.name)

      res.statusCode = 200
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Connection', 'close')
      res.flushHeaders()

      /* oxlint-disable no-await-in-loop -- cassette playback is sequential by design */
      for (const chunk of cassette.chunks) {
        if (chunk.delayMs) await sleep(chunk.delayMs)
        res.write(chunkToSSE(chunk))
      }
      /* oxlint-enable no-await-in-loop */
      res.end('data: [DONE]\n\n')
    })()
  })

  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))
  const address = server.address()
  const actualPort = typeof address === 'object' && address ? address.port : port

  return {
    port: actualPort,
    url: `http://127.0.0.1:${actualPort}`,
    hits: () => hitCount,
    matched: () => matchedNames.slice(),
    stop: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()))
      }),
  }
}
