import type { StreamChunk } from '@tanstack/ai'

export interface ParsedSSE {
  frames: Array<StreamChunk>
  remainder: string
}

/**
 * Parse a buffer of SSE frames into StreamChunks.
 *
 * Returns the chunks decoded from complete frames (`data: ...\n\n`) and the
 * trailing partial frame as `remainder` so the caller can prepend it to the
 * next read. Malformed JSON, empty data, and the `[DONE]` sentinel are
 * silently skipped.
 */
export function parseSSEFrames(buffer: string): ParsedSSE {
  const split = buffer.split('\n\n')
  const remainder = split.pop() ?? ''
  const frames: Array<StreamChunk> = []

  for (const frame of split) {
    const dataLine = frame.split('\n').find((l) => l.startsWith('data:'))
    if (!dataLine) continue
    const json = dataLine.slice(5).trim()
    if (!json || json === '[DONE]') continue
    try {
      frames.push(JSON.parse(json) as StreamChunk)
    } catch {
      continue
    }
  }

  return { frames, remainder }
}
