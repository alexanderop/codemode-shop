import { join } from 'node:path'
import { createFileSkillStorage } from '@tanstack/ai-code-mode-skills/storage'
import type { SkillStorage } from '@tanstack/ai-code-mode-skills'
import type { SessionId } from '#/lib/session-context'

const SKILLS_ROOT = join(process.cwd(), '.skills', 'users')

const cache = new Map<SessionId, SkillStorage>()

export function getSkillStorageForSession(sessionId: SessionId): SkillStorage {
  let storage = cache.get(sessionId)
  if (!storage) {
    storage = createFileSkillStorage({ directory: join(SKILLS_ROOT, sessionId) })
    cache.set(sessionId, storage)
  }
  return storage
}

export function getSkillStorageRoot(): string {
  return SKILLS_ROOT
}

export function getSkillStorageDirectoryFor(sessionId: SessionId): string {
  return join(SKILLS_ROOT, sessionId)
}
