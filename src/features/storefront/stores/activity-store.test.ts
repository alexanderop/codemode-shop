import { afterEach, describe, expect, it } from 'vitest'
import { activityStore } from './activity-store'

afterEach(() => {
  activityStore.clear()
})

describe('activityStore', () => {
  it('starts empty', () => {
    const s = activityStore.get()
    expect(s.order).toEqual([])
    expect(s.currentTurnId).toBeNull()
  })

  it('startTurn registers a turn and sets currentTurnId', () => {
    activityStore.startTurn('t1')
    const s = activityStore.get()
    expect(s.currentTurnId).toBe('t1')
    expect(s.order).toEqual(['t1'])
    expect(s.byTurnId.t1?.status).toBe('writing')
  })

  it("classifies a ui_* call as 'render'", () => {
    activityStore.startTurn('t1')
    activityStore.record('code_mode:external_call', {
      function: 'ui_addProductCard',
      timestamp: Date.now(),
    })
    const turn = activityStore.get().byTurnId.t1!
    expect(turn.calls).toHaveLength(1)
    expect(turn.calls[0]!.kind).toBe('render')
  })

  it("classifies an external_* call as 'data'", () => {
    activityStore.startTurn('t1')
    activityStore.record('code_mode:external_call', {
      function: 'external_searchProducts',
      timestamp: Date.now(),
    })
    expect(activityStore.get().byTurnId.t1!.calls[0]!.kind).toBe('data')
  })

  it('endTurn marks the turn succeeded when no errors recorded', () => {
    activityStore.startTurn('t1')
    activityStore.endTurn('t1', { rootIds: [], nodes: {} })
    expect(activityStore.get().byTurnId.t1!.status).toBe('succeeded')
  })

  it('endTurn keeps currentTurnId so late code-mode events still record', () => {
    activityStore.startTurn('t1')
    activityStore.endTurn('t1', { rootIds: [], nodes: {} })
    activityStore.record('code_mode:external_call', {
      function: 'external_getCart',
      timestamp: Date.now(),
    })
    expect(activityStore.get().byTurnId.t1!.calls).toHaveLength(1)
  })

  it('setCanvasSnapshot refreshes a finished turn for late ui events', () => {
    activityStore.startTurn('t1')
    activityStore.endTurn('t1', {
      rootIds: ['l'],
      nodes: {
        l: {
          id: 'l',
          type: 'loading',
          props: { label: 'Searching...' },
          childIds: [],
        },
      },
    })
    activityStore.setCanvasSnapshot('t1', {
      rootIds: ['p1'],
      nodes: {
        p1: {
          id: 'p1',
          type: 'productCard',
          props: {
            productId: 'p1',
            name: 'Runner X',
            brand: 'Acme',
            price: 120,
            imageUrl: '/shoe.png',
          },
          childIds: [],
        },
      },
    })

    const snapshot = activityStore.get().byTurnId.t1!.canvasSnapshot
    expect(snapshot?.rootIds).toEqual(['p1'])
    expect(snapshot?.nodes.p1?.type).toBe('productCard')
    expect(snapshot?.nodes.l).toBeUndefined()
  })

  it('startTurn overwrites a lingering currentTurnId from a finished turn', () => {
    activityStore.startTurn('t1')
    activityStore.endTurn('t1', { rootIds: [], nodes: {} })
    activityStore.startTurn('t2')
    expect(activityStore.get().currentTurnId).toBe('t2')
  })

  it('execution_started for a retry clears stale terminal state', () => {
    activityStore.startTurn('t1')
    activityStore.setTerminalError('t1', {
      source: 'runtime',
      message: 'first attempt failed',
    })
    activityStore.record('code_mode:execution_started', { codeLength: 100 })
    activityStore.record('code_mode:external_call', {
      function: 'ui_addProductCard',
      timestamp: Date.now(),
    })

    const turn = activityStore.get().byTurnId.t1!
    expect(turn.terminalError).toBeUndefined()
    expect(turn.endedAt).toBeUndefined()
    expect(turn.status).toBe('rendering')
  })

  it('clear empties all state', () => {
    activityStore.startTurn('t1')
    activityStore.clear()
    expect(activityStore.get().order).toEqual([])
  })
})
