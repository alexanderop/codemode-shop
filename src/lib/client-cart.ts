import { useSyncExternalStore } from 'react'

type Listener = (count: number) => void

let count = 0
const listeners = new Set<Listener>()

function emit() {
  for (const l of listeners) l(count)
}

export const clientCart = {
  get: () => count,
  set: (n: number) => {
    count = n
    emit()
  },
  add: (delta: number) => {
    count += delta
    emit()
  },
  subscribe: (l: Listener) => {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
}

export function useCartCount() {
  return useSyncExternalStore(
    clientCart.subscribe,
    () => count,
    () => 0,
  )
}
