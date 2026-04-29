import { createStore } from '@tanstack/store'
import { toast } from 'sonner'
import { findAiAction } from '#/features/ai-ui/registry'
import type { AiAction, AiActionPayloadByType, AiActionType } from '#/features/ai-ui/types'

type Handler<T extends AiActionType> = (payload: AiActionPayloadByType[T]) => void | Promise<void>
type AnyHandler = (payload: never) => void | Promise<void>

const store = createStore<{ pending: AiAction | null }>({ pending: null })
const handlers = new Map<AiActionType, AnyHandler>()
let activeToastId: string | number | null = null

function dismissActiveToast() {
  if (activeToastId !== null) {
    toast.dismiss(activeToastId)
    activeToastId = null
  }
}

export const aiUiStore = {
  getPending(): AiAction | null {
    return store.state.pending
  },
  propose(action: AiAction) {
    const def = findAiAction(action.type)
    if (!def) return

    dismissActiveToast()
    store.setState(() => ({ pending: action }))

    if (def.mode === 'immediate') {
      void aiUiStore.commit()
      return
    }

    activeToastId = toast(def.confirmLabel(action.payload as never), {
      description: def.confirmDescription(action.payload as never),
      duration: 5000,
      action: {
        label: 'Open',
        onClick: () => void aiUiStore.commit(),
      },
      cancel: {
        label: 'Dismiss',
        onClick: () => aiUiStore.dismiss(),
      },
      onAutoClose: () => {
        if (store.state.pending === action) {
          activeToastId = null
          aiUiStore.dismiss()
        }
      },
    })
  },
  async commit() {
    const action = store.state.pending
    if (!action) return
    dismissActiveToast()
    store.setState(() => ({ pending: null }))
    const handler = handlers.get(action.type)
    if (handler) await handler(action.payload as never)
  },
  dismiss() {
    if (!store.state.pending) return
    dismissActiveToast()
    store.setState(() => ({ pending: null }))
  },
  registerHandler<T extends AiActionType>(type: T, handler: Handler<T>) {
    handlers.set(type, handler as AnyHandler)
    return () => {
      if (handlers.get(type) === (handler as AnyHandler)) handlers.delete(type)
    }
  },
}
