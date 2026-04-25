import { useSyncExternalStore } from 'react'
import type { UIEvent, UINode } from './ui-types'

export interface UIState {
  nodes: Map<string, UINode>
  rootIds: Array<string>
  version: number
}

function emptyState(): UIState {
  return { nodes: new Map(), rootIds: [], version: 0 }
}

function createNode(event: Extract<UIEvent, { op: 'add' }>): UINode {
  switch (event.type) {
    case 'loading':
      return {
        id: event.id,
        type: 'loading',
        parentId: event.parentId,
        props: event.props,
        childIds: [],
      }
    case 'productCard':
      return {
        id: event.id,
        type: 'productCard',
        parentId: event.parentId,
        props: event.props,
        childIds: [],
      }
    case 'stockPill':
      return {
        id: event.id,
        type: 'stockPill',
        parentId: event.parentId,
        props: event.props,
        childIds: [],
      }
    case 'priceSparkline':
      return {
        id: event.id,
        type: 'priceSparkline',
        parentId: event.parentId,
        props: event.props,
        childIds: [],
      }
    case 'reviewBar':
      return {
        id: event.id,
        type: 'reviewBar',
        parentId: event.parentId,
        props: event.props,
        childIds: [],
      }
    case 'comparisonTable':
      return {
        id: event.id,
        type: 'comparisonTable',
        parentId: event.parentId,
        props: event.props,
        childIds: [],
      }
    case 'ctaButton':
      return {
        id: event.id,
        type: 'ctaButton',
        parentId: event.parentId,
        props: event.props,
        childIds: [],
      }
  }
}

function updateNodeProps(
  node: UINode,
  props: Record<string, unknown>,
): UINode {
  switch (node.type) {
    case 'loading':
      return { ...node, props: { ...node.props, ...props } }
    case 'productCard':
      return { ...node, props: { ...node.props, ...props } }
    case 'stockPill':
      return { ...node, props: { ...node.props, ...props } }
    case 'priceSparkline':
      return { ...node, props: { ...node.props, ...props } }
    case 'reviewBar':
      return { ...node, props: { ...node.props, ...props } }
    case 'comparisonTable':
      return { ...node, props: { ...node.props, ...props } }
    case 'ctaButton':
      return { ...node, props: { ...node.props, ...props } }
  }
}

function applyEvent(state: UIState, event: UIEvent): UIState {
  if (event.op === 'clear') return { ...emptyState(), version: state.version + 1 }

  const nodes = new Map(state.nodes)
  let rootIds = state.rootIds

  if (event.op === 'add') {
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
  }

  if (event.op === 'update') {
    const existing = nodes.get(event.id)
    if (existing) {
      nodes.set(event.id, updateNodeProps(existing, event.props))
    }
  }

  if (event.op === 'remove') {
    const existing = nodes.get(event.id)
    if (existing) {
      const toRemove = collectDescendants(event.id, nodes)
      for (const id of toRemove) nodes.delete(id)
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
    }
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
