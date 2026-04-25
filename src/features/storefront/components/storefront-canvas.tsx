import { useUIState } from '#/features/storefront/stores/ui-store'
import { asLookup, renderNode } from '#/features/storefront/components/canvas/render-node'

export function StorefrontCanvas() {
  const state = useUIState()
  if (state.rootIds.length === 0) return null

  const lookup = asLookup(state.nodes)
  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background p-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
        Storekeeper is rendering
      </div>
      <div className="space-y-3">
        {state.rootIds.map((id) => (
          <div key={id}>{renderNode(id, lookup)}</div>
        ))}
      </div>
    </div>
  )
}
