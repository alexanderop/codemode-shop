import { ShoppingBag, Sparkles } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { useCartCount } from '#/lib/client-cart'

export function SiteHeader({ onOpenAssistant }: { onOpenAssistant: () => void }) {
  const count = useCartCount()
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShoppingBag className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold tracking-tight">codemode.shop</div>
            <div className="text-xs text-muted-foreground">
              shoes, but the AI does the work
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="gap-2"
            onClick={onOpenAssistant}
          >
            <Sparkles className="h-4 w-4" />
            Ask Storekeeper
          </Button>
          <div className="relative">
            <Button size="icon" variant="ghost" aria-label="Cart">
              <ShoppingBag className="h-5 w-5" />
            </Button>
            {count > 0 && (
              <Badge className="pointer-events-none absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-[10px]">
                {count}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
