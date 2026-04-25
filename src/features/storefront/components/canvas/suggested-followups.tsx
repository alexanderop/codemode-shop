import { ArrowUpRight } from 'lucide-react'
import { canvasCallbacks } from '#/features/storefront/components/canvas/canvas-callbacks'
import type { SuggestedFollowupsProps } from '#/features/storefront/types/ui-types'

export function SuggestedFollowups({ suggestions }: SuggestedFollowupsProps) {
  if (suggestions.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Suggested follow-ups">
      {suggestions.map((s) => (
        <button
          key={s.text}
          type="button"
          onClick={() => canvasCallbacks.selectFollowup(s.text)}
          className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-3 py-1 text-xs text-foreground transition hover:bg-muted hover:border-primary/40"
        >
          <span>{s.text}</span>
          <ArrowUpRight className="h-3 w-3 text-muted-foreground" aria-hidden />
        </button>
      ))}
    </div>
  )
}
