import { asLookup, renderNode } from '#/components/canvas/render-node'
import type { CanvasSnapshot } from '#/lib/storefront/activity-types'

export function FrozenCanvas({ snapshot }: { snapshot: CanvasSnapshot }) {
  if (!snapshot.rootIds.length) return null
  const lookup = asLookup(snapshot.nodes)
  return (
    <div className="space-y-3">
      {snapshot.rootIds.map((id) => (
        <div key={id}>{renderNode(id, lookup)}</div>
      ))}
    </div>
  )
}
