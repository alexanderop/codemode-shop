import { createCodeMode } from '@tanstack/ai-code-mode'
import { createNodeIsolateDriver } from '@tanstack/ai-isolate-node'
import { catalogTools } from '#/lib/tools/catalog-tools'
import { createStorefrontUIBindings } from '#/lib/storefront/ui-bindings'
import type { UIEvent } from '#/lib/storefront/ui-types'

export interface CapturedEvent {
  name: string
  value: unknown
}

export interface ProgramRunResult {
  success: boolean
  result: unknown
  error?: { message: string; name?: string }
  events: Array<CapturedEvent>
  uiEvents: Array<UIEvent>
  toolCalls: Array<string>
}

let codeModeCache: ReturnType<typeof createCodeMode> | null = null

function getCodeMode() {
  if (!codeModeCache) {
    const driver = createNodeIsolateDriver({ timeout: 15_000, memoryLimit: 64 })
    codeModeCache = createCodeMode({
      driver,
      tools: catalogTools,
      timeout: 15_000,
      getSkillBindings: async () => createStorefrontUIBindings(),
    })
  }
  return codeModeCache
}

/**
 * Run a TypeScript program through the real code-mode tool against the real
 * isolate, real catalog tools, and real UI bindings. Captures every event the
 * code-mode runtime emits — including `storefront:ui` events from UI bindings
 * and `code_mode:external_call` events from tool invocations.
 *
 * No LLM, no chat() loop, no SSE plumbing. The seam under test is everything
 * downstream of "the model wrote a program".
 */
export async function runProgram(typescriptCode: string): Promise<ProgramRunResult> {
  const events: Array<CapturedEvent> = []
  const ctx = {
    emitCustomEvent: (name: string, value: unknown) => events.push({ name, value }),
  }

  const codeMode = getCodeMode()
  const out = await codeMode.tool.execute!({ typescriptCode }, ctx)

  const uiEvents = events.filter((e) => e.name === 'storefront:ui').map((e) => e.value as UIEvent)

  const toolCalls = events
    .filter((e) => e.name === 'code_mode:external_call')
    .map((e) => (e.value as { function: string }).function)
    .map((fn) => (fn.startsWith('external_') ? fn.slice('external_'.length) : fn))

  return {
    success: out.success,
    result: out.result,
    error: out.error,
    events,
    uiEvents,
    toolCalls,
  }
}
