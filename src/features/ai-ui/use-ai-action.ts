import { useEffect } from 'react'
import { aiUiStore } from '#/features/ai-ui/store'
import type { AiActionPayloadByType, AiActionType } from '#/features/ai-ui/types'

export function useAiActionHandler<T extends AiActionType>(
  type: T,
  handler: (payload: AiActionPayloadByType[T]) => void | Promise<void>,
) {
  useEffect(() => aiUiStore.registerHandler(type, handler), [type, handler])
}
