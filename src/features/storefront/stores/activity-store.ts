import { useSyncExternalStore } from 'react'
import type {
  ActivityState,
  CanvasSnapshot,
  ConsoleLog,
  ExternalCall,
  TerminalError,
  TurnActivity,
} from '#/features/storefront/types/activity-types'

const PARALLEL_WINDOW_MS = 5
const MAX_LOGS_PER_TURN = 200

function emptyState(): ActivityState {
  return { byTurnId: {}, order: [], currentTurnId: null }
}

function emptyTurn(turnId: string): TurnActivity {
  return {
    turnId,
    startedAt: Date.now(),
    status: 'writing',
    calls: [],
    logs: [],
    priorAttempts: [],
  }
}

function classifyKind(fn: string): 'data' | 'render' {
  return fn.startsWith('ui_') ? 'render' : 'data'
}

function shortError(err: unknown): string {
  if (err == null) return 'Unknown error'
  if (typeof err === 'string') return err
  if (typeof err === 'object' && 'message' in (err as any)) {
    return String((err as any).message)
  }
  return String(err)
}

function pairResult(
  calls: Array<ExternalCall>,
  fn: string,
  result: unknown,
  duration: number,
  error: string | undefined,
): Array<ExternalCall> {
  let found = false
  const next = calls.slice()
  for (let i = 0; i < next.length; i++) {
    const c = next[i]
    if (c.function === fn && c.endedAt == null) {
      next[i] = {
        ...c,
        endedAt: c.startedAt + duration,
        result,
        error,
      }
      found = true
      break
    }
  }
  if (!found) {
    next.push({
      id: `${fn}-orphan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      function: fn,
      kind: classifyKind(fn),
      args: undefined,
      startedAt: Date.now() - duration,
      endedAt: Date.now(),
      result,
      error,
      groupId: `orphan-${Date.now()}`,
    })
  }
  return next
}

function assignGroup(calls: Array<ExternalCall>, startedAt: number): string {
  for (let i = calls.length - 1; i >= 0; i--) {
    const c = calls[i]
    if (startedAt - c.startedAt <= PARALLEL_WINDOW_MS) {
      return c.groupId
    }
    break
  }
  return `g-${startedAt}-${Math.random().toString(36).slice(2, 6)}`
}

function computeStatus(turn: TurnActivity): TurnActivity['status'] {
  if (turn.endedAt == null) {
    if (turn.terminalError) return 'failed'
    const hasRender = turn.calls.some((c) => c.kind === 'render')
    const hasData = turn.calls.some((c) => c.kind === 'data')
    if (hasRender) return 'rendering'
    if (hasData || turn.codeLength != null) return 'running'
    return 'writing'
  }
  if (turn.terminalError) return 'failed'
  const anyErr = turn.calls.some((c) => c.error)
  return anyErr ? 'warned' : 'succeeded'
}

type RecordHandler = (turnId: string, data: Record<string, unknown>) => void

const recordHandlers: Record<string, RecordHandler> = {
  'code_mode:execution_started': (turnId, data) => {
    mutateTurn(turnId, (turn) => {
      const isRetry =
        turn.calls.length > 0 || turn.logs.length > 0 || !!turn.terminalError || !!turn.endedAt
      return {
        ...turn,
        codeLength: data.codeLength as number | undefined,
        calls: isRetry ? [] : turn.calls,
        logs: isRetry ? [] : turn.logs,
        returnValue: isRetry ? undefined : turn.returnValue,
        terminalError: isRetry ? undefined : turn.terminalError,
        endedAt: isRetry ? undefined : turn.endedAt,
        canvasSnapshot: isRetry ? undefined : turn.canvasSnapshot,
      }
    })
  },
  'code_mode:external_call': (turnId, data) => {
    const fn = data.function as string
    const ts = (data.timestamp as number | undefined) ?? Date.now()
    mutateTurn(turnId, (turn) => {
      const groupId = assignGroup(turn.calls, ts)
      const call: ExternalCall = {
        id: `${turnId}-${turn.calls.length}`,
        function: fn,
        kind: classifyKind(fn),
        args: data.args,
        startedAt: ts,
        groupId,
      }
      return { ...turn, calls: [...turn.calls, call] }
    })
  },
  'code_mode:external_result': (turnId, data) => {
    const fn = data.function as string
    const duration = (data.duration as number | undefined) ?? 0
    mutateTurn(turnId, (turn) => ({
      ...turn,
      calls: pairResult(turn.calls, fn, data.result, duration, undefined),
    }))
  },
  'code_mode:external_error': (turnId, data) => {
    const fn = data.function as string
    const duration = (data.duration as number | undefined) ?? 0
    mutateTurn(turnId, (turn) => ({
      ...turn,
      calls: pairResult(turn.calls, fn, undefined, duration, shortError(data.error)),
    }))
  },
  'code_mode:console': (turnId, data) => {
    const log: ConsoleLog = {
      id: `${turnId}-log-${state.byTurnId[turnId]?.logs.length ?? 0}`,
      level: (data.level as ConsoleLog['level']) ?? 'log',
      message: String(data.message ?? ''),
      timestamp: (data.timestamp as number | undefined) ?? Date.now(),
    }
    mutateTurn(turnId, (turn) => {
      const logs =
        turn.logs.length >= MAX_LOGS_PER_TURN
          ? [...turn.logs.slice(turn.logs.length - MAX_LOGS_PER_TURN + 1), log]
          : [...turn.logs, log]
      return { ...turn, logs }
    })
  },
}

let state: ActivityState = emptyState()
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function mutateTurn(turnId: string, fn: (turn: TurnActivity) => TurnActivity) {
  const existing = state.byTurnId[turnId]
  if (!existing) return
  const updated = fn(existing)
  const recomputed = { ...updated, status: computeStatus(updated) }
  state = {
    ...state,
    byTurnId: { ...state.byTurnId, [turnId]: recomputed },
  }
}

export const activityStore = {
  get: () => state,

  subscribe: (l: () => void) => {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },

  startTurn: (turnId: string) => {
    const turn = emptyTurn(turnId)
    state = {
      byTurnId: { ...state.byTurnId, [turnId]: turn },
      order: [...state.order, turnId],
      currentTurnId: turnId,
    }
    emit()
  },

  endTurn: (turnId: string, canvasSnapshot: CanvasSnapshot) => {
    mutateTurn(turnId, (turn) => ({
      ...turn,
      endedAt: Date.now(),
      canvasSnapshot,
    }))
    emit()
  },

  setCanvasSnapshot: (turnId: string, canvasSnapshot: CanvasSnapshot) => {
    mutateTurn(turnId, (turn) => ({ ...turn, canvasSnapshot }))
    emit()
  },

  setTerminalError: (turnId: string, err: TerminalError) => {
    mutateTurn(turnId, (turn) => ({
      ...turn,
      terminalError: err,
      endedAt: turn.endedAt ?? Date.now(),
    }))
    emit()
  },

  setPriorAttempts: (turnId: string, attempts: TurnActivity['priorAttempts']) => {
    mutateTurn(turnId, (turn) => ({ ...turn, priorAttempts: attempts }))
    emit()
  },

  setCode: (turnId: string, code: string) => {
    if (state.byTurnId[turnId]?.code === code) return
    mutateTurn(turnId, (turn) => ({ ...turn, code }))
    emit()
  },

  setReturnValue: (turnId: string, value: unknown) => {
    if (state.byTurnId[turnId]?.returnValue === value) return
    mutateTurn(turnId, (turn) => ({ ...turn, returnValue: value }))
    emit()
  },

  record: (eventType: string, data: Record<string, unknown>) => {
    const turnId = state.currentTurnId
    if (!turnId) return
    const handler = recordHandlers[eventType]
    if (!handler) return
    handler(turnId, data)
    emit()
  },

  clear: () => {
    state = emptyState()
    emit()
  },
}

export function useActivityState() {
  return useSyncExternalStore(activityStore.subscribe, activityStore.get, () => state)
}

export function snapshotUIState(uiState: {
  nodes: Map<string, any>
  rootIds: Array<string>
}): CanvasSnapshot {
  const nodes: Record<string, any> = {}
  for (const [k, v] of uiState.nodes) nodes[k] = v
  return { rootIds: [...uiState.rootIds], nodes }
}
