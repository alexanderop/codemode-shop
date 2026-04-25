import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PRODUCTS } from '#/lib/catalog'
import { ProductCard } from '#/components/product-card'
import { SiteHeader } from '#/components/site-header'
import { StorekeeperDrawer } from '#/components/storekeeper-drawer'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <SiteHeader onOpenAssistant={() => setDrawerOpen(true)} />
      <main className="mx-auto max-w-6xl px-6 pb-16 pt-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="display-title text-3xl font-bold tracking-tight sm:text-4xl">
              This week's drops
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              30 shoes, honest reviews, a storekeeper that writes TypeScript on
              the fly to pick the right one for you.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {PRODUCTS.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </main>
      <StorekeeperDrawer open={drawerOpen} onOpenChange={setDrawerOpen} />
    </>
  )
}
