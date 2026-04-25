import type { PriceSparklineProps } from '#/lib/storefront/ui-types'

export function PriceSparkline(props: PriceSparklineProps) {
  const { points, currentPrice, lowestPrice, highestPrice } = props
  if (points.length < 2) return null

  const width = 140
  const height = 32
  const min = Math.min(...points.map((p) => p.price))
  const max = Math.max(...points.map((p) => p.price))
  const range = Math.max(1, max - min)

  const path = points
    .map((pt, i) => {
      const x = (i / (points.length - 1)) * width
      const y = height - ((pt.price - min) / range) * height
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')

  const trend =
    currentPrice < points[0]!.price ? 'down' : currentPrice > points[0]!.price ? 'up' : 'flat'
  const stroke =
    trend === 'down'
      ? 'stroke-emerald-500'
      : trend === 'up'
        ? 'stroke-red-500'
        : 'stroke-muted-foreground'

  return (
    <div className="flex items-center justify-between rounded-md border bg-muted/30 px-2 py-1.5">
      <div className="text-[11px] text-muted-foreground">
        <div className="font-medium text-foreground">30-day price</div>
        <div>
          low ${lowestPrice} · high ${highestPrice}
        </div>
      </div>
      <svg width={width} height={height} className="overflow-visible">
        <path
          d={path}
          className={`${stroke} fill-none`}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
