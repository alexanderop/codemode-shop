# Narrated-Trace HTML Patterns

Reference for generating walkthrough HTML files that show **one real execution traced top-to-bottom** — instead of a clickable diagram, the reader scrolls a vertical timeline of 5–9 steps. Each step shows the _actual artifact_ (HTTP body, code, log, JSON event, JSX) at that point in execution.

Use this format when the user asks for "step by step", "trace one", "walk me through one example", "from keystroke to X", or any request whose natural answer is "let me show you what happens when…". Use [html-patterns.md](html-patterns.md) instead for architectural overviews and ER schemas.

## Architecture: same as html-patterns.md, minus Mermaid

- **Native ES modules** via `<script type="module">` — no Babel
- **Shiki via ESM** — `import { createHighlighter } from 'shiki'`
- **React/ReactDOM as UMD globals** — `React.createElement()` everywhere, no JSX
- **No Mermaid, no pan/zoom** — the page is a normal scrollable column
- All examples below show JSX for readability — generated HTML must use `React.createElement()`

## Design Principles

1. **Always dark mode** — Black bg, white text, purple accents. Set `<html style="color-scheme: dark">`, `<body class="bg-wt-bg">`. The `color-scheme: dark` on `<html>` is **mandatory**.
2. **Linear, no branching** — One execution path, top to bottom. No parallel branches, no "meanwhile…". If the real flow has parallel branches, pick the main path and footnote the rest in the description.
3. **Show artifacts, not abstractions** — Each step's `code` block is a _real artifact_ (HTTP body, generated program, SSE frame, state diff, JSX) — not a "concept summary". The reader should be able to read the code blocks alone, top to bottom, and watch the data transform.
4. **Realistic data** — Use plausible names, IDs, prices, timestamps. "Aeropress / $39 / p_42" beats "foo / 100 / id_1". Generic placeholders break the illusion.
5. **Numbered steps with a vertical rail** — Big purple numbered badge, gradient rail connecting them. Communicates "step by step" before the reader reads a word.
6. **Kind pill above title** — Small uppercase tag (`HTTP REQUEST`, `TYPESCRIPT PROGRAM`, `SSE FRAME`, `STATE DIFF`, `REACT RENDER`) anchors _what kind of artifact_ the step shows.
7. **TL;DR first** — Card above the timeline. Names the "trick" of the system in 2–3 sentences.
8. **Shiki highlighting** — `vitesse-dark` theme, every step has a code block.

## Color Palette & Tailwind Config

Same `wt-*` tokens as html-patterns.md. Trace pages don't need the `node-*` colors (no diagram nodes).

```html
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          wt: {
            bg: '#000000',
            surface: '#0a0a0a',
            raised: '#141414',
            border: '#2a2a2a',
            fg: '#ffffff',
            muted: '#a0a0a0',
            accent: '#a855f7',
            file: '#c084fc',
            red: '#ef4444',
          },
        },
      },
    },
  }
</script>
```

## CDN Dependencies

```html
<script src="https://cdn.tailwindcss.com"></script>
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
```

No Mermaid. Shiki via ESM `import` inside `<script type="module">`.

## Minimal CSS

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Step body: prose + code blocks */
.step-body p {
  color: #a0a0a0;
  font-size: 0.95rem;
  line-height: 1.7;
  margin-bottom: 14px;
}
.step-body p code {
  background: rgba(168, 85, 247, 0.12);
  padding: 1px 6px;
  border-radius: 4px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.85rem;
  color: #c084fc;
}
.step-body .shiki,
.step-body pre.code-fallback {
  background: #000000 !important;
  border: 1px solid #2a2a2a;
  border-radius: 10px;
  padding: 18px 20px;
  overflow-x: auto;
  margin: 0;
}
.step-body .shiki code,
.step-body pre.code-fallback code {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.82rem;
  line-height: 1.65;
  background: none;
  padding: 0;
  border-radius: 0;
}
.step-body .shiki code {
  color: inherit;
}
.step-body pre.code-fallback code {
  color: #e0e0e0;
}

