import { cn } from '#/lib/utils'
import type { ComparisonTableProps } from '#/lib/storefront/ui-types'

export function ComparisonTable(props: ComparisonTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border text-xs">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground"></th>
            {props.columnHeaders.map((h, i) => (
              <th
                key={i}
                className={cn(
                  'px-2 py-1.5 text-left font-medium',
                  i === props.winnerColumn && 'bg-amber-500/20 text-foreground',
                )}
              >
                {h}
                {i === props.winnerColumn && (
                  <span className="ml-1 rounded bg-amber-500 px-1 text-[10px] text-white">
                    best
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((row, ri) => (
            <tr key={ri} className="border-t">
              <td className="px-2 py-1.5 text-muted-foreground">{row.label}</td>
              {row.values.map((v, ci) => (
                <td
                  key={ci}
                  className={cn(
                    'px-2 py-1.5',
                    ci === props.winnerColumn && 'bg-amber-500/10 font-medium',
                  )}
                >
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
