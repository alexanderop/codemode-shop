import { useEffect, useState } from 'react'
import { Check, ChevronDown, Copy, FileText } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

type PromptOrigin = 'static' | 'generated' | 'mixed'

interface PromptSection {
  label: string
  content: string
  origin: PromptOrigin
  source: string
}

interface PromptResponse {
  sections: Array<PromptSection>
}

const ORIGIN_META: Record<PromptOrigin, { label: string; tooltip: string; className: string }> = {
  static: {
    label: 'Hand-written',
    tooltip: 'Static text from a constant in the codebase.',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  },
  generated: {
    label: 'Generated',
    tooltip: 'Built dynamically at request time from runtime state.',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  },
  mixed: {
    label: 'Template + generated',
    tooltip: 'Hand-written template with dynamically generated parts.',
    className: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
  },
}

export function SystemPromptSheet({
  open,
  onOpenChange,
  zipCode,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  zipCode: string
}) {
  const [sections, setSections] = useState<Array<PromptSection> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError(null)
    void (async () => {
      try {
        const res = await fetch(`/api/storefront-agent?zipCode=${encodeURIComponent(zipCode)}`)
        if (!res.ok) throw new Error(`Request failed: ${res.status}`)
        const json = (await res.json()) as PromptResponse
        if (cancelled) return
        setSections(json.sections)
        setExpanded(Object.fromEntries(json.sections.map((_, i) => [String(i), i === 0])))
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, zipCode])

  async function copyAll() {
    if (!sections) return
    const text = sections.map((s) => `# ${s.label}\n\n${s.content}`).join('\n\n---\n\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b px-5 py-4">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <SheetTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                System prompt
              </SheetTitle>
              <SheetDescription>
                The exact instructions Storekeeper receives this turn — assembled fresh on the
                server.
              </SheetDescription>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(Object.keys(ORIGIN_META) as Array<PromptOrigin>).map((origin) => {
                  const meta = ORIGIN_META[origin]
                  return (
                    <span
                      key={origin}
                      className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
                        meta.className,
                      )}
                      title={meta.tooltip}
                    >
                      {meta.label}
                    </span>
                  )
                })}
              </div>
            </div>
            {sections && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void copyAll()}
                className="shrink-0"
                aria-label="Copy entire prompt"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="ml-1.5 text-xs">{copied ? 'Copied' : 'Copy all'}</span>
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {!error && !sections && (
            <div className="space-y-2">
              <div className="h-8 animate-pulse rounded-md bg-muted" />
              <div className="h-32 animate-pulse rounded-md bg-muted" />
              <div className="h-8 animate-pulse rounded-md bg-muted" />
            </div>
          )}
          {sections && (
            <div className="space-y-2">
              {sections.map((section, i) => {
                const key = String(i)
                const isOpen = expanded[key] ?? false
                const meta = ORIGIN_META[section.origin]
                return (
                  <section
                    key={section.label}
                    className="overflow-hidden rounded-lg border bg-muted/30"
                  >
                    <button
                      type="button"
                      onClick={() => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition hover:bg-muted/50"
                      aria-expanded={isOpen}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
                            meta.className,
                          )}
                          title={meta.tooltip}
                        >
                          {meta.label}
                        </span>
                        <span className="truncate text-sm font-medium text-foreground">
                          {section.label}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {section.content.length.toLocaleString()} chars
                        </span>
                      </div>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                          isOpen && 'rotate-180',
                        )}
                      />
                    </button>
                    {isOpen && (
                      <>
                        <div className="border-t bg-background/20 px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                          source: {section.source}
                        </div>
                        <pre className="overflow-x-auto border-t bg-background/40 px-3 py-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words text-foreground">
                          {section.content}
                        </pre>
                      </>
                    )}
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
