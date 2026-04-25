import { Fragment } from 'react'
import type { UINode } from '#/features/storefront/types/ui-types'
import { storefrontUIRenderers } from '#/features/storefront/components/canvas/render-registry'

export type NodeLookup = {
  get: (id: string) => UINode | undefined
}

export function asLookup(nodes: Map<string, UINode> | Record<string, UINode>): NodeLookup {
  if (nodes instanceof Map) return { get: (id) => nodes.get(id) }
  return { get: (id) => nodes[id] }
}

export function renderNode(id: string, lookup: NodeLookup): React.ReactNode {
  const node = lookup.get(id)
  if (!node) return null
  const children = node.childIds.map((cid) => (
    <Fragment key={cid}>{renderNode(cid, lookup)}</Fragment>
  ))
  const renderer = storefrontUIRenderers[node.type] as (
    props: UINode['props'],
    children: React.ReactNode,
  ) => React.ReactNode
  return renderer(node.props, children.length ? children : null)
}
