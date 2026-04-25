# Build a code-mode storefront from scratch

You've poked around `codemode.shop`. The Storekeeper drawer streams product cards into the canvas while the LLM's program runs, and the whole thing is one model call. Now you want to build it.

This post is the minimum viable version: a TanStack Start app where an LLM writes a TypeScript program that searches a catalog _and_ renders product cards live. Once that loop works, every other primitive in the real app — comparison tables, CTAs, cart summaries — is just another binding plus another React case. We're going for the smallest thing that proves the loop.

## Overview

In this tutorial, you'll build a tiny shopping assistant that uses code mode to fan out across a product catalog and render the results as live React components. It's intended for developers who've used React and tool-calling LLMs before but haven't wired up `@tanstack/ai-code-mode` themselves. It assumes basic familiarity with:

- React + TypeScript
- Server-Sent Events (SSE)
- LLM tool calling at the conceptual level

By the end of this tutorial, you'll be able to:

- Wire `createCodeMode` into a TanStack Start route with an Anthropic adapter.
- Expose plain TypeScript functions as `external_*` tools the sandbox can call.
- Define a `ui_*` primitive whose calls emit typed SSE events the client renders live.
- Apply those events to a `useSyncExternalStore`-backed reducer and walk the tree to React.

It should take around 45 minutes if you have Node 20 and an Anthropic key handy.

## Background

A traditional tool-calling agent picks one tool per turn — search, then five `getProduct`s, then five `getReviews`. Each turn is a round-trip through the model and another scoop of tokens copied back into context. Code mode collapses all of it into one generation: the model writes a TypeScript program, the host runs it in a V8 isolate (`@tanstack/ai-isolate-node`), and only the final return value comes back. Inside the sandbox, the program has access to a closed vocabulary of async functions you supplied — `external_searchProducts`, `external_getProduct`, etc.

The trick we're adding on top: a _second_ family of bindings — `ui_*` — whose `execute` doesn't compute anything, it just calls `context.emitCustomEvent(...)`. Each call sends a typed event up the SSE stream. A tiny client reducer turns those events into a tree of React components while the program is still running. So the LLM "renders UI" by calling typed functions; the host materializes them.

There's a deeper explainer at [Code mode, explained](./code-mode-explained.md). This post is the build version.

## Before you start

Before you start the tutorial, you should have:

- Node 20+ and `pnpm` installed
- An `ANTHROPIC_API_KEY` from <https://console.anthropic.com>
- A C++ toolchain on your machine — `@tanstack/ai-isolate-node` builds the `isolated-vm` native addon. (On macOS: Xcode CLT. On Linux: `build-essential` + `python3`. If this is a non-starter, swap in `@tanstack/ai-isolate-quickjs`, which is pure WASM.)

## Step 1: Scaffold a TanStack Start app

Create a fresh project and install the AI dependencies you'll need:

```bash
pnpm dlx create-tsrouter-app@latest codemode-mini --template start --add-ons tailwind
cd codemode-mini

pnpm add @tanstack/ai @tanstack/ai-react @tanstack/ai-anthropic \
         @tanstack/ai-code-mode @tanstack/ai-isolate-node \
         zod
```

Add your key to `.env`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Run `pnpm dev` once to confirm the empty app boots on `http://localhost:3000`, then kill it.

## Step 2: Build a tiny in-memory catalog

You don't need a database. Three products are enough to see fan-out happen.

Create `src/lib/catalog.ts`:

```ts
export interface Product {
  id: string
  name: string
  brand: string
  price: number
  category: 'Running' | 'Lifestyle' | 'Trail'
  imageUrl: string
}

export const PRODUCTS: Array<Product> = [
  {
    id: 'p1',
    name: 'Pegasus 41',
    brand: 'Nike',
    price: 140,
    category: 'Running',
    imageUrl: 'https://picsum.photos/seed/p1/300',
  },
  {
    id: 'p2',
    name: 'Cloud 5',
    brand: 'On',
    price: 150,
    category: 'Lifestyle',
    imageUrl: 'https://picsum.photos/seed/p2/300',
  },
  {
    id: 'p3',
    name: 'Speedgoat',
    brand: 'Hoka',
    price: 155,
    category: 'Trail',
    imageUrl: 'https://picsum.photos/seed/p3/300',
  },
]

export const REVIEWS: Record<string, { rating: number; count: number }> = {
  p1: { rating: 4.7, count: 312 },
  p2: { rating: 4.5, count: 198 },
  p3: { rating: 4.8, count: 451 },
}
```

