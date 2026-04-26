import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Plus, Star } from 'lucide-react'
import { toast } from 'sonner'
import { useCartMutation } from '#/queries/cart'
import { errorMessage } from '#/lib/utils'
import type { Product } from '#/lib/catalog'

function pickDefaultSize(sizes: Array<string>): string | null {
  if (sizes.length === 0) return null
  return sizes[Math.floor(sizes.length / 2)] ?? sizes[0]!
}

function pickDefaultWidth(widths: Product['widths']): Product['widths'][number] {
  return widths.includes('standard') ? 'standard' : widths[0]!
}

export function ProductCard({ product }: { product: Product }) {
  const [state, setState] = useState<'idle' | 'pending' | 'done'>('idle')
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cartMutation = useCartMutation()

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    }
  }, [])

  async function quickAdd(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (state !== 'idle') return
    const size = pickDefaultSize(product.sizes)
    if (!size) return
    setState('pending')
    try {
      await cartMutation.mutateAsync({
        action: 'add',
        productId: product.id,
        size,
        width: pickDefaultWidth(product.widths),
        quantity: 1,
      })
      setState('done')
      toast.success(`Added ${product.name} (size ${size}) to cart`)
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
      resetTimerRef.current = setTimeout(() => setState('idle'), 1600)
    } catch (err) {
      setState('idle')
      toast.error(errorMessage(err, 'Add to cart failed'))
    }
  }

  return (
    <article className="surface surface-hover group cursor-pointer overflow-hidden">
      <div className="relative aspect-[4/5] overflow-hidden bg-surface-3">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-[1.03] group-hover:opacity-100"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface-1 via-transparent to-transparent opacity-80" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20" />
        <div className="text-micro absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2 py-0.5 font-medium uppercase tracking-[0.12em] text-white/90 backdrop-blur">
          <span className="bg-brand-glow h-1 w-1 rounded-full" />
          {product.category}
        </div>
        <button
          type="button"
          onClick={quickAdd}
          disabled={state !== 'idle'}
          aria-label={`Quick-add ${product.name} to cart`}
          className="absolute bottom-3 right-3 flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-3 text-xs font-semibold text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-black/80 disabled:opacity-100"
        >
          {state === 'pending' ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Adding…
            </>
          ) : state === 'done' ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Added
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              Add to cart
            </>
          )}
        </button>
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="eyebrow">{product.brand}</div>
          <div className="text-tag tabular font-semibold text-foreground">${product.price}</div>
        </div>
        <div className="text-lede font-semibold leading-tight tracking-[-0.01em] text-foreground">
          {product.name}
        </div>
        <div className="text-xs text-muted-foreground">{product.color}</div>
        <div className="hairline !my-3" />
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Star className="fill-star stroke-star h-3 w-3" />
            <span className="tabular font-medium text-foreground">{product.rating}</span>
            <span className="tabular">({product.reviewCount.toLocaleString()})</span>
          </div>
          <div className="text-mini uppercase tracking-[0.1em] text-fg-subtle">
            {product.widths.length > 1 ? `${product.widths.length} widths` : 'standard'}
          </div>
        </div>
      </div>
    </article>
  )
}
