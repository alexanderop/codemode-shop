import { createCodeMode, toolsToBindings } from '@tanstack/ai-code-mode'
import type { CodeModeTool, IsolateDriver, ToolBinding } from '@tanstack/ai-code-mode'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import { catalogTools, createSessionScopedCatalogTools } from '#/lib/tools/catalog-tools'
import { createStorefrontUIBindings } from '#/features/storefront/api/ui-bindings'
import type { SessionId } from '#/lib/session-context'

export interface BuildCodeModeOptions {
  driver: IsolateDriver
  sessionId: SessionId
  timeout: number
  extraBindings?: Record<string, ToolBinding>
}

function isStandardSchema(schema: unknown): schema is StandardSchemaV1 {
  return typeof schema === 'object' && schema !== null && '~standard' in schema
}

function validateStandardSchema(schema: StandardSchemaV1, data: unknown): unknown {
  const result = schema['~standard'].validate(data)
  if (result instanceof Promise) {
    throw new Error('Async schema validation is not supported for code-mode bindings.')
  }
  if (result.issues) {
    const detail = result.issues
      .map((issue) => {
        const path = issue.path?.length ? ` at "${issue.path.join('.')}"` : ''
        return `${issue.message}${path}`
      })
      .join('; ')
    throw new Error(detail)
  }
  return result.value
}

function bindingsWithInputValidation(
  tools: ReadonlyArray<CodeModeTool>,
  prefix: string,
): Record<string, ToolBinding> {
  const bindings = toolsToBindings([...tools], prefix)
  const out: Record<string, ToolBinding> = { ...bindings }
  for (const tool of tools) {
    const name = `${prefix}${tool.name}`
    const binding = out[name]
    if (!binding || !isStandardSchema(tool.inputSchema)) continue
    const schema = tool.inputSchema
    const inner = binding.execute
    out[name] = {
      ...binding,
      execute: async (args, ctx) => {
        let validated: unknown
        try {
          validated = validateStandardSchema(schema, args)
        } catch (e) {
          const detail = e instanceof Error ? e.message : String(e)
          throw new Error(`${name}: invalid arguments — ${detail}`, { cause: e })
        }
        return inner(validated, ctx)
      },
    }
  }
  return out
}

const catalogBindings = bindingsWithInputValidation(catalogTools, 'external_')

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
      ...catalogBindings,
      ...bindingsWithInputValidation(createSessionScopedCatalogTools(sessionId), 'external_'),
      ...createStorefrontUIBindings(),
      ...extraBindings,
    }),
  })
}
