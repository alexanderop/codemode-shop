import { skillToTool } from '@tanstack/ai-code-mode-skills'
import { toolsToBindings } from '@tanstack/ai-code-mode'
import { catalogTools } from '#/lib/tools/catalog-tools'
import { createStorefrontUIBindings } from '#/features/storefront/api/ui-bindings'
import type { ServerTool } from '@tanstack/ai'
import type { IsolateDriver } from '@tanstack/ai-code-mode'
import type { Skill, SkillStorage } from '@tanstack/ai-code-mode-skills'

export interface BuildStorefrontSkillToolOptions {
  skill: Skill
  driver: IsolateDriver
  storage: SkillStorage
  timeout?: number
  memoryLimit?: number
}

/**
 * Wraps the upstream skillToTool with the storefront's read-only catalog
 * external_* bindings plus the ui_* bindings — so a skill can both fetch and
 * render in one call. Cart/order tools are intentionally excluded (read-only
 * v1 enforcement).
 */
export function buildStorefrontSkillTool({
  skill,
  driver,
  storage,
  timeout = 30_000,
  memoryLimit = 128,
}: BuildStorefrontSkillToolOptions): ServerTool<any, any, any> {
  const bindings = {
    ...toolsToBindings(catalogTools, 'external_'),
    ...createStorefrontUIBindings(),
  }
  return skillToTool({ skill, driver, bindings, storage, timeout, memoryLimit })
}

export function buildStorefrontSkillTools(opts: {
  skills: Array<Skill>
  driver: IsolateDriver
  storage: SkillStorage
  timeout?: number
  memoryLimit?: number
}): Array<ServerTool<any, any, any>> {
  return opts.skills.map((skill) =>
    buildStorefrontSkillTool({
      skill,
      driver: opts.driver,
      storage: opts.storage,
      timeout: opts.timeout,
      memoryLimit: opts.memoryLimit,
    }),
  )
}
