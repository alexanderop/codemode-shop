import { createFileRoute } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { PRODUCTS } from '#/lib/catalog'
import { ProductCard } from '#/components/product-card'
import { SiteHeader } from '#/components/site-header'
import { assistantUi } from '#/stores/assistant-ui'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 pb-24">
        <section className="rise-in pb-12 pt-20 sm:pb-16 sm:pt-28">
          <div className="flex items-center gap-2">
            <span className="text-mini inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-soft px-2.5 py-1 font-medium tracking-[0.06em] text-brand-fg">
              <span className="relative flex h-1.5 w-1.5">
                <span className="bg-brand-glow absolute inset-0 animate-ping rounded-full opacity-75" />
                <span className="bg-brand-glow relative h-1.5 w-1.5 rounded-full" />
              </span>
              Drop 04 · Spring 2026
            </span>
          </div>
          <h1 className="display-title mt-6 text-5xl sm:text-6xl lg:text-7xl">
            This week's drops.
            <br />
            <span className="text-muted-foreground">Picked by an AI storekeeper.</span>
          </h1>
          <p className="text-lede mt-6 max-w-2xl text-muted-foreground">
            30 shoes, honest reviews, and a storekeeper that writes TypeScript on the fly to surface
            the right pair for you. Ask anything — fit, terrain, cushioning, weather — and watch it
            work.
          </p>
          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={assistantUi.open}
              className="text-tag group inline-flex items-center gap-2 rounded-md bg-white px-3.5 py-2 font-medium text-black hover:bg-white/90"
            >
              Try the storekeeper
              <ArrowUpRight
                className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                strokeWidth={2.2}
              />
            </button>
            <a
              href="#catalog"
              className="text-tag inline-flex items-center gap-1.5 rounded-md px-3 py-2 font-medium text-muted-foreground hover:text-foreground"
            >
              Browse the drop
            </a>
          </div>
        </section>

        <div className="hairline" />

        <section id="catalog" className="pt-12">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <div className="eyebrow eyebrow-accent">/ Catalog</div>
              <h2 className="text-section mt-2 font-semibold tracking-[-0.02em] text-foreground">
                The full drop
              </h2>
            </div>
            <div className="hidden text-xs text-muted-foreground sm:block">
              <span className="tabular text-foreground">{PRODUCTS.length}</span> pairs available
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {PRODUCTS.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      </main>
    </>
  )
}
