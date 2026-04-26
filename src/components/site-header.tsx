import { BookOpen, Keyboard, ShoppingBag, Sparkles } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useCartCount } from '#/queries/cart'
import { assistantUi } from '#/stores/assistant-ui'
import { cheatsheetUi } from '#/stores/cheatsheet-ui'

export function SiteHeader() {
  const count = useCartCount()
  return (
    <header className="glass-header sticky top-0 z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="shadow-brand-glow flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-brand to-brand-deep text-white">
            <ShoppingBag className="h-3 w-3" strokeWidth={2.4} />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-tag font-semibold tracking-tight text-foreground">
              codemode.shop
            </div>
            <span className="hidden h-3 w-px bg-line-strong sm:inline-block" />
            <div className="hidden text-xs text-muted-foreground sm:block">
              shoes, but the AI does the work
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={assistantUi.open}
            className="group flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-line-strong hover:bg-surface-3"
          >
            <Sparkles className="h-3.5 w-3.5 text-brand-glow" strokeWidth={2.2} />
            <span>Ask Storekeeper</span>
            <kbd className="ml-1 hidden rounded border border-border bg-surface-3 px-1.5 font-mono text-micro text-fg-subtle sm:inline">
              ⌘K
            </kbd>
          </button>
          <Link
            to="/docs"
            aria-label="Docs"
            title="Docs"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          >
            <BookOpen className="h-4 w-4" strokeWidth={2} />
          </Link>
          <button
            type="button"
            onClick={cheatsheetUi.open}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          >
            <Keyboard className="h-4 w-4" strokeWidth={2} />
          </button>
          <Link
            to="/cart"
            aria-label="Cart"
            title="Cart (G then C)"
            className="relative flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={2} />
            {count > 0 && (
              <span className="tabular pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-micro font-semibold text-white">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
