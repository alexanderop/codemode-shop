import { createCodeMode, toolsToBindings } from '@tanstack/ai-code-mode'
import type { IsolateDriver, ToolBinding } from '@tanstack/ai-code-mode'
import { catalogTools, createSessionScopedCatalogTools } from '#/lib/tools/catalog-tools'
import { createStorefrontUIBindings } from '#/features/storefront/api/ui-bindings'
import type { SessionId } from '#/lib/session-context'

export interface BuildCodeModeOptions {
  driver: IsolateDriver
  sessionId: SessionId
  timeout: number
  extraBindings?: Record<string, ToolBinding>
}

export function buildStorefrontCodeMode({
  driver,
  sessionId,
  timeout,
  extraBindings,
}: BuildCodeModeOptions) {
  return createCodeMode({
    driver,
    tools: catalogTools,
    timeout,
    getSkillBindings: async () => ({
      ...toolsToBindings(createSessionScopedCatalogTools(sessionId), 'external_'),
      ...createStorefrontUIBindings(),
      ...extraBindings,
    }),
  })
}
