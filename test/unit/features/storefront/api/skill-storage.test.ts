// @vitest-environment node
import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createFileSkillStorage } from '@tanstack/ai-code-mode-skills/storage'
import type { Skill } from '@tanstack/ai-code-mode-skills'

function makeSkill(overrides: Partial<Skill> = {}): Omit<Skill, 'createdAt' | 'updatedAt'> {
  return {
    id: 'sk-1',
    name: 'demo_skill',
    description: 'demo',
    code: 'return 1',
    inputSchema: { type: 'object', properties: {} },
    outputSchema: { type: 'number' },
    usageHints: [],
    dependsOn: [],
    trustLevel: 'trusted',
    stats: { executions: 0, successRate: 0 },
    ...overrides,
  }
}

describe('getSkillStorageForSession', () => {
  let tempRoot: string
  let originalCwd: string

  beforeAll(async () => {
    originalCwd = process.cwd()
    tempRoot = await mkdtemp(join(tmpdir(), 'skill-storage-test-'))
    process.chdir(tempRoot)
  })

  afterAll(async () => {
    process.chdir(originalCwd)
    await rm(tempRoot, { recursive: true, force: true })
  })

  it('namespaces by sessionId — two sessions see disjoint skill lists', async () => {
    const { getSkillStorageForSession } = await import('#/features/storefront/api/skill-storage')
    const a = getSkillStorageForSession('alpha' as never)
    const b = getSkillStorageForSession('beta' as never)

    await a.save(makeSkill({ id: 'sk-a', name: 'alpha_only' }))

    const aIndex = await a.loadIndex()
    const bIndex = await b.loadIndex()

    expect(aIndex.map((e) => e.name)).toEqual(['alpha_only'])
    expect(bIndex).toEqual([])
  })

  it('lazy-creates the storage directory on first write', async () => {
    const { getSkillStorageForSession, getSkillStorageDirectoryFor } =
      await import('#/features/storefront/api/skill-storage')
    const sessionId = 'lazy-session' as never
    const dir = getSkillStorageDirectoryFor(sessionId)
    expect(existsSync(dir)).toBe(false)

    const storage = getSkillStorageForSession(sessionId)
    await storage.save(makeSkill({ id: 'sk-lazy', name: 'lazy_skill' }))
    expect(existsSync(dir)).toBe(true)
  })

  it('writes under .skills/users/<sessionId> matching upstream file layout', async () => {
    // Spot-check by directly using upstream factory at the same location
    const sessionId = 'layout-check' as never
    const { getSkillStorageDirectoryFor, getSkillStorageForSession } =
      await import('#/features/storefront/api/skill-storage')
    const dir = getSkillStorageDirectoryFor(sessionId)
    const storage = getSkillStorageForSession(sessionId)
    await storage.save(makeSkill({ id: 'sk-l', name: 'layout' }))

    // Same directory, opened via upstream factory directly, should yield the same skill
    const upstream = createFileSkillStorage({ directory: dir })
    const found = await upstream.loadIndex()
    expect(found.map((e) => e.name)).toContain('layout')
  })
})
