import { AlertCircle } from 'lucide-react'
import { Button } from '#/components/ui/button'

export function InlineErrorCard({
  title,
  message,
  details,
  onRetry,
  onAskDifferently,
}: {
  title: string
  message: string
  details?: string
  onRetry?: () => void
  onAskDifferently?: () => void
}) {
  return (
    <div className="mr-auto max-w-[85%] rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-900 dark:text-red-200">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="font-semibold">{title}</div>
          <div className="text-red-800/90 dark:text-red-300/90">{message}</div>
          {details && (
            <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-red-500/10 p-2 font-mono text-[10px] leading-4">
              {details}
            </pre>
          )}
          <div className="flex gap-2 pt-1">
            {onRetry && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 border-red-500/40 bg-background text-xs"
                onClick={onRetry}
              >
                Retry
              </Button>
            )}
            {onAskDifferently && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={onAskDifferently}
              >
                Ask differently
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
