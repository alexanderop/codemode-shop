import { useMemo, useState } from 'react'
import { Collapsible } from 'radix-ui'
import { AlertTriangle, Bookmark, Check, ChevronDown, Loader2, X, Zap } from 'lucide-react'
import { cn } from '#/lib/utils'
import type { ExternalCall, SkillReplayActivity } from '#/features/storefront/types/activity-types'

type SkillStatus = 'pending' | 'ok' | 'failed'

function statusOf(skill: SkillReplayActivity): SkillStatus {
  if (skill.endedAt == null) return 'pending'
  if (skill.error) return 'failed'
  return 'ok'
}

function toneClasses(status: SkillStatus): string {
  if (status === 'failed') return 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300'
  if (status === 'ok')
    return 'border-violet-500/40 bg-violet-500/10 text-violet-800 dark:text-violet-300'
  return 'border-border bg-muted/40 text-muted-foreground'
}

function StatusIcon({ status }: { status: SkillStatus }) {
  if (status === 'failed') return <X className="h-3.5 w-3.5" />
  if (status === 'ok') return <Check className="h-3.5 w-3.5" />
  return <Loader2 className="h-3.5 w-3.5 animate-spin" />
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function formatPreview(value: unknown, max: number): string {
  if (value == null) return ''
  try {
    const s = typeof value === 'string' ? value : JSON.stringify(value)
    return truncate(s, max)
  } catch {
    return ''
  }
}

function labelFor(skill: SkillReplayActivity): string {
  const status = statusOf(skill)
  if (status === 'pending') return `Replaying skill · ${skill.name}`
  if (status === 'failed') return `Skill failed · ${skill.name}`
  const dur =
    skill.endedAt != null && skill.startedAt != null
      ? ` · ${skill.endedAt - skill.startedAt}ms`
      : ''
  return `Used skill · ${skill.name}${dur}`
}

function CallRow({ call }: { call: ExternalCall }) {
  const failed = !!call.error
  const pending = call.endedAt == null
  const duration = call.endedAt != null ? call.endedAt - call.startedAt : undefined
  return (
    <div className="flex items-start gap-2 pl-4 font-mono text-[11px] leading-5">
      <span className="shrink-0 select-none text-muted-foreground">├─</span>
      <span className="min-w-0 flex-1">
        <span className={cn(call.kind === 'render' && 'text-violet-600 dark:text-violet-400')}>
          {call.function}
        </span>
        <span className="text-muted-foreground">({formatPreview(call.args, 80)})</span>
        {failed && (
          <span className="ml-2 text-red-600 dark:text-red-400">✗ {truncate(call.error!, 80)}</span>
        )}
        {!failed && !pending && (
          <span className="ml-2 text-emerald-700 dark:text-emerald-400">
            ✓ {formatPreview(call.result, 60)}
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

export function SkillCard({ skill }: { skill: SkillReplayActivity }) {
  const status = statusOf(skill)
  const inputPreview = useMemo(() => formatPreview(skill.input, 80), [skill.input])
  const hasDetails =
    skill.calls.length > 0 || !!skill.error || skill.result != null || !!inputPreview
  const [open, setOpen] = useState(status === 'pending' || status === 'failed')

  return (
    <div className={cn('overflow-hidden rounded-lg border text-xs', toneClasses(status))}>
      <Collapsible.Root open={open} onOpenChange={setOpen}>
        <Collapsible.Trigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
            disabled={!hasDetails}
          >
            <Bookmark className="h-3.5 w-3.5 shrink-0 opacity-70" />
            <StatusIcon status={status} />
            <span className="flex-1 truncate font-medium">{labelFor(skill)}</span>
            {skill.calls.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <Zap className="h-3 w-3" />
                {skill.calls.length}
              </span>
            )}
            {hasDetails && (
              <ChevronDown
                className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')}
              />
            )}
          </button>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <div className="space-y-2 border-t border-current/20 bg-background/70 p-2">
            {inputPreview && (
              <div className="font-mono text-[11px] leading-5">
                <span className="mr-2 text-muted-foreground">input</span>
                <span>{inputPreview}</span>
              </div>
            )}
            {skill.calls.length > 0 && (
              <div className="space-y-0.5">
                {skill.calls.map((c) => (
                  <CallRow key={c.id} call={c} />
                ))}
              </div>
            )}
            {skill.error && (
              <div className="flex items-start gap-2 rounded border border-red-500/30 bg-red-500/10 p-2 font-mono text-[11px] text-red-700 dark:text-red-300">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>{skill.error}</span>
              </div>
            )}
            {!skill.error && skill.result != null && (
              <div className="font-mono text-[11px] leading-5">
                <span className="mr-2 text-muted-foreground">→</span>
                <span>{formatPreview(skill.result, 200)}</span>
              </div>
            )}
          </div>
        </Collapsible.Content>
      </Collapsible.Root>
    </div>
  )
}

export function SkillRegisteredBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
      <Bookmark className="h-3 w-3" />
      Saved as skill · {name}
    </span>
  )
}
