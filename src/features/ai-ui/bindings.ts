import type { ToolBinding } from '@tanstack/ai-code-mode'
import { aiActions } from '#/features/ai-ui/registry'
import { AI_UI_DISPATCH_EVENT } from '#/features/ai-ui/types'
import { makeBinding } from '#/lib/code-mode-binding'

const aiUiBindings: Record<string, ToolBinding> = Object.fromEntries(
  aiActions.map((action) => [
    action.functionName,
    makeBinding(
      action.functionName,
      action.description,
      action.payloadSchema,
      async (payload, context) => {
        context?.emitCustomEvent?.(AI_UI_DISPATCH_EVENT, { type: action.type, payload })
        return { ok: true }
      },
    ),
  ]),
)

export function createAiUiBindings(): Record<string, ToolBinding> {
  return aiUiBindings
}