/* Vertical timeline rail (drawn relative to each .rail .article) */
.rail::before {
  content: '';
  position: absolute;
  left: 27px;
  top: 56px;
  bottom: -56px;
  width: 2px;
  background: linear-gradient(to bottom, #a855f7 0%, #2a2a2a 100%);
  opacity: 0.5;
}
.rail:last-child::before {
  display: none;
}
```

## Data Structures

### TITLE / SUBTITLE / TLDR

```js
const TITLE = 'Chat AI Component Rendering'
const SUBTITLE = 'One real message, traced from keystroke to <LiveProductCard />'
const TLDR =
  "2-3 sentences. Names the system's trick — the one thing the reader should walk away knowing. Plain text, no formatting."
```

The subtitle should hint at the trace ("One real message, traced from X to Y"). The TL;DR should name the _non-obvious_ mechanism (e.g., "the AI doesn't issue tool calls — it writes one TypeScript program per turn that runs in a Node isolate").

### STEPS

```js
const STEPS = [
  {
    kind: 'HTTP REQUEST',
    title: '1 · User types a message',
    description: '1-2 sentences in plain text. What happens at this hop, and why.',
    files: ['src/.../storekeeper-drawer.tsx'],
    lang: 'json',
    code: `POST /api/storefront-agent

{
  "messages": [{ "role": "user", "parts": [{ "type": "text", "text": "..." }] }],
  "data": { "zipCode": "94110" }
}`,
  },
  // ... 4–8 more
]
```

Field rules:

- `kind` — short uppercase pill, ≤ 4 words. Names the _kind of artifact_ shown below (HTTP REQUEST, AGENT WIRING, TYPESCRIPT PROGRAM, SANDBOX EXECUTION, SSE FRAME ON THE WIRE, STORE DISPATCH, REACT RENDER, etc.).
- `title` — `N · imperative phrase`. Numeric prefix is required; the badge already shows the number, but readers scanning the page benefit from redundancy. The `·` is a middle dot (U+00B7), not a period.
- `description` — 1–2 sentences, plain text. Renders as `<p>`. May embed inline `<code>` via Markdown-style backticks if needed (handled by your CSS rule for `p code`).
- `files` — array of `"path"` or `"path:lines"` strings. Required.
- `lang` — **required on every step**. Shiki language id (`typescript`, `tsx`, `json`, `bash`, `text`).
- `code` — **required**. The actual artifact. 4–12 lines is the sweet spot; never shorter than 2, rarely longer than 18.

### Suggested step kinds

A trace usually visits some subset of these, in order:

| Kind                                          | What goes in `code`                         |
| --------------------------------------------- | ------------------------------------------- |
| `HTTP REQUEST` / `HTTP RESPONSE`              | request line, headers, body                 |
| `AGENT WIRING` / `CONFIG`                     | the setup snippet that defines what runs    |
| `TYPESCRIPT PROGRAM` / `CODE PATH`            | the code that executes (often AI-generated) |
| `SANDBOX EXECUTION` / `EXECUTION TRACE`       | runtime log of calls, results, transitions  |
| `SSE FRAME ON THE WIRE` / `EVENT` / `MESSAGE` | JSON / SSE / websocket / queue payload      |
| `STORE DISPATCH` / `STATE DIFF`               | what changed in memory                      |
| `REACT RENDER` / `DOM`                        | the rendered JSX or HTML                    |

Mix and match for the system you're tracing. Don't invent kinds that don't fit — they're stylistic anchors, not a taxonomy.

## React Component Architecture

```
App
├── Header (sticky top, title + subtitle)
├── Tldr (card just below header)
├── main
│   └── Step × N (numbered badge + kind pill + title + description + code + files)
└── Footer (one-line outro)
```

### Step component (the main piece)

```jsx
function Step({ index, step, html }) {
  const isLast = index === STEPS.length - 1
  return (
    <article className={`rail relative pl-16 pb-14 ${isLast ? 'pb-0' : ''}`}>
      {/* Number badge anchored to the rail */}
      <div
        className="absolute left-0 top-1 w-14 h-14 rounded-full
                      bg-gradient-to-br from-wt-accent to-purple-700
                      border border-wt-accent/40 flex items-center justify-center
                      text-white font-bold text-lg shadow-lg shadow-wt-accent/20"
      >
        {index + 1}
      </div>
      {/* Kind pill */}
      <div
        className="inline-block text-[0.62rem] uppercase tracking-[0.18em]
                      font-semibold text-wt-accent bg-wt-accent/10
                      border border-wt-accent/25 rounded-full px-2.5 py-0.5 mb-2"
      >
        {step.kind}
      </div>
      {/* Title (strip leading "N · " from the title since the badge shows it) */}
      <h2 className="text-xl font-semibold text-wt-fg mb-2">
        {step.title.replace(/^\d+\s*·\s*/, '')}
      </h2>
      {/* Description + code */}
      <div className="step-body">
        <p>{step.description}</p>
        {html ? (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <pre className="code-fallback">
            <code>{step.code}</code>
          </pre>
        )}
      </div>
      {/* Files */}
      {step.files?.length > 0 && (
        <div className="mt-4 pt-3 border-t border-wt-border/60">
          <div className="text-[0.65rem] uppercase tracking-wider text-wt-muted font-semibold mb-1.5">
            Files
          </div>
          <code className="text-[0.78rem] text-wt-file font-mono leading-relaxed block">
            {step.files.map((f, i) => (
              <span key={i}>
                {f}
                <br />
              </span>
            ))}
          </code>
        </div>
      )}
    </article>
  )
}
```

### Header / Tldr / Footer / App

```jsx
function Header() {
  return (
    <header className="sticky top-0 z-20 bg-wt-bg/85 backdrop-blur border-b border-wt-border">
      <div className="max-w-3xl mx-auto px-6 py-4">
        <h1 className="text-lg font-semibold text-wt-fg">{TITLE}</h1>
        <p className="text-sm text-wt-muted mt-0.5">{SUBTITLE}</p>
      </div>
    </header>
  )
}

function Tldr() {
  return (
    <section className="max-w-3xl mx-auto px-6 pt-10 pb-6">
      <div className="rounded-2xl border border-wt-border bg-wt-surface p-6">
        <div className="text-[0.65rem] uppercase tracking-[0.18em] text-wt-accent font-semibold mb-3">
          TL;DR
        </div>
        <p className="text-wt-fg/90 text-[0.95rem] leading-relaxed">{TLDR}</p>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="max-w-3xl mx-auto px-6 pt-8 pb-20 text-center">
      <p className="text-sm text-wt-muted">{/* one-line outro that names the takeaway */}</p>
    </footer>
  )
}

function App() {
  return (
    <>
      <Header />
      <Tldr />
      <main className="max-w-3xl mx-auto px-6 pt-4">
        {STEPS.map((step, i) => (
          <Step key={i} index={i} step={step} html={HIGHLIGHTED[i]} />
        ))}
      </main>
      <Footer />
    </>
  )
}
```

## Complete Script Block Order

```js
// 1. Import Shiki
import { createHighlighter } from 'https://cdn.jsdelivr.net/npm/shiki@3.22.0/+esm'
// 2. Destructure React globals
const { useState, useEffect } = React
// 3. TITLE, SUBTITLE, TLDR, STEPS
// 4. Shiki init + pre-highlight (per-step, by index)
const langs = [...new Set(STEPS.map((s) => s.lang).filter(Boolean))]
let highlighter = null
try {
  highlighter = await createHighlighter({ themes: ['vitesse-dark'], langs })
} catch (e) {
  console.warn('Shiki failed:', e)
}
const HIGHLIGHTED = STEPS.map((s) => {
  if (!highlighter) return null
  try {
    return highlighter.codeToHtml(s.code, { lang: s.lang, theme: 'vitesse-dark' })
  } catch (e) {
    console.warn('Highlight failed:', e)
    return null
  }
})
// 5. React components (Header, Tldr, Step, Footer, App)
//    using React.createElement() — NOT JSX
// 6. Mount
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App))
```

## Critical Rules

1. **Each `code` is a real artifact, not a concept summary.** If step 3 is "the model writes a program", its code block is the _program_ — not "// the model writes code that searches and renders". If you don't have the literal bytes, derive them faithfully from the surrounding code.
2. **Strict execution order.** Steps must read top-to-bottom in the order things actually happen. Don't reorder for narrative convenience.
3. **5–9 steps.** Fewer than 5 and the trace doesn't feel like a journey; more than 9 and the reader stops scrolling.
4. **Numbered title format.** `N · Imperative phrase` — the badge shows the number, the title repeats it; the regex `/^\d+\s*·\s*/` strips it for display so you don't see "1 · 1 · …".
5. **Kind pill ≤ 4 words.** `HTTP REQUEST` ✓ · `SSE FRAME ON THE WIRE` ✓ · `EXECUTION TRACE FROM THE NODE ISOLATE SANDBOX` ✗
6. **Realistic placeholder data.** Real-looking names, IDs, prices, timestamps. Generic strings break immersion.
7. **Languages auto-collected from STEPS.** Never hardcode the Shiki language list.
8. **Shiki graceful degradation.** Always try/catch `createHighlighter()`. If `null`, render `<pre class="code-fallback">`.
9. **No Mermaid imports.** This template has no diagram. If the user wants both a diagram _and_ a trace, generate two files (or use the Both option in SKILL.md).
10. **Plain text descriptions.** Use `description` (string) rendered as `<p>` — no HTML, no Markdown except inline backticks.

## Quality Checklist

Before finishing a trace walkthrough, verify:

- [ ] **5–9 steps** (count them — strict minimum 5)
- [ ] Each step has `kind`, `title`, `description`, `files`, `lang`, `code` set explicitly
- [ ] Every `code` block is a real artifact (HTTP body, code, log, JSON, JSX) — not a concept summary
- [ ] Realistic data values throughout (no `foo`/`bar`/`...`)
- [ ] Steps read in strict execution order
- [ ] Each `title` is `N · Imperative phrase`
- [ ] Each `kind` pill is ≤ 4 words and uppercase
- [ ] TL;DR is present and ≤ 3 sentences, names the system's "trick"
- [ ] `<html>` tag includes `style="color-scheme: dark"`
- [ ] Files paths are relative to project root and exist
- [ ] No Mermaid scripts/imports
- [ ] Shiki try/catch is in place (graceful fallback)
- [ ] Page renders end-to-end on first load (no JS errors in console)
