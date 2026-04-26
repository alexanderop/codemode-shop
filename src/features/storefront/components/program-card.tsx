import { useEffect, useMemo, useRef, useState } from 'react'
import { Collapsible, Tabs } from 'radix-ui'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Code2,
  Copy,
  FileText,
  Info,
  Loader2,
  Sparkles,
  Terminal,
  X,
  Zap,
} from 'lucide-react'
import { cn } from '#/lib/utils'
import { HighlightedCode } from '#/features/storefront/components/highlighted-code'
import { SkillRegisteredBadge } from '#/features/storefront/components/skill-card'
import type {
  ExternalCall,
  TurnActivity,
  TurnStatus,
} from '#/features/storefront/types/activity-types'

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

function labelWriting(): string {
  return 'Writing program…'
}

function labelRunning(turn: TurnActivity): string {
  const inflight = turn.calls.filter((c) => !c.endedAt).length
  return inflight > 0 ? `Running · ${inflight} in flight` : 'Running program…'
}

function labelRendering(): string {
  return 'Rendering results…'
}

function labelFailed(turn: TurnActivity): string {
  const msg = turn.terminalError?.message ?? 'Program failed'
  return `Program failed · ${truncate(msg, 60)}`
}

function labelWarned(turn: TurnActivity): string {
  const total = turn.calls.length
  const failed = turn.calls.filter((c) => c.error).length
  const dur = formatDuration(turn)
  return `Ran program · ${total - failed} of ${total} calls ok${dur}`
}

function labelSucceeded(turn: TurnActivity): string {
  const total = turn.calls.length
  if (total === 0) {
    const emptyResult = (turn.canvasSnapshot?.rootIds.length ?? 0) === 0
    return emptyResult ? 'No program ran' : 'Finished (no program)'
  }
  return `Ran program · ${total} calls${formatDuration(turn)}`
}

function formatDuration(turn: TurnActivity): string {
  const duration = turn.endedAt && turn.startedAt ? turn.endedAt - turn.startedAt : undefined
  return duration != null ? ` · ${duration}ms` : ''
}

const LABEL_BY_STATUS: Record<TurnStatus, (turn: TurnActivity) => string> = {
  writing: labelWriting,
  running: labelRunning,
  rendering: labelRendering,
  failed: labelFailed,
  warned: labelWarned,
  succeeded: labelSucceeded,
}

function labelFor(turn: TurnActivity): string {
  return LABEL_BY_STATUS[turn.status](turn)
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
  const duration = call.endedAt != null ? call.endedAt - call.startedAt : undefined
  return (
    <div className={cn('flex items-start gap-2 font-mono text-[11px] leading-5', indent && 'pl-4')}>
      <span className="shrink-0 select-none text-muted-foreground">{indent ? '├─' : '─'}</span>
      <span className="min-w-0 flex-1">
        <span className={cn(call.kind === 'render' && 'text-violet-600 dark:text-violet-400')}>
          {call.function}
        </span>
        <span className="text-muted-foreground">({formatArgs(call.args)})</span>
        {failed && (
          <span className="ml-2 text-red-600 dark:text-red-400">✗ {truncate(call.error!, 80)}</span>
        )}
        {!failed && !pending && (
          <span className="ml-2 text-emerald-700 dark:text-emerald-400">
            ✓ {formatResult(call.result)}
          </span>
        )}
        {pending && <span className="ml-2 text-muted-foreground">…</span>}
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
        {failCount > 0 && (
          <span className="text-red-600 dark:text-red-400">, {failCount} failed</span>
        )}
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
    return <div className="p-3 text-xs text-muted-foreground">No calls yet.</div>
  }
  return (
    <div className="space-y-1 p-2">
      {groups.map((g) => (
        <GroupRow key={g.groupId} group={g} />
      ))}
      {turn.endedAt && turn.returnValue != null && (
        <div className="pt-1 font-mono text-[11px] text-muted-foreground">
          → returned{' '}
          {truncate(
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
  const isStreaming = turn.status === 'writing' && !turn.endedAt
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isStreaming || !ref.current) return
    const scroller = ref.current.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]')
    if (scroller) scroller.scrollTop = scroller.scrollHeight
  }, [turn.code, isStreaming])

  if (!turn.code) {
    if (turn.endedAt) {
      return (
        <div className="p-3 text-xs text-muted-foreground">No code captured for this turn.</div>
      )
    }
    return (
      <div className="flex items-center gap-2 p-3 font-mono text-[11px] text-muted-foreground">
        <span className="inline-block h-3 w-1.5 animate-pulse bg-foreground/70" />
        <span>Model is writing the program…</span>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <HighlightedCode code={turn.code} errLine={turn.terminalError?.line} />
      <CopyCodeButton code={turn.code} />
      {isStreaming && (
        <div className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/85 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          streaming
        </div>
      )}
    </div>
  )
}

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(id)
  }, [copied])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      // clipboard unavailable (insecure context, etc.) — silent fail
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? 'Code copied' : 'Copy code'}
      className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background/80 text-muted-foreground shadow-sm backdrop-blur transition hover:bg-background hover:text-foreground"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  )
}

