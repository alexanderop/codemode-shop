import { useSyncExternalStore } from 'react'

let open = false
const listeners = new Set<(open: boolean) => void>()

function emit() {
  for (const l of listeners) l(open)
}

export const assistantUi = {
  get: () => open,
  set: (next: boolean) => {
    if (open === next) return
    open = next
    emit()
  },
  open: () => assistantUi.set(true),
  close: () => assistantUi.set(false),
  toggle: () => assistantUi.set(!open),
  subscribe: (l: (open: boolean) => void) => {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
}

export function useAssistantOpen(): boolean {
  return useSyncExternalStore(
    assistantUi.subscribe,
    () => open,
    () => false,
  )
}
