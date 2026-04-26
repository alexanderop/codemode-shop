import type { StreamChunk } from '@tanstack/ai'

/**
 * Test-only helper: parses a fully-buffered SSE response body into
 * `StreamChunk`s. Skips the `[DONE]` sentinel and malformed frames.
 *
 * Production code does its own streaming parse inside `run-handler.ts`; this
 * util exists so cassette/handler tests can introspect the bytes their MSW
 * handlers emit without recreating the JSON-extraction loop.
 */
export function parseSSEChunks(buffer: string): Array<StreamChunk> {
  const out: Array<StreamChunk> = []
  for (const frame of buffer.split('\n\n')) {
    const dataLine = frame.split('\n').find((l) => l.startsWith('data:'))
    if (!dataLine) continue
    const json = dataLine.slice(5).trim()
    if (!json || json === '[DONE]') continue
    try {
      out.push(JSON.parse(json) as StreamChunk)
    } catch {
      continue
    }
  }
  return out
}
