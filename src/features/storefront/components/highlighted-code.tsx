import { useEffect, useMemo, useState } from 'react'
import { createHighlighterCore, type HighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import { cn } from '#/lib/utils'
import { ScrollArea } from '#/components/ui/scroll-area'

let highlighterPromise: Promise<HighlighterCore> | null = null
function getHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= createHighlighterCore({
    themes: [import('shiki/themes/github-dark-default.mjs')],
    langs: [import('shiki/langs/typescript.mjs')],
    engine: createJavaScriptRegexEngine(),
  })
  return highlighterPromise
}

function PlainCode({ code, errLine }: { code: string; errLine?: number }) {
  const lines = code.split('\n')
  return (
    <ScrollArea className="h-80 bg-muted/30">
      <pre className="p-3 font-mono text-[11px] leading-5">
        {lines.map((line, i) => {
          const n = i + 1
          const isErr = errLine === n
          return (
            <div
              // oxlint-disable-next-line no-array-index-key
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
    </ScrollArea>
  )
}

export function HighlightedCode({ code, errLine }: { code: string; errLine?: number }) {
  const [hl, setHl] = useState<HighlighterCore | null>(null)

  useEffect(() => {
    let mounted = true
    getHighlighter().then((h) => {
      if (mounted) setHl(h)
    })
    return () => {
      mounted = false
    }
  }, [])

  const html = useMemo(() => {
    if (!hl) return null
    return hl.codeToHtml(code, {
      lang: 'typescript',
      theme: 'github-dark-default',
      transformers: [
        {
          line(node, line) {
            this.addClassToHast(node, 'shiki-line')
            if (errLine === line) this.addClassToHast(node, 'is-error')
          },
        },
      ],
    })
  }, [hl, code, errLine])

  if (!html) return <PlainCode code={code} errLine={errLine} />

  return (
    <ScrollArea className="h-80">
      <div
        className="shiki-wrapper text-[11px] leading-5"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </ScrollArea>
  )
}
