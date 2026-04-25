import { describe, expect, it } from 'vitest'
import { parseSSEFrames } from './sse-parser'

const frame = (json: string) => `data: ${json}\n\n`

describe('parseSSEFrames', () => {
  it('returns empty result for empty buffer', () => {
    const { frames, remainder } = parseSSEFrames('')
    expect(frames).toEqual([])
    expect(remainder).toBe('')
  })

  it('parses a single complete frame', () => {
    const buf = frame(JSON.stringify({ type: 'TEXT_MESSAGE_CONTENT', delta: 'hi' }))
    const { frames, remainder } = parseSSEFrames(buf)
    expect(frames).toEqual([{ type: 'TEXT_MESSAGE_CONTENT', delta: 'hi' }])
    expect(remainder).toBe('')
  })

  it('parses multiple frames in one buffer', () => {
    const buf =
      frame(JSON.stringify({ type: 'TEXT_MESSAGE_CONTENT', delta: 'a' })) +
      frame(JSON.stringify({ type: 'TEXT_MESSAGE_CONTENT', delta: 'b' }))
    const { frames, remainder } = parseSSEFrames(buf)
    expect(frames).toHaveLength(2)
    expect(remainder).toBe('')
  })

  it('returns the trailing partial as remainder', () => {
    const partial = `data: ${JSON.stringify({ type: 'TEXT_MESSAGE_CONTENT', delta: 'half' })}`
    const buf = frame(JSON.stringify({ type: 'TEXT_MESSAGE_CONTENT', delta: 'first' })) + partial
    const { frames, remainder } = parseSSEFrames(buf)
    expect(frames).toHaveLength(1)
    expect(remainder).toBe(partial)
  })

  it('handles partial frames split across reads', () => {
    const json = JSON.stringify({ type: 'TEXT_MESSAGE_CONTENT', delta: 'whole' })
    // First read: data: {"type":"TEXT_MESS
    const part1 = `data: ${json.slice(0, 16)}`
    const r1 = parseSSEFrames(part1)
    expect(r1.frames).toEqual([])
    // Second read: …rest of JSON, then \n\n
    const part2 = json.slice(16) + '\n\n'
    const r2 = parseSSEFrames(r1.remainder + part2)
    expect(r2.frames).toEqual([{ type: 'TEXT_MESSAGE_CONTENT', delta: 'whole' }])
    expect(r2.remainder).toBe('')
  })

  it('skips the [DONE] sentinel', () => {
    const buf =
      frame(JSON.stringify({ type: 'TEXT_MESSAGE_CONTENT', delta: 'x' })) + 'data: [DONE]\n\n'
    const { frames } = parseSSEFrames(buf)
    expect(frames).toHaveLength(1)
  })

  it('skips frames with no data: line', () => {
    const buf =
      ': comment-only frame\n\n' +
      frame(JSON.stringify({ type: 'TEXT_MESSAGE_CONTENT', delta: 'y' }))
    const { frames } = parseSSEFrames(buf)
    expect(frames).toHaveLength(1)
  })

  it('skips malformed JSON without throwing', () => {
    const buf =
      'data: not-json\n\n' + frame(JSON.stringify({ type: 'TEXT_MESSAGE_CONTENT', delta: 'z' }))
    const { frames } = parseSSEFrames(buf)
    expect(frames).toHaveLength(1)
    expect(frames[0]).toEqual({ type: 'TEXT_MESSAGE_CONTENT', delta: 'z' })
  })

  it('handles a CUSTOM event with structured value', () => {
    const buf = frame(
      JSON.stringify({
        type: 'CUSTOM',
        name: 'storefront:ui',
        value: { op: 'add', id: 'p1', type: 'productCard' },
      }),
    )
    const { frames } = parseSSEFrames(buf)
    expect(frames[0]).toMatchObject({ type: 'CUSTOM', name: 'storefront:ui' })
  })
})