That's the whole "database."

## Step 3: Expose the catalog as TanStack AI tools

`toolDefinition` from `@tanstack/ai` wraps a Zod schema and an `execute` function. Code mode picks these up and exposes each one inside the sandbox as `external_<name>`.

Create `src/lib/tools.ts`:

```ts
import { z } from 'zod'
import { toolDefinition } from '@tanstack/ai'
import { PRODUCTS, REVIEWS } from './catalog'

export const searchProducts = toolDefinition({
  name: 'searchProducts',
  description: 'Search the catalog. Returns matching product IDs.',
  inputSchema: z.object({
    category: z.enum(['Running', 'Lifestyle', 'Trail']).optional(),
    maxPrice: z.number().optional(),
  }),
  outputSchema: z.object({ productIds: z.array(z.string()) }),
}).server({
  execute: async ({ category, maxPrice }) => {
    const ids = PRODUCTS.filter((p) => !category || p.category === category)
      .filter((p) => maxPrice == null || p.price <= maxPrice)
      .map((p) => p.id)
    return { productIds: ids }
  },
})

export const getProduct = toolDefinition({
  name: 'getProduct',
  description: 'Full product details for one id.',
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.object({
    id: z.string(),
    name: z.string(),
    brand: z.string(),
    price: z.number(),
    category: z.string(),
    imageUrl: z.string(),
    rating: z.number(),
    reviewCount: z.number(),
  }),
}).server({
  execute: async ({ id }) => {
    const p = PRODUCTS.find((x) => x.id === id)
    if (!p) throw new Error(`No product ${id}`)
    const r = REVIEWS[id]!
    return { ...p, rating: r.rating, reviewCount: r.count }
  },
})

export const catalogTools = [searchProducts, getProduct]
```

`createCodeMode` later turns these into `external_searchProducts` and `external_getProduct` for the sandbox.

## Step 4: Wire the agent route with `createCodeMode`

This is the load-bearing step. You're creating the `execute_typescript` tool, generating a system prompt that documents your tools as TypeScript stubs, and streaming the response as SSE.

Create `src/routes/api.agent.ts`:

```ts
import { createFileRoute } from '@tanstack/react-router'
import { chat, maxIterations, toServerSentEventsStream } from '@tanstack/ai'
import type { ModelMessage } from '@tanstack/ai'
import { createCodeMode } from '@tanstack/ai-code-mode'
import { createNodeIsolateDriver } from '@tanstack/ai-isolate-node'
import { anthropicText } from '@tanstack/ai-anthropic'
import { catalogTools } from '#/lib/tools'
import { createUIBindings, UI_PROMPT } from '#/lib/ui-bindings'

let cached: ReturnType<typeof createCodeMode> | null = null
function getCodeMode() {
  if (cached) return cached
  cached = createCodeMode({
    driver: createNodeIsolateDriver({ timeout: 30_000, memoryLimit: 128 }),
    tools: catalogTools,
    getSkillBindings: async () => createUIBindings(), // step 5 fills this in
  })
  return cached
}

const SYSTEM_PROMPT = `You are a shopping assistant. You have ONE tool: execute_typescript.
Inside the sandbox you can call external_searchProducts, external_getProduct, and ui_addProductCard.

For any query:
1. Call external_searchProducts with whatever filters fit.
2. Use Promise.all to fetch the matching external_getProduct calls in parallel.
3. For each result, call ui_addProductCard with a unique id.
4. Return ONE short sentence as your final answer.

Do everything in ONE execute_typescript call. Always await async calls.`

export const Route = createFileRoute('/api/agent')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages: Array<ModelMessage<string>> }
        const codeMode = getCodeMode()

        const stream = chat({
          adapter: anthropicText('claude-haiku-4-5'),
          messages,
          tools: [codeMode.tool],
          systemPrompts: [SYSTEM_PROMPT, codeMode.systemPrompt, UI_PROMPT],
          agentLoopStrategy: maxIterations(4),
        })

        return new Response(toServerSentEventsStream(stream), {
          headers: { 'Content-Type': 'text/event-stream' },
        })
      },
    },
  },
})
```

Two details worth pausing on:

