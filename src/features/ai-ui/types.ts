import type { z } from 'zod'
import type { NavigatePayload } from '#/features/ai-ui/actions/navigate'

export const AI_UI_DISPATCH_EVENT = 'ai_ui:dispatch' as const

export interface AiActionPayloadByType {
  navigate: NavigatePayload
}

export type AiActionType = keyof AiActionPayloadByType

export type AiAction = {
  [T in AiActionType]: { type: T; payload: AiActionPayloadByType[T] }
}[AiActionType]

export interface AiActionDefinition {
  type: AiActionType
  functionName: string
  description: string
  mode: 'proposed' | 'immediate'
  payloadSchema: z.ZodType
  promptDeclaration: string
  confirmLabel: (payload: never) => string
  confirmDescription: (payload: never) => string
}

export function defineAiAction<T extends AiActionType>(def: {
  type: T
  functionName: string
  description: string
  mode: 'proposed' | 'immediate'
  payloadSchema: z.ZodType<AiActionPayloadByType[T]>
  promptDeclaration: string
  confirmLabel: (payload: AiActionPayloadByType[T]) => string
  confirmDescription: (payload: AiActionPayloadByType[T]) => string
}): AiActionDefinition {
  return def as unknown as AiActionDefinition
}
