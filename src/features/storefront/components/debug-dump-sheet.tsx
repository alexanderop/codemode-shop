import { useEffect, useMemo, useRef, useState } from 'react'
import { Braces, Check, ChevronsDownUp, ChevronsUpDown, Copy } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Button } from '#/components/ui/button'
import { JsonTree, type JsonValue } from '#/features/storefront/components/json-tree'

export function DebugDumpSheet({
  open,
  onOpenChange,
  data,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  data: JsonValue
}) {
  const [copied, setCopied] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [forceOpen, setForceOpen] = useState<boolean | undefined>(undefined)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current)
    },
    [],
  )

  const serialized = useMemo(() => JSON.stringify(data, null, 2), [data])
  const sizeChars = serialized.length

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(serialized)
      setCopied(true)
      if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable (insecure context / iframe) */
    }
  }

  function expandAll() {
    setForceOpen(true)
    setResetKey((k) => k + 1)
  }

  function collapseAll() {
    setForceOpen(false)
    setResetKey((k) => k + 1)
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
                <Braces className="h-4 w-4 text-primary" />
                Chat structure
              </SheetTitle>
              <SheetDescription>
                The full conversation state — messages, activity per turn, and the live UI tree —
                exactly as the drawer sees it. Strings that look like JSON are auto-parsed; toggle
                the badge to see the raw form.
              </SheetDescription>
              <div className="mt-2 text-mini text-muted-foreground tabular-nums">
                {sizeChars.toLocaleString()} chars
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void copyAll()}
                aria-label="Copy entire dump"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span className="ml-1.5 text-xs">{copied ? 'Copied' : 'Copy all'}</span>
              </Button>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={expandAll}
                  aria-label="Expand all nodes"
                  className="flex-1"
                >
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                  <span className="ml-1 text-xs">Expand</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={collapseAll}
                  aria-label="Collapse all nodes"
                  className="flex-1"
                >
                  <ChevronsDownUp className="h-3.5 w-3.5" />
                  <span className="ml-1 text-xs">Collapse</span>
                </Button>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-auto px-5 py-4">
          <JsonTree data={data} defaultExpandDepth={1} resetKey={resetKey} forceOpen={forceOpen} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
