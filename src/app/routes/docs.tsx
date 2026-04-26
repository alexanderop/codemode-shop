import { createFileRoute, Outlet } from '@tanstack/react-router'
import { DocsLayout } from '#/features/docs/components/docs-layout'

export const Route = createFileRoute('/docs')({ component: DocsRoot })

function DocsRoot() {
  return (
    <DocsLayout>
      <Outlet />
    </DocsLayout>
  )
}