function LogsTab({ turn }: { turn: TurnActivity }) {
  if (!turn.logs.length) {
    return <div className="p-3 text-xs text-muted-foreground">No console output.</div>
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

function phaseState(done: boolean, active: boolean, failed: boolean) {
  if (failed) return 'failed'
  if (done) return 'done'
  if (active) return 'active'
  return 'pending'
}

function PhaseDot({ state }: { state: 'done' | 'active' | 'failed' | 'pending' }) {
  return (
    <span
      className={cn(
        'mt-1 h-2 w-2 shrink-0 rounded-full',
        state === 'done' && 'bg-emerald-500',
        state === 'active' && 'animate-pulse bg-sky-500',
        state === 'failed' && 'bg-red-500',
        state === 'pending' && 'bg-muted-foreground/30',
      )}
    />
  )
}

function CodeModeSummary({ turn }: { turn: TurnActivity }) {
  const dataCalls = turn.calls.filter((c) => c.kind === 'data')
  const renderCalls = turn.calls.filter((c) => c.kind === 'render')
  const returned = turn.returnValue != null || !!turn.terminalError
  const failed = !!turn.terminalError
  const phases = [
    {
      label: 'Write TypeScript',
      detail: turn.codeLength ? `${turn.codeLength} chars` : 'model is composing',
      state: phaseState(!!turn.code || !!turn.codeLength, turn.status === 'writing', failed),
    },
    {
      label: 'Run sandbox',
      detail: turn.endedAt ? `${turn.endedAt - turn.startedAt}ms` : 'isolated Node context',
      state: phaseState(turn.calls.length > 0 || returned, turn.status === 'running', failed),
    },
    {
      label: 'Fetch data',
      detail: `${dataCalls.length} catalog call${dataCalls.length === 1 ? '' : 's'}`,
      state: phaseState(
        dataCalls.some((c) => c.endedAt),
        dataCalls.some((c) => !c.endedAt),
        false,
      ),
    },
    {
      label: 'Render UI',
      detail: `${renderCalls.length} UI event${renderCalls.length === 1 ? '' : 's'}`,
      state: phaseState(
        (turn.canvasSnapshot?.rootIds.length ?? 0) > 0,
        turn.status === 'rendering',
        false,
      ),
    },
    {
      label: 'Return answer',
      detail: failed ? 'needs retry' : returned ? 'ready for shopper' : 'waiting',
      state: phaseState(returned && !failed, false, failed),
    },
  ] as const

  return (
    <div className="grid gap-2 border-b border-border bg-muted/20 p-3 sm:grid-cols-5">
      {phases.map((phase) => (
        <div key={phase.label} className="flex min-w-0 gap-2">
          <PhaseDot state={phase.state} />
          <div className="min-w-0">
            <div className="truncate text-[11px] font-semibold text-foreground">{phase.label}</div>
            <div className="truncate text-[10px] text-muted-foreground">{phase.detail}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function CodeModeExplainer({ turn }: { turn: TurnActivity }) {
  const [open, setOpen] = useState(false)
  const dataCount = turn.calls.filter((c) => c.kind === 'data').length
  const renderCount = turn.calls.filter((c) => c.kind === 'render').length
  const groups = groupCalls(turn.calls)
  const duration = turn.endedAt ? turn.endedAt - turn.startedAt : undefined

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setOpen((v) => !v)
        }}
        className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] text-muted-foreground transition hover:bg-background/70 hover:text-foreground"
      >
        <Info className="h-3 w-3" />
        How
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="How Code Mode worked"
          className="absolute right-0 top-full z-20 mt-1 w-72 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg"
        >
          <div className="font-semibold">How Code Mode worked</div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            The model wrote one TypeScript program, ran it in a sandbox, called store tools from
            that program, and streamed UI components back as custom events.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <Metric label="Data calls" value={dataCount} />
            <Metric label="UI renders" value={renderCount} />
            <Metric label="Parallel groups" value={groups.length} />
            <Metric label="Duration" value={duration == null ? 'live' : `${duration}ms`} />
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded border bg-background/70 p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-mono text-xs font-semibold">{value}</div>
    </div>
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
  const initialTab = turn.endedAt && !turn.terminalError ? 'calls' : 'code'
  const [open, setOpen] = useState(!turn.endedAt || !!turn.terminalError)
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
        <div className="flex items-center gap-1 px-3 py-2 transition hover:bg-black/5 dark:hover:bg-white/5">
          <Collapsible.Trigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              disabled={!hasAnything}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <StatusIcon status={turn.status} />
              <span className="flex-1 truncate font-medium">{labelFor(turn)}</span>
              {turn.skillRegistered && <SkillRegisteredBadge name={turn.skillRegistered.name} />}
              {hasAnything && (
                <ChevronDown
                  className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')}
                />
              )}
            </button>
          </Collapsible.Trigger>
          <CodeModeExplainer turn={turn} />
        </div>
        <Collapsible.Content>
          <div className="border-t border-current/20 bg-background/70">
            <CodeModeSummary turn={turn} />
            <Tabs.Root value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
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
                    <span className="ml-1 text-muted-foreground">{turn.logs.length}</span>
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
