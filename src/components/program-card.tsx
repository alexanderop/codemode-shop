import { useMemo, useState } from 'react'
import { Collapsible, Tabs } from 'radix-ui'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Code2,
  FileText,
  Loader2,
  Sparkles,
  Terminal,
  X,
  Zap,
} from 'lucide-react'
import { cn } from '#/lib/utils'
import type {
  ExternalCall,
  TurnActivity,
  TurnStatus,
} from '#/lib/storefront/activity-types'

type BandTone = 'slate' | 'emerald' | 'amber' | 'red' | 'sky'

function toneClasses(tone: BandTone): string {
  switch (tone) {
    case 'emerald':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    case 'amber':
      return 'border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-300'
    case 'red':
      return 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300'
    case 'sky':
      return 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300'
    default:
      return 'border-border bg-muted/40 text-muted-foreground'
  }
}

function toneFromStatus(status: TurnStatus, emptyResult: boolean): BandTone {
  if (status === 'succeeded') return emptyResult ? 'sky' : 'emerald'
  if (status === 'warned') return 'amber'
  if (status === 'failed') return 'red'
  return 'slate'
}

function StatusIcon({ status }: { status: TurnStatus }) {
  if (status === 'failed') return <X className="h-3.5 w-3.5" />
  if (status === 'warned') return <AlertTriangle className="h-3.5 w-3.5" />
  if (status === 'succeeded') return <Check className="h-3.5 w-3.5" />
  return <Loader2 className="h-3.5 w-3.5 animate-spin" />
}

function labelFor(turn: TurnActivity): string {
  const { status } = turn
  if (status === 'writing') return 'Writing program…'
  if (status === 'running') {
    const inflight = turn.calls.filter((c) => !c.endedAt).length
    if (inflight > 0) return `Running · ${inflight} in flight`
    return 'Running program…'
  }
  if (status === 'rendering') return 'Rendering results…'
  if (status === 'failed') {
    const msg = turn.terminalError?.message ?? 'Program failed'
    return `Program failed · ${truncate(msg, 60)}`
  }
  const total = turn.calls.length
  const failed = turn.calls.filter((c) => c.error).length
  const duration =
    turn.endedAt && turn.startedAt ? turn.endedAt - turn.startedAt : undefined
  const dur = duration != null ? ` · ${duration}ms` : ''
  if (status === 'warned') {
    return `Ran program · ${total - failed} of ${total} calls ok${dur}`
  }
  const emptyResult =
    (turn.canvasSnapshot?.rootIds.length ?? 0) === 0 &&
    turn.calls.some((c) => c.kind === 'render') === false
  if (emptyResult && total === 0) return 'No program ran'
  if (total === 0 && status === 'succeeded') return 'Finished (no program)'
  return `Ran program · ${total} calls${dur}`
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

type Group = { groupId: string; calls: Array<ExternalCall> }

function groupCalls(calls: Array<ExternalCall>): Array<Group> {
  const byId = new Map<string, Group>()
  const order: Array<string> = []
  for (const c of calls) {
    if (!byId.has(c.groupId)) {
      byId.set(c.groupId, { groupId: c.groupId, calls: [] })
      order.push(c.groupId)
    }
    byId.get(c.groupId)!.calls.push(c)
  }
  return order.map((id) => byId.get(id)!)
}

function formatArgs(args: unknown): string {
  if (args == null) return ''
  try {
    const s = JSON.stringify(args)
    return truncate(s, 80)
  } catch {
    return String(args)
  }
}

function formatResult(result: unknown): string {
  if (result == null) return ''
  try {
    const s = typeof result === 'string' ? result : JSON.stringify(result)
    return truncate(s, 60)
  } catch {
    return ''
  }
}

function CallRow({ call, indent }: { call: ExternalCall; indent: boolean }) {
  const failed = !!call.error
  const pending = call.endedAt == null
  const duration =
    call.endedAt != null ? call.endedAt - call.startedAt : undefined
  return (
    <div
      className={cn(
        'flex items-start gap-2 font-mono text-[11px] leading-5',
        indent && 'pl-4',
      )}
    >
      <span className="shrink-0 select-none text-muted-foreground">
        {indent ? '├─' : '─'}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn(call.kind === 'render' && 'text-violet-600 dark:text-violet-400')}>
          {call.function}
        </span>
        <span className="text-muted-foreground">({formatArgs(call.args)})</span>
        {failed && (
          <span className="ml-2 text-red-600 dark:text-red-400">
            ✗ {truncate(call.error!, 80)}
          </span>
        )}
        {!failed && !pending && (
          <span className="ml-2 text-emerald-700 dark:text-emerald-400">
            ✓ {formatResult(call.result)}
          </span>
        )}
        {pending && (
          <span className="ml-2 text-muted-foreground">…</span>
        )}
      </span>
      <span className="shrink-0 text-muted-foreground tabular-nums">
        {duration != null ? `${duration}ms` : ''}
      </span>
    </div>
  )
}

