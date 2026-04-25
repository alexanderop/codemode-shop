import { Loader2 } from 'lucide-react'
import type { LoadingProps } from '#/lib/storefront/ui-types'

export function Loading(props: LoadingProps) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{props.label}</span>
    </div>
  )
}
