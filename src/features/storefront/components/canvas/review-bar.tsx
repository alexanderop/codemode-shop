import { Star, ThumbsDown, ThumbsUp } from 'lucide-react'
import type { ReviewBarProps } from '#/features/storefront/types/ui-types'

export function ReviewBar(props: ReviewBarProps) {
  return (
    <div className="space-y-1.5 rounded-md border bg-muted/30 px-2 py-2 text-xs">
      <div className="flex items-center gap-1">
        <Star className="h-3.5 w-3.5 fill-amber-500 stroke-amber-500" />
        <span className="font-medium">{props.rating.toFixed(1)}</span>
        <span className="text-muted-foreground">
          · {props.reviewCount.toLocaleString()} reviews
        </span>
      </div>
      {props.praise.length > 0 && (
        <div className="flex items-start gap-1.5">
          <ThumbsUp className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
          <span className="text-muted-foreground">{props.praise.join(' · ')}</span>
        </div>
      )}
      {props.complaints.length > 0 && (
        <div className="flex items-start gap-1.5">
          <ThumbsDown className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
          <span className="text-muted-foreground">{props.complaints.join(' · ')}</span>
        </div>
      )}
    </div>
  )
}
