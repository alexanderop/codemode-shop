import type { UINode } from './ui-types'

export type CallKind = 'data' | 'render'

export type ExternalCall = {
  id: string
  function: string
  kind: CallKind
  args: unknown
  startedAt: number
  endedAt?: number
  result?: unknown
  error?: string
  groupId: string
}

export type ConsoleLog = {
  id: string
  level: 'log' | 'warn' | 'error' | 'info'
  message: string
  timestamp: number
}

export type TurnStatus = 'writing' | 'running' | 'rendering' | 'succeeded' | 'warned' | 'failed'

export type CanvasSnapshot = {
  rootIds: Array<string>
  nodes: Record<string, UINode>
}

export type TerminalError = {
  name?: string
  message: string
  line?: number
  source: 'typescript' | 'runtime' | 'network' | 'loop-exhausted'
}

export type TurnActivity = {
  turnId: string
  startedAt: number
  endedAt?: number
  status: TurnStatus
  calls: Array<ExternalCall>
  logs: Array<ConsoleLog>
  codeLength?: number
  code?: string
  returnValue?: unknown
  terminalError?: TerminalError
  priorAttempts: Array<PriorAttempt>
  canvasSnapshot?: CanvasSnapshot
}

export type PriorAttempt = {
  code?: string
  error: TerminalError
}

export type ActivityState = {
  byTurnId: Record<string, TurnActivity>
  order: Array<string>
  currentTurnId: string | null
}
