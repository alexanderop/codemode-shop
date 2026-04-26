import { cn } from '#/lib/utils'

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-4 items-center rounded border border-border bg-surface-3 px-1 font-mono text-[10px] leading-none text-fg-subtle',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
