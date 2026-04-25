import { describe, expect, it } from 'vitest'
import type { UIEvent } from '#/features/storefront/types/ui-types'
import { uiStore } from './ui-store'

function reset() {
  uiStore.clear()
}

const addRoot: UIEvent = {
  op: 'add',
  id: 'root1',
  type: 'productCard',
  parentId: undefined,
  props: { productId: 'p1', title: 'Test', priceCents: 100 } as never,
}

const addChild: UIEvent = {
  op: 'add',
  id: 'child1',
  type: 'stockPill',
  parentId: 'root1',
  props: { state: 'in_stock' } as never,
}

describe('uiStore reducer', () => {
  it('starts empty', () => {
    reset()
    const state = uiStore.get()
    expect(state.nodes.size).toBe(0)
    expect(state.rootIds).toEqual([])
  })

  it('add with no parent registers a root id', () => {
    reset()
    uiStore.dispatch(addRoot)
    const state = uiStore.get()
    expect(state.rootIds).toEqual(['root1'])
    expect(state.nodes.get('root1')?.type).toBe('productCard')
  })

  it('add with parent appends to parent.childIds', () => {
    reset()
    uiStore.dispatch(addRoot)
    uiStore.dispatch(addChild)
    const state = uiStore.get()
    expect(state.nodes.get('root1')?.childIds).toEqual(['child1'])
    expect(state.nodes.get('child1')?.parentId).toBe('root1')
  })

  it('add is idempotent on duplicate child registration', () => {
    reset()
    uiStore.dispatch(addRoot)
    uiStore.dispatch(addChild)
    uiStore.dispatch(addChild)
    const state = uiStore.get()
    expect(state.nodes.get('root1')?.childIds).toEqual(['child1'])
  })

  it('update merges props', () => {
    reset()
    uiStore.dispatch(addRoot)
    uiStore.dispatch({
      op: 'update',
      id: 'root1',
      props: { title: 'Renamed' } as never,
    })
    const props = uiStore.get().nodes.get('root1')?.props as unknown as {
      title: string
    }
    expect(props.title).toBe('Renamed')
  })

  it('remove deletes node and descendants', () => {
    reset()
    uiStore.dispatch(addRoot)
    uiStore.dispatch(addChild)
    uiStore.dispatch({ op: 'remove', id: 'root1' })
    const state = uiStore.get()
    expect(state.nodes.size).toBe(0)
    expect(state.rootIds).toEqual([])
  })

  it('clear empties state and bumps version', () => {
    reset()
    uiStore.dispatch(addRoot)
    const v1 = uiStore.get().version
    uiStore.clear()
    const v2 = uiStore.get().version
    expect(uiStore.get().nodes.size).toBe(0)
    expect(v2).toBeGreaterThan(v1)
  })

  it('every dispatch increments version', () => {
    reset()
    const v0 = uiStore.get().version
    uiStore.dispatch(addRoot)
    expect(uiStore.get().version).toBeGreaterThan(v0)
    uiStore.dispatch({
      op: 'update',
      id: 'root1',
      props: { title: 'x' } as never,
    })
    expect(uiStore.get().version).toBeGreaterThan(v0 + 1)
  })
})
