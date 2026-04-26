import { createStore } from '@tanstack/store'
import { useSelector } from '@tanstack/react-store'
import type { AiAction, AiActionPayloadByType, AiActionType } from '#/features/ai-ui/types'

type Handler<T extends AiActionType> = (payload: AiActionPayloadByType[T]) => void | Promise<void>
type AnyHandler = (payload: never) => void | Promise<void>

const store = createStore<{ pending: AiAction | null }>({ pending: null })
const handlers = new Map<AiActionType, AnyHandler>()

export const aiUiStore = {
  getPending(): AiAction | null {
    return store.state.pending
  },
  propose(action: AiAction) {
    store.setState(() => ({ pending: action }))
  },
  async commit() {
    const action = store.state.pending
    if (!action) return
    store.setState(() => ({ pending: null }))
    const handler = handlers.get(action.type)
    if (handler) await handler(action.payload as never)
  },
  dismiss() {
    if (!store.state.pending) return
    store.setState(() => ({ pending: null }))
  },
  registerHandler<T extends AiActionType>(type: T, handler: Handler<T>) {
    handlers.set(type, handler as AnyHandler)
    return () => {
      if (handlers.get(type) === (handler as AnyHandler)) handlers.delete(type)
    }
  },
}

export function usePendingAiAction(): AiAction | null {
  return useSelector(store, (s) => s.pending)
}
