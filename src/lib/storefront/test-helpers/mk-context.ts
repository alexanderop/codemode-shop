import type { ToolExecutionContext } from '@tanstack/ai-code-mode'

export interface CapturedEvent {
  name: string
  value: unknown
}

export function mkContext(): {
  events: Array<CapturedEvent>
  ctx: ToolExecutionContext
} {
  const events: Array<CapturedEvent> = []
  const ctx = {
    emitCustomEvent: (name: string, value: unknown) => events.push({ name, value }),
  } as unknown as ToolExecutionContext
  return { events, ctx }
}
