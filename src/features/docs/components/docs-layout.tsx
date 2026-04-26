import type { ReactNode } from 'react'
import { SiteHeader } from '#/components/site-header'
import { DocsSidebar } from '#/features/docs/components/docs-sidebar'

export function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="mx-auto flex max-w-6xl gap-12 px-6 pb-24 pt-10">
        <DocsSidebar />
        <article className="prose prose-invert min-w-0 max-w-none flex-1">{children}</article>
      </div>
    </>
  )
}