function GroupRow({ group }: { group: Group }) {
  if (group.calls.length === 1) {
    return <CallRow call={group.calls[0]} indent={false} />
  }
  const starts = group.calls.map((c) => c.startedAt)
  const ends = group.calls.map((c) => c.endedAt ?? Date.now())
  const total = Math.max(...ends) - Math.min(...starts)
  const okCount = group.calls.filter((c) => c.endedAt && !c.error).length
  const failCount = group.calls.filter((c) => c.error).length
  const pendingCount = group.calls.filter((c) => !c.endedAt).length
  return (
    <div className="rounded border border-dashed border-border/60 py-1">
      <div className="flex items-center gap-1.5 px-2 pb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Zap className="h-3 w-3" />
        parallel · {total}ms · {okCount} ok
        {failCount > 0 && <span className="text-red-600 dark:text-red-400">, {failCount} failed</span>}
        {pendingCount > 0 && <span>, {pendingCount} pending</span>}
      </div>
      {group.calls.map((c) => (
        <CallRow key={c.id} call={c} indent />
      ))}
    </div>
  )
}

function CallsTab({ turn }: { turn: TurnActivity }) {
  const groups = useMemo(() => groupCalls(turn.calls), [turn.calls])
  if (!groups.length) {
    return (
      <div className="p-3 text-xs text-muted-foreground">
        No calls yet.
      </div>
    )
  }
  return (
    <div className="space-y-1 p-2">
      {groups.map((g) => (
        <GroupRow key={g.groupId} group={g} />
      ))}
      {turn.endedAt && turn.returnValue != null && (
        <div className="pt-1 font-mono text-[11px] text-muted-foreground">
          → returned {truncate(
            typeof turn.returnValue === 'string'
              ? `"${turn.returnValue}"`
              : JSON.stringify(turn.returnValue),
            120,
          )}
        </div>
      )}
    </div>
  )
}

function CodeTab({ turn }: { turn: TurnActivity }) {
  if (!turn.code) {
    return (
      <div className="p-3 text-xs text-muted-foreground">
        {turn.endedAt
          ? 'No code captured for this turn.'
          : 'Model is writing the program…'}
      </div>
    )
  }
  const errLine = turn.terminalError?.line
  const lines = turn.code.split('\n')
  return (
    <pre className="max-h-80 overflow-auto bg-muted/30 p-3 font-mono text-[11px] leading-5">
      {lines.map((line, i) => {
        const n = i + 1
        const isErr = errLine === n
        return (
          <div
            key={i}
            className={cn(
              'flex gap-3',
              isErr && 'bg-red-500/15 -mx-3 px-3 border-l-2 border-red-500',
            )}
          >
            <span className="shrink-0 select-none text-muted-foreground tabular-nums">
              {n.toString().padStart(3, ' ')}
            </span>
            <span className="whitespace-pre-wrap break-all">{line}</span>
          </div>
        )
      })}
    </pre>
  )
}

function LogsTab({ turn }: { turn: TurnActivity }) {
  if (!turn.logs.length) {
    return (
      <div className="p-3 text-xs text-muted-foreground">
        No console output.
      </div>
    )
  }
  return (
    <div className="space-y-1 p-2 font-mono text-[11px] leading-5">
      {turn.logs.map((l) => (
        <div
          key={l.id}
          className={cn(
            l.level === 'error' && 'text-red-600 dark:text-red-400',
            l.level === 'warn' && 'text-amber-700 dark:text-amber-400',
            l.level === 'info' && 'text-sky-700 dark:text-sky-400',
          )}
        >
          <span className="mr-2 text-muted-foreground">[{l.level}]</span>
          {l.message}
        </div>
      ))}
    </div>
  )
}

