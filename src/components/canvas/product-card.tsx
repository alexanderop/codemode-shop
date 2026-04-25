import { Star } from 'lucide-react'
import { cn } from '#/lib/utils'
import { Card, CardContent } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import type { ProductCardProps } from '#/lib/storefront/ui-types'

export function LiveProductCard({
  props,
  children,
}: {
  props: ProductCardProps
  children?: React.ReactNode
}) {
  return (
    <Card
      className={cn(
        'overflow-hidden pt-0 transition',
        props.highlight && 'ring-2 ring-primary shadow-lg',
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        <img
          src={props.imageUrl}
          alt={props.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {props.highlight && (
          <Badge className="absolute left-3 top-3 bg-amber-500 text-white hover:bg-amber-500">
            Best match
          </Badge>
        )}
      </div>
      <CardContent className="space-y-2 px-4">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="text-xs text-muted-foreground">{props.brand}</div>
            <div className="font-semibold leading-tight">{props.name}</div>
            {props.color && (
              <div className="text-xs text-muted-foreground">{props.color}</div>
            )}
          </div>
          <div className="shrink-0 text-right">
            <div className="font-semibold">${props.price}</div>
            {props.rating != null && (
              <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-amber-500 stroke-amber-500" />
                {props.rating.toFixed(1)}
              </div>
            )}
          </div>
        </div>
        {children && <div className="space-y-2 pt-1">{children}</div>}
      </CardContent>
    </Card>
  )
}
