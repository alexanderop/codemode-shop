import { useEffect, useId, useState } from 'react'

export function Mermaid({ chart }: { chart: string }) {
  const reactId = useId()
  const id = `m${reactId.replace(/[^a-zA-Z0-9]/g, '')}`
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
          themeVariables: {
            background: '#131416',
            primaryColor: '#1a1b1f',
            primaryTextColor: '#f7f8f8',
            primaryBorderColor: 'rgba(255,255,255,0.14)',
            lineColor: '#62666d',
            secondaryColor: '#26282d',
            tertiaryColor: '#08090a',
            mainBkg: '#1a1b1f',
            secondBkg: '#26282d',
            nodeBorder: 'rgba(255,255,255,0.14)',
            clusterBkg: 'rgba(94,106,210,0.10)',
            clusterBorder: 'rgba(94,106,210,0.40)',
            edgeLabelBackground: '#131416',
            tertiaryTextColor: '#f7f8f8',
            secondaryTextColor: '#f7f8f8',
            noteBkgColor: '#26282d',
            noteTextColor: '#f7f8f8',
            noteBorderColor: 'rgba(255,255,255,0.14)',
          },
        })
        const { svg } = await mermaid.render(id, chart.trim())
        if (!cancelled) setSvg(svg)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [chart, id])

  if (error) {
    return (
      <pre className="not-prose overflow-auto rounded-md border border-destructive/40 bg-surface-2 p-4 text-xs text-destructive">
        Mermaid error: {error}
        {'\n\n'}
        {chart}
      </pre>
    )
  }

  if (!svg) {
    return (
      <pre className="not-prose overflow-auto rounded-md border border-line bg-surface-2 p-4 text-xs text-muted-foreground">
        {chart}
      </pre>
    )
  }

  return (
    <div
      className="not-prose flex justify-center overflow-x-auto rounded-md border border-line bg-surface-1 px-4 py-6"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