- **`getSkillBindings` runs on every invocation.** That's why request-scoped state (a session id, a zip code, anything) can be plumbed into bindings without rebuilding the whole tool.
- **`codeMode.systemPrompt` is generated.** It contains `declare function external_searchProducts(...): Promise<...>` lines built from your Zod schemas. You always pass it; the model needs the type stubs to write valid calls. Static `tools:` entries get documented for free; dynamic `getSkillBindings` ones don't — that's why `UI_PROMPT` exists.

This won't run yet — we haven't created `ui-bindings.ts`. That's step 5.

## Step 5: Add one `ui_*` primitive

A UI binding is a `ToolBinding` whose `execute` emits a custom event instead of computing a value. The model calls it like a normal async function; the side effect is "a typed event hits the SSE stream."

Create `src/lib/ui-bindings.ts`:

```ts
import { z } from 'zod'
import { convertSchemaToJsonSchema } from '@tanstack/ai'
import type { ToolBinding, ToolExecutionContext } from '@tanstack/ai-code-mode'

export type UIEvent =
  | { op: 'add'; id: string; type: 'productCard'; props: ProductCardProps }
  | { op: 'remove'; id: string }

export interface ProductCardProps {
  productId: string
  name: string
  brand: string
  price: number
  imageUrl: string
  rating: number
  highlight?: boolean
}

const productCardSchema = z.object({
  id: z.string().describe('Unique id for this card — reuse to update or remove.'),
  productId: z.string(),
  name: z.string(),
  brand: z.string(),
  price: z.number(),
  imageUrl: z.string(),
  rating: z.number(),
  highlight: z.boolean().optional(),
})

export function createUIBindings(): Record<string, ToolBinding> {
  return {
    ui_addProductCard: {
      name: 'ui_addProductCard',
      description: 'Render a product card on the canvas.',
      inputSchema: convertSchemaToJsonSchema(productCardSchema)!,
      execute: async (args: unknown, ctx?: ToolExecutionContext) => {
        const { id, ...props } = productCardSchema.parse(args)
        const event: UIEvent = { op: 'add', id, type: 'productCard', props }
        ctx?.emitCustomEvent?.('ui:event', event)
        return { ok: true }
      },
    },
  }
}

export const UI_PROMPT = `## Render-on-the-fly UI

In addition to external_*, you have:

\`\`\`typescript
declare function ui_addProductCard(input: {
  id: string
  productId: string
  name: string
  brand: string
  price: number
  imageUrl: string
  rating: number
  highlight?: boolean
}): Promise<{ ok: boolean }>
\`\`\`

Each card needs a unique id. The shopper sees cards appear as your code awaits them.`
```

The `UI_PROMPT` string is what makes the model aware of `ui_addProductCard` — `createCodeMode` only generates stubs for static `tools`, not dynamic `getSkillBindings`. If you skip this prompt the model has no idea the function exists.

Save and the route from step 4 now compiles.

## Step 6: A client store and `useChat`

Two pieces: a tiny reducer that applies `UIEvent`s to a node map, and a chat component that pipes the SSE custom events into it.

Create `src/lib/ui-store.ts`:

```ts
import { useSyncExternalStore } from 'react'
import type { UIEvent, ProductCardProps } from './ui-bindings'

export interface UINode {
  id: string
  type: 'productCard'
  props: ProductCardProps
}

