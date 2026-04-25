import { useSyncExternalStore } from 'react'
import type { UIEvent, UINode } from '#/features/storefront/types/ui-types'

export interface UIState {
  nodes: Map<string, UINode>
  rootIds: Array<string>
  version: number
}

function emptyState(): UIState {
  return { nodes: new Map(), rootIds: [], version: 0 }
}

function createNode(event: Extract<UIEvent, { op: 'add' }>): UINode {
  return {
    id: event.id,
    type: event.type,
    parentId: event.parentId,
    props: event.props,
    childIds: [],
  } as UINode
}

function updateNodeProps(node: UINode, props: Record<string, unknown>): UINode {
  return { ...node, props: { ...node.props, ...props } } as UINode
}

function applyEvent(state: UIState, event: UIEvent): UIState {
  if (event.op === 'clear') return { ...emptyState(), version: state.version + 1 }

  if (event.op === 'update') {
    const existing = state.nodes.get(event.id)
    if (!existing) return state
    const nodes = new Map(state.nodes)
    nodes.set(event.id, updateNodeProps(existing, event.props))
    return { nodes, rootIds: state.rootIds, version: state.version + 1 }
  }

  if (event.op === 'remove') {
    const existing = state.nodes.get(event.id)
    if (!existing) return state
    const nodes = new Map(state.nodes)
    const toRemove = collectDescendants(event.id, nodes)
    for (const id of toRemove) nodes.delete(id)
    let rootIds = state.rootIds
    if (existing.parentId) {
      const parent = nodes.get(existing.parentId)
      if (parent) {
        nodes.set(existing.parentId, {
          ...parent,
          childIds: parent.childIds.filter((c) => c !== event.id),
        })
      }
    } else {
      rootIds = rootIds.filter((c) => c !== event.id)
    }
    return { nodes, rootIds, version: state.version + 1 }
  }

  const nodes = new Map(state.nodes)
  let rootIds = state.rootIds
  const node = createNode(event)
  nodes.set(event.id, node)
  if (event.parentId) {
    const parent = nodes.get(event.parentId)
    if (parent && !parent.childIds.includes(event.id)) {
      nodes.set(event.parentId, {
        ...parent,
        childIds: [...parent.childIds, event.id],
      })
    }
  } else if (!rootIds.includes(event.id)) {
    rootIds = [...rootIds, event.id]
  }
  return { nodes, rootIds, version: state.version + 1 }
}

function collectDescendants(id: string, nodes: Map<string, UINode>): Array<string> {
  const out: Array<string> = [id]
  const node = nodes.get(id)
  if (!node) return out
  for (const childId of node.childIds) {
    out.push(...collectDescendants(childId, nodes))
  }
  return out
}

let state: UIState = emptyState()
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export const uiStore = {
  get: () => state,
  dispatch: (event: UIEvent) => {
    state = applyEvent(state, event)
    emit()
  },
  clear: () => {
    state = { ...emptyState(), version: state.version + 1 }
    emit()
  },
  subscribe: (l: () => void) => {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
}

export function useUIState() {
  return useSyncExternalStore(uiStore.subscribe, uiStore.get, () => state)
}
