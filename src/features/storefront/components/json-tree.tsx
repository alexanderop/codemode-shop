import { useMemo, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '#/lib/utils'

type JsonPrimitive = string | number | boolean | null | undefined
export type JsonValue = JsonPrimitive | Array<JsonValue> | { [k: string]: JsonValue }

function getKind(
  v: JsonValue,
): 'null' | 'undefined' | 'array' | 'object' | 'string' | 'number' | 'boolean' {
  if (v === null) return 'null'
  if (v === undefined) return 'undefined'
  if (Array.isArray(v)) return 'array'
  const t = typeof v
  if (t === 'string' || t === 'number' || t === 'boolean') return t
  return 'object'
}

function tryParseNested(s: string): JsonValue | undefined {
  if (s.length < 2) return undefined
  const first = s[0]
  if (first !== '{' && first !== '[') return undefined
  try {
    const parsed = JSON.parse(s) as unknown
    if (parsed !== null && typeof parsed === 'object') return parsed as JsonValue
  } catch {
    return undefined
  }
  return undefined
}

interface JsonTreeProps {
  data: JsonValue
  defaultExpandDepth?: number
  /** Bump to force-remount and reset all per-node open state. */
  resetKey?: number
  /** When defined, every node initializes open to this value (used for expand/collapse all). */
  forceOpen?: boolean
}

export function JsonTree({ data, defaultExpandDepth = 1, resetKey = 0, forceOpen }: JsonTreeProps) {
  return (
    <div key={resetKey} className="font-mono text-mini leading-relaxed text-foreground">
      <JsonNode
        value={data}
        depth={0}
        defaultExpandDepth={defaultExpandDepth}
        forceOpen={forceOpen}
      />
    </div>
  )
}

interface JsonNodeProps {
  name?: string | number
  value: JsonValue
  depth: number
  defaultExpandDepth: number
  forceOpen?: boolean
  trailingComma?: boolean
  /** Rendered between the key and colon — used for the "JSON" parse-toggle badge. */
  keyAccessory?: ReactNode
}

function JsonNode({
  name,
  value,
  depth,
  defaultExpandDepth,
  forceOpen,
  trailingComma = false,
  keyAccessory,
}: JsonNodeProps) {
  const kind = getKind(value)
  const initialOpen = forceOpen ?? depth < defaultExpandDepth
  const [open, setOpen] = useState(initialOpen)
  const [showParsed, setShowParsed] = useState(true)

  const renderKey =
    name === undefined ? null : (
      <>
        <span className="text-brand-fg">{typeof name === 'number' ? name : `"${name}"`}</span>
        {keyAccessory}
        <span className="text-muted-foreground">: </span>
      </>
    )

  const entries = useMemo<Array<[string | number, JsonValue]>>(() => {
    if (kind === 'array') return (value as Array<JsonValue>).map((v, i) => [i, v])
    if (kind === 'object') return Object.entries(value as { [k: string]: JsonValue })
    return []
  }, [kind, value])

  const parsedString = useMemo(
    () => (kind === 'string' ? tryParseNested(value as string) : undefined),
    [kind, value],
  )

  if (kind === 'object' || kind === 'array') {
    const isArr = kind === 'array'
    const count = entries.length
    const openBracket = isArr ? '[' : '{'
    const closeBracket = isArr ? ']' : '}'

    if (count === 0) {
      return (
        <div>
          {renderKey}
          <span className="text-muted-foreground">
            {openBracket}
            {closeBracket}
          </span>
          {trailingComma && <span className="text-muted-foreground">,</span>}
        </div>
      )
    }

    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="group inline-flex max-w-full items-baseline gap-1 text-left hover:text-foreground"
          aria-expanded={open}
        >
          <ChevronRight
            className={cn(
              'h-3 w-3 shrink-0 self-center text-muted-foreground transition-transform group-hover:text-foreground',
              open && 'rotate-90',
            )}
          />
          {renderKey}
          <span className="text-muted-foreground">{openBracket}</span>
          {!open && (
            <>
              <span className="text-fg-subtle italic">
                {count} {isArr ? (count === 1 ? 'item' : 'items') : count === 1 ? 'key' : 'keys'}
              </span>
              <span className="text-muted-foreground">{closeBracket}</span>
              {trailingComma && <span className="text-muted-foreground">,</span>}
            </>
          )}
        </button>
        {open && (
          <>
            <div className="ml-1.5 border-l border-line pl-3">
              {entries.map(([k, v], i) => (
                <JsonNode
                  key={k}
                  name={k}
                  value={v}
                  depth={depth + 1}
                  defaultExpandDepth={defaultExpandDepth}
                  forceOpen={forceOpen}
                  trailingComma={i < count - 1}
                />
              ))}
            </div>
            <div>
              <span className="ml-3 text-muted-foreground">{closeBracket}</span>
              {trailingComma && <span className="text-muted-foreground">,</span>}
            </div>
          </>
        )}
      </div>
    )
  }

  if (kind === 'string' && parsedString !== undefined) {
    const badge = (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setShowParsed((s) => !s)
        }}
        className={cn(
          'mx-1 inline-flex items-center rounded border px-1 py-0 align-middle font-sans text-[9px] font-semibold uppercase tracking-wide transition',
          showParsed
            ? 'border-brand-line bg-brand-soft text-brand-fg hover:border-brand-fg/40'
            : 'border-line bg-surface-2 text-muted-foreground hover:border-line-strong hover:text-foreground',
        )}
        title={showParsed ? 'Show as raw string' : 'Parse as JSON'}
      >
        {showParsed ? 'JSON' : 'STR'}
      </button>
    )
    if (showParsed) {
      return (
        <JsonNode
          name={name}
          value={parsedString}
          depth={depth}
          defaultExpandDepth={defaultExpandDepth}
          forceOpen={forceOpen}
          trailingComma={trailingComma}
          keyAccessory={badge}
        />
      )
    }
    return (
      <div className="break-words">
        {name === undefined ? null : (
          <>
            <span className="text-brand-fg">{typeof name === 'number' ? name : `"${name}"`}</span>
            {badge}
            <span className="text-muted-foreground">: </span>
          </>
        )}
        <Primitive kind="string" value={value} trailingComma={trailingComma} />
      </div>
    )
  }

  return (
    <div className="break-words">
      {renderKey}
      <Primitive kind={kind} value={value} trailingComma={trailingComma} />
    </div>
  )
}

function Primitive({
  kind,
  value,
  trailingComma,
}: {
  kind: ReturnType<typeof getKind>
  value: JsonValue
  trailingComma: boolean
}) {
  let body: ReactNode
  switch (kind) {
    case 'string':
      body = (
        <span className="whitespace-pre-wrap break-words text-emerald-400">
          "{value as string}"
        </span>
      )
      break
    case 'number':
      body = <span className="tabular-nums text-amber-400">{String(value)}</span>
      break
    case 'boolean':
      body = <span className="text-sky-400">{String(value)}</span>
      break
    case 'null':
      body = <span className="italic text-fg-subtle">null</span>
      break
    case 'undefined':
      body = <span className="italic text-fg-subtle">undefined</span>
      break
    default:
      body = <span className="text-muted-foreground">{String(value)}</span>
  }
  return (
    <>
      {body}
      {trailingComma && <span className="text-muted-foreground">,</span>}
    </>
  )
}
