import { createNodeIsolateDriver } from '@tanstack/ai-isolate-node'
import type { IsolateDriver } from '@tanstack/ai-code-mode'
import { sessionContext, type SessionId } from '#/lib/session-context'
import { buildStorefrontCodeMode } from '#/features/storefront/api/code-mode'
import type { UIEvent } from '#/features/storefront/types/ui-types'

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

const TIMEOUT_MS = 15_000

let driverCache: IsolateDriver | null = null

function getDriver(): IsolateDriver {
  if (!driverCache) {
    driverCache = createNodeIsolateDriver({ timeout: TIMEOUT_MS, memoryLimit: 64 })
  }
  return driverCache
}

export async function runProgram(
  typescriptCode: string,
  options: { sessionId?: string } = {},
): Promise<ProgramRunResult> {
  const events: Array<CapturedEvent> = []
  const ctx = {
    emitCustomEvent: (name: string, value: unknown) => events.push({ name, value }),
  }

  const sessionId = (options.sessionId ?? crypto.randomUUID()) as SessionId
  const codeMode = buildStorefrontCodeMode({
    driver: getDriver(),
    sessionId,
    timeout: TIMEOUT_MS,
  })
  const out = await sessionContext.run({ sessionId }, () =>
    codeMode.tool.execute!({ typescriptCode }, ctx),
  )

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
