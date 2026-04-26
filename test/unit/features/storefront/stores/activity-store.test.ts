import { afterEach, describe, expect, it } from 'vitest'
import { activityStore, snapshotUIState } from '#/features/storefront/stores/activity-store'

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

  it('pairs an external_result with the in-flight call', () => {
    activityStore.startTurn('t1')
    activityStore.record('code_mode:external_call', {
      function: 'external_searchProducts',
      timestamp: 1000,
    })
    activityStore.record('code_mode:external_result', {
      function: 'external_searchProducts',
      duration: 50,
      result: { hits: 3 },
    })

    const call = activityStore.get().byTurnId.t1!.calls[0]!
    expect(call.endedAt).toBe(1050)
    expect(call.result).toEqual({ hits: 3 })
    expect(call.error).toBeUndefined()
  })

  it('pairs an external_error onto the in-flight call', () => {
    activityStore.startTurn('t1')
    activityStore.record('code_mode:external_call', {
      function: 'external_searchProducts',
      timestamp: 1000,
    })
    activityStore.record('code_mode:external_error', {
      function: 'external_searchProducts',
      duration: 12,
      error: new Error('rate limit'),
    })

    const turn = activityStore.get().byTurnId.t1!
    expect(turn.calls[0]!.error).toBe('rate limit')
  })

  it('records an orphan call when a result arrives with no matching call', () => {
    activityStore.startTurn('t1')
    activityStore.record('code_mode:external_result', {
      function: 'external_searchProducts',
      duration: 7,
      result: { hits: 0 },
    })
    const turn = activityStore.get().byTurnId.t1!
    expect(turn.calls).toHaveLength(1)
    expect(turn.calls[0]!.id).toMatch(/-orphan-/)
  })

  it('shortError stringifies non-Error values via the error path', () => {
    activityStore.startTurn('t1')
    activityStore.record('code_mode:external_call', {
      function: 'external_x',
      timestamp: 1000,
    })
    activityStore.record('code_mode:external_error', {
      function: 'external_x',
      duration: 1,
      error: 'plain string',
    })
    activityStore.startTurn('t2')
    activityStore.record('code_mode:external_call', {
      function: 'external_x',
      timestamp: 1,
    })
    activityStore.record('code_mode:external_error', {
      function: 'external_x',
      duration: 1,
      error: null,
    })
    activityStore.startTurn('t3')
    activityStore.record('code_mode:external_call', {
      function: 'external_x',
      timestamp: 1,
    })
    activityStore.record('code_mode:external_error', {
      function: 'external_x',
      duration: 1,
      error: 42,
    })

    expect(activityStore.get().byTurnId.t1!.calls[0]!.error).toBe('plain string')
    expect(activityStore.get().byTurnId.t2!.calls[0]!.error).toBe('Unknown error')
    expect(activityStore.get().byTurnId.t3!.calls[0]!.error).toBe('42')
  })

  it('groups calls inside the parallel window and starts a new group outside it', () => {
    activityStore.startTurn('t1')
    activityStore.record('code_mode:external_call', { function: 'external_a', timestamp: 1000 })
    activityStore.record('code_mode:external_call', { function: 'external_b', timestamp: 1003 })
    activityStore.record('code_mode:external_call', { function: 'external_c', timestamp: 2000 })

    const calls = activityStore.get().byTurnId.t1!.calls
    expect(calls[0]!.groupId).toBe(calls[1]!.groupId)
    expect(calls[0]!.groupId).not.toBe(calls[2]!.groupId)
  })

  it('console events append logs and trim to the max-per-turn cap', () => {
    activityStore.startTurn('t1')
    for (let i = 0; i < 205; i++) {
      activityStore.record('code_mode:console', {
        level: 'log',
        message: `msg-${i}`,
        timestamp: i,
      })
    }
    const logs = activityStore.get().byTurnId.t1!.logs
    expect(logs).toHaveLength(200)
    expect(logs[0]!.message).toBe('msg-5')
    expect(logs.at(-1)!.message).toBe('msg-204')
  })

  it('console event uses defaults when level/message/timestamp are missing', () => {
    activityStore.startTurn('t1')
    activityStore.record('code_mode:console', {})
    const log = activityStore.get().byTurnId.t1!.logs[0]!
    expect(log.level).toBe('log')
    expect(log.message).toBe('')
    expect(typeof log.timestamp).toBe('number')
  })

  it('execution_started keeps state on the first run (not a retry)', () => {
    activityStore.startTurn('t1')
    activityStore.record('code_mode:execution_started', { codeLength: 42 })
    const turn = activityStore.get().byTurnId.t1!
    expect(turn.codeLength).toBe(42)
    expect(turn.calls).toEqual([])
    expect(turn.status).toBe('running')
  })

  it('computeStatus is "rendering" when only ui_* calls exist', () => {
    activityStore.startTurn('t1')
    activityStore.record('code_mode:external_call', {
      function: 'ui_addLoading',
      timestamp: Date.now(),
    })
    expect(activityStore.get().byTurnId.t1!.status).toBe('rendering')
  })

  it('computeStatus is "failed" while a turn is open with a terminal error', () => {
    activityStore.startTurn('t1')
    activityStore.setTerminalError('t1', { source: 'runtime', message: 'boom' })
    expect(activityStore.get().byTurnId.t1!.status).toBe('failed')
  })

  it('endTurn after a recorded error keeps status "warned"', () => {
    activityStore.startTurn('t1')
    activityStore.record('code_mode:external_call', { function: 'external_x', timestamp: 1 })
    activityStore.record('code_mode:external_error', {
      function: 'external_x',
      duration: 1,
      error: 'no',
    })
    activityStore.endTurn('t1', { rootIds: [], nodes: {} })
    expect(activityStore.get().byTurnId.t1!.status).toBe('warned')
  })

  it('setPriorAttempts attaches retry history to the turn', () => {
    activityStore.startTurn('t1')
    activityStore.setPriorAttempts('t1', [
      { code: 'x', error: { source: 'runtime', message: 'first' } },
    ])
    expect(activityStore.get().byTurnId.t1!.priorAttempts).toHaveLength(1)
  })

  it('setCode is a no-op when the code is unchanged', () => {
    activityStore.startTurn('t1')
    const seen: Array<unknown> = []
    const unsub = activityStore.subscribe(() => seen.push(activityStore.get()))
    activityStore.setCode('t1', 'a')
    activityStore.setCode('t1', 'a')
    activityStore.setCode('t1', 'b')
    unsub()
    expect(seen).toHaveLength(2)
  })

  it('setReturnValue is a no-op when the value is referentially equal', () => {
    activityStore.startTurn('t1')
    const value = { ok: true }
    activityStore.setReturnValue('t1', value)
    const seen: Array<unknown> = []
    const unsub = activityStore.subscribe(() => seen.push(activityStore.get()))
    activityStore.setReturnValue('t1', value)
    unsub()
    expect(seen).toEqual([])
    expect(activityStore.get().byTurnId.t1!.returnValue).toBe(value)
  })

  it('setTerminalError preserves an earlier endedAt instead of overwriting it', () => {
    activityStore.startTurn('t1')
    activityStore.endTurn('t1', { rootIds: [], nodes: {} })
    const endedAt = activityStore.get().byTurnId.t1!.endedAt
    activityStore.setTerminalError('t1', { source: 'runtime', message: 'late' })
    expect(activityStore.get().byTurnId.t1!.endedAt).toBe(endedAt)
  })

  it('record without a current turn is a no-op', () => {
    activityStore.record('code_mode:external_call', { function: 'external_x', timestamp: 1 })
    expect(activityStore.get().order).toEqual([])
  })

  it('record with an unknown event type is a no-op', () => {
    activityStore.startTurn('t1')
    activityStore.record('code_mode:made_up', { whatever: true })
    expect(activityStore.get().byTurnId.t1!.calls).toEqual([])
    expect(activityStore.get().byTurnId.t1!.logs).toEqual([])
  })

  it('snapshotUIState copies a Map of nodes into a plain record', () => {
    const nodes = new Map<string, unknown>([
      ['n1', { id: 'n1', type: 'loading', props: { label: 'Loading' }, childIds: [] }],
    ])
    const snap = snapshotUIState({ nodes: nodes as never, rootIds: ['n1'] })
    expect(snap.rootIds).toEqual(['n1'])
    expect(snap.nodes.n1).toEqual({
      id: 'n1',
      type: 'loading',
      props: { label: 'Loading' },
      childIds: [],
    })
  })
})
