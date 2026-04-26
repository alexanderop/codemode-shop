import { useSyncExternalStore } from 'react'

let open = false
const listeners = new Set<(open: boolean) => void>()

function emit() {
  for (const l of listeners) l(open)
}

export const cheatsheetUi = {
  get: () => open,
  set: (next: boolean) => {
    if (open === next) return
    open = next
    emit()
  },
  open: () => cheatsheetUi.set(true),
  close: () => cheatsheetUi.set(false),
  toggle: () => cheatsheetUi.set(!open),
  subscribe: (l: (open: boolean) => void) => {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
}

export function useCheatsheetOpen(): boolean {
  return useSyncExternalStore(
    cheatsheetUi.subscribe,
    () => open,
    () => false,
  )
}
