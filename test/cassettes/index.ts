import { cassette as happyCassette } from './happy-search-recommend'
import { cassette as slowCassette } from './slow-streaming'
import type { Cassette } from './types'

export const cassettes: ReadonlyArray<Cassette> = [happyCassette, slowCassette]

export interface CassetteRequest {
  url: string
  method: string
  body: unknown
}

export function pickCassette(req: CassetteRequest): Cassette | null {
  const route = new URL(req.url, 'http://localhost').pathname
  for (const c of cassettes) {
    if (c.route !== route) continue
    if (c.match && !c.match(req)) continue
    return c
  }
  return null
}

export type { Cassette } from './types'
export { chunkToSSE } from './types'
