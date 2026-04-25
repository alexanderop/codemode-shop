import { Star } from 'lucide-react'
import { Card, CardContent, CardFooter } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import type { Product } from '#/lib/catalog'

export function ProductCard({ product }: { product: Product }) {
  return (
    <Card className="overflow-hidden pt-0 transition hover:shadow-lg">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <Badge className="absolute left-3 top-3 bg-background/90 text-foreground hover:bg-background">
          {product.category}
        </Badge>
      </div>
      <CardContent className="px-4">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-sm text-muted-foreground">{product.brand}</div>
          <div className="text-sm font-semibold">${product.price}</div>
        </div>
        <div className="mt-1 line-clamp-1 font-semibold leading-tight">
          {product.name}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{product.color}</div>
      </CardContent>
      <CardFooter className="flex items-center justify-between px-4 pb-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-amber-500 stroke-amber-500" />
          <span className="font-medium text-foreground">{product.rating}</span>
          <span>({product.reviewCount.toLocaleString()})</span>
        </div>
        <div>
          {product.widths.length > 1
            ? `${product.widths.length} widths`
            : 'standard'}
        </div>
      </CardFooter>
    </Card>
  )
}