let nodes: Map<string, UINode> = new Map()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export const uiStore = {
  get: () => nodes,
  dispatch: (event: UIEvent) => {
    const next = new Map(nodes)
    if (event.op === 'add')
      next.set(event.id, { id: event.id, type: event.type, props: event.props })
    else if (event.op === 'remove') next.delete(event.id)
    nodes = next
    emit()
  },
  clear: () => {
    nodes = new Map()
    emit()
  },
  subscribe: (l: () => void) => {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}

export const useUIState = () => useSyncExternalStore(uiStore.subscribe, uiStore.get, () => nodes)
```

The real app uses a tree (parent/child via `parentId`) because primitives nest. A flat map is enough for one card type — tree support is a 20-line follow-up.

Now create the page that drives the chat. Replace `src/routes/index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useChat, fetchServerSentEvents } from '@tanstack/ai-react'
import { uiStore, useUIState } from '#/lib/ui-store'
import type { UIEvent } from '#/lib/ui-bindings'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const nodes = useUIState()

  const { sendMessage, isLoading } = useChat({
    connection: fetchServerSentEvents('/api/agent'),
    onCustomEvent: (eventType, data) => {
      if (eventType === 'ui:event') uiStore.dispatch(data as UIEvent)
    },
  })

  function ask(query: string) {
    uiStore.clear()
    sendMessage({ role: 'user', content: query })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Mini code-mode shop</h1>

      <div className="flex gap-2">
        <button
          onClick={() => ask('running shoes under $145')}
          disabled={isLoading}
          className="rounded bg-black px-3 py-2 text-white"
        >
          Running under $145
        </button>
        <button
          onClick={() => ask('best trail shoe')}
          disabled={isLoading}
          className="rounded border px-3 py-2"
        >
          Best trail shoe
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[...nodes.values()].map((n) => (
          <div
            key={n.id}
            className={`rounded border p-3 ${n.props.highlight ? 'ring-2 ring-black' : ''}`}
          >
            <img
              src={n.props.imageUrl}
              alt={n.props.name}
              className="aspect-square w-full rounded object-cover"
            />
            <div className="mt-2 text-sm text-gray-500">{n.props.brand}</div>
            <div className="font-medium">{n.props.name}</div>
            <div className="mt-1 flex justify-between text-sm">
              <span>${n.props.price}</span>
              <span>★ {n.props.rating.toFixed(1)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

That's the whole client. `useChat` handles SSE for you; `onCustomEvent` is the only seam you care about.

## Step 7: Try it

Start the dev server:

```bash
pnpm dev
```

Open `http://localhost:3000` and click **Running under $145**. Open the network tab first — you should see exactly **one** POST to `/api/agent` and one SSE stream. Watch the page: a single product card materializes (the Pegasus 41) once the program awaits `ui_addProductCard`.

Click **Best trail shoe**. The canvas clears, then the Speedgoat card streams in.

If it doesn't work, the usual suspects:

- **`ANTHROPIC_API_KEY` missing.** The route fails on the first chat call — check the server terminal.
- **`isolated-vm` failed to compile.** You'll see it on first request. Either install a C++ toolchain or switch to `createQuickJSIsolateDriver` from `@tanstack/ai-isolate-quickjs` (pure WASM, no native deps).
- **Model hits the iteration cap without rendering.** Open `code_mode:console` events (covered in Next steps) to see what the program actually wrote — usually the system prompt needs sharper rules.

## Summary

In this tutorial, you:

- Stood up a TanStack Start app and pointed it at `@tanstack/ai-code-mode` with the Node isolate driver.
- Exposed plain TypeScript functions as `external_*` tools using `toolDefinition`, and let `createCodeMode` generate the system prompt stubs from their schemas.
- Built a `ui_*` binding whose `execute` emits a typed custom event instead of computing a value — that's the live-render trick in one function.
- Piped those events through `useChat`'s `onCustomEvent` into a `useSyncExternalStore` reducer, then walked the result into React.

The whole loop is roughly 200 lines. Every other primitive in the real app is the same shape: add a row to a registry, add a React case, add a `declare function` line.

## Next steps

The minimum viable demo skips a lot. The natural follow-ons, in roughly increasing order of effort:

- **More primitives.** Add `ui_addCTA`, `ui_addComparisonTable`, `ui_addStockPill`. Each is one binding + one schema + one prompt stub + one React case. Move them to a registry once you have three.
- **Nesting.** Switch the flat `Map<string, UINode>` to a parent/child tree so a `stockPill` can render _inside_ a `productCard`. The real app's [`ui-store.ts`](https://github.com/tanstack/ai/tree/main) is ~80 lines.
- **Observability.** The `code_mode:execution_started`, `code_mode:console`, and `code_mode:external_call/result/error` events fire automatically — listen for them in `onCustomEvent` and you'll see exactly what the program did.
- **A handler endpoint.** When the model renders a CTA, clicks should re-enter code mode with a narrower prompt and request-scoped bindings (e.g. a `cart_update` event). Same `createCodeMode` call, different system prompt.
- **Persistent skills.** [`@tanstack/ai-code-mode-skills`](https://github.com/tanstack/ai/blob/main/docs/code-mode/code-mode-with-skills.md) turns successful programs into named, reusable tools the model can invoke directly. It's the natural next chapter once the basic loop feels solid.

Want the full reference? The codebase you came from — [`codemode.shop`](https://github.com/) — has all of the above wired up; the architecture notes in `brain/architecture/` walk through each piece in isolation. Start with `code-mode.md` and `request-flow.md`.