function ResultTab({ turn }: { turn: TurnActivity }) {
  if (turn.terminalError) {
    return (
      <div className="space-y-2 p-3 text-xs">
        <div className="font-semibold text-red-700 dark:text-red-400">
          {turn.terminalError.name ?? 'Error'}
        </div>
        <div className="font-mono text-[11px] text-red-700 dark:text-red-400">
          {turn.terminalError.message}
        </div>
      </div>
    )
  }
  if (turn.returnValue == null) {
    return (
      <div className="p-3 text-xs text-muted-foreground">
        {turn.endedAt ? 'Program returned nothing.' : 'Waiting for result…'}
      </div>
    )
  }
  if (typeof turn.returnValue === 'string') {
    return <div className="p-3 text-xs leading-relaxed">{turn.returnValue}</div>
  }
  return (
    <pre className="max-h-80 overflow-auto bg-muted/30 p-3 font-mono text-[11px] leading-5">
      {JSON.stringify(turn.returnValue, null, 2)}
    </pre>
  )
}

export function ProgramCard({
  turn,
  variant = 'primary',
}: {
  turn: TurnActivity
  variant?: 'primary' | 'subtle'
}) {
  const emptyResult =
    (turn.canvasSnapshot?.rootIds.length ?? 0) === 0 &&
    turn.endedAt != null &&
    turn.status === 'succeeded'
  const tone = toneFromStatus(turn.status, emptyResult)
  const initialTab = turn.terminalError ? 'code' : 'calls'
  const [open, setOpen] = useState(!!turn.terminalError)
  const [tab, setTab] = useState<'calls' | 'code' | 'logs' | 'result'>(initialTab)

  const total = turn.calls.length
  const hasAnything = total > 0 || turn.terminalError || turn.code

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border text-xs',
        toneClasses(tone),
        variant === 'subtle' && 'bg-transparent',
      )}
    >
      <Collapsible.Root open={open} onOpenChange={setOpen}>
        <Collapsible.Trigger asChild>
          <button
            type="button"
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-left transition',
              hasAnything && 'hover:bg-black/5 dark:hover:bg-white/5',
            )}
            disabled={!hasAnything}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-70" />
            <StatusIcon status={turn.status} />
            <span className="flex-1 font-medium">{labelFor(turn)}</span>
            {hasAnything && (
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 transition-transform',
                  open && 'rotate-180',
                )}
              />
            )}
          </button>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <div className="border-t border-current/20 bg-background/70">
            <Tabs.Root
              value={tab}
              onValueChange={(v) => setTab(v as typeof tab)}
            >
              <Tabs.List className="flex gap-1 border-b border-border bg-muted/30 px-2 py-1">
                <TabTrigger value="calls" icon={<Zap className="h-3 w-3" />}>
                  Calls
                  <span className="ml-1 text-muted-foreground">{total}</span>
                </TabTrigger>
                <TabTrigger value="code" icon={<Code2 className="h-3 w-3" />}>
                  Code
                </TabTrigger>
                <TabTrigger value="logs" icon={<Terminal className="h-3 w-3" />}>
                  Logs
                  {turn.logs.length > 0 && (
                    <span className="ml-1 text-muted-foreground">
                      {turn.logs.length}
                    </span>
                  )}
                </TabTrigger>
                <TabTrigger value="result" icon={<FileText className="h-3 w-3" />}>
                  Result
                </TabTrigger>
              </Tabs.List>
              <Tabs.Content value="calls">
                <CallsTab turn={turn} />
              </Tabs.Content>
              <Tabs.Content value="code">
                <CodeTab turn={turn} />
              </Tabs.Content>
              <Tabs.Content value="logs">
                <LogsTab turn={turn} />
              </Tabs.Content>
              <Tabs.Content value="result">
                <ResultTab turn={turn} />
              </Tabs.Content>
            </Tabs.Root>
          </div>
        </Collapsible.Content>
      </Collapsible.Root>
    </div>
  )
}

function TabTrigger({
  value,
  icon,
  children,
}: {
  value: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Tabs.Trigger
      value={value}
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium text-muted-foreground transition',
        'hover:bg-background/60',
        'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      )}
    >
      {icon}
      {children}
    </Tabs.Trigger>
  )
}

export function PriorAttemptChip({
  index,
  error,
  onExpand,
}: {
  index: number
  error: { name?: string; message: string }
  onExpand?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className="inline-flex items-center gap-2 rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] text-red-700 transition hover:bg-red-500/15 dark:text-red-300"
    >
      <AlertTriangle className="h-3 w-3" />
      Attempt {index + 1} failed · {error.name ?? 'Error'}:{' '}
      <span className="font-mono">{truncate(error.message, 60)}</span>
    </button>
  )
}
