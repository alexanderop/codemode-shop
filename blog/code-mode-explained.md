# Code mode, explained: when the LLM writes TypeScript instead of calling tools one by one

Open the Storekeeper drawer in this app. Ask: _"compare the three top-rated running shoes under $160 in size 10."_ In about a second, three product cards stream into the canvas, each with a stock pill, a review bar, and a highlighted "Add to cart" button. Behind the scenes the model touched the catalog roughly 15 times.

It did all of that in **one** LLM call.

That's code mode. The point of this post: by the end you'll know exactly what `execute_typescript` is, why it replaces a chain of round-trips with a single generation, and which seven-or-so files in this repo make it work — so you can poke at them with confidence.

## What code mode is

Code mode is a single agent tool — `execute_typescript` — and a sandboxed runtime to execute its argument. Instead of giving the LLM a menu of named tools and letting it pick one per turn, you give it _one_ tool whose input is a TypeScript program. Inside the sandbox, that program can call a closed vocabulary of async functions you exposed: in this app, the `external_*` family (catalog data, cart, checkout) and the `ui_*` family (product cards, comparison tables, CTAs that render live in the browser).

A few specifics that matter:

- **One generation, N effects.** The model writes one program and gets back one JSON-cloneable result plus a log array. Everything that happens inside the program — searches, parallel fetches, ranking, UI emits — never round-trips through the model.
- **Real TypeScript, executed in real V8.** This app uses `@tanstack/ai-isolate-node`, which runs the program in `isolated-vm` (V8 with JIT). You can swap to a QuickJS WASM driver or a Cloudflare Worker driver — the contract is the same.
- **Fresh sandbox per turn.** Each `execute_typescript` call gets its own context with the configured timeout and memory limit, then disposes it in `finally`. No shared state across turns.
- **Closed vocabulary, not arbitrary I/O.** The sandbox can't `fetch`, can't read the filesystem, can't import npm. It can only call the bindings you handed it. That's the security model.

## Why it exists

A traditional tool-calling agent answering the same shopping query looks roughly like this:

1. Model decides to call `searchProducts` → round-trip 1.
2. Model decides to call `getProduct` × 5 → round-trips 2–6.
3. Model decides to call `getStockAndShipping` × 5 → round-trips 7–11.
4. Model decides to call `getReviewSummary` × 5 → round-trips 12–16.
5. Model writes a final answer.

Each arrow is a network hop, a token bill, and an opportunity for the model to drift. Code mode collapses all of that into a single generation where the model expresses the workflow as a program — including `Promise.all` for parallelism, `Array.sort` for ranking, and a `for` loop for the UI render. The host runs the program; the model only sees the final return value.

That last point is the second, less-obvious win: **context window**. In a traditional loop every tool call and every tool result lands back in the model's message history — after 16 round-trips you're paying for 16 prompt-side replays of the same context plus 16 inflated tool results. Code mode keeps all of that inside the sandbox; only the program's return value crosses back. So you save round-trips _and_ you save tokens, which is the difference between a workflow that scales to 30 catalog items and one that runs out of context at 8.

The trade-off is honest: you're trusting the model to write working code on the first try. When the program throws, the tool returns the error to the model and it can retry — but retries cost a round-trip again. In practice, with a model that's strong at code (Claude Haiku 4.5 ships as the default here, and it's good enough), the win is large for any workflow that fan-outs across more than two or three tool calls.

## How it works in this app

The whole thing is wired up in seven-ish files. From the request side:

```ts
// src/app/routes/api.storefront-agent.ts
const codeMode = await getCodeMode()

const stream = chat({
  adapter: anthropicText(storefrontModel),
  messages,
  tools: [codeMode.tool],
  systemPrompts: [
    STOREFRONT_PROMPT,
    codeMode.systemPrompt, // documents external_*
    createStorefrontUIPrompt({ zipCode }), // documents ui_*
    `Shopper context: zipCode=${zipCode}.`,
  ],
  agentLoopStrategy: maxIterations(6),
  abortController,
})
```

`createCodeMode({ driver, tools, getSkillBindings })` returns two things at once: the `execute_typescript` tool and a system prompt that documents every `external_*` function with TypeScript stubs generated from each tool's JSON schema. Always use them together — that's how the prompt and the runtime stay in sync.

The `getSkillBindings` callback fires on **every** invocation, which is how request-scoped bindings — `ui_addProductCard`, `ui_addComparisonTable`, `cart_update` for the handler endpoint — get plumbed into the sandbox without rebuilding the tool.

Inside the sandbox, a typical program the model writes looks like:

```ts
const { productIds } = await external_searchProducts({
  category: 'Running',
  colors: ['black'],
  maxPrice: 150,
  size: '10',
})

const rows = await Promise.all(
  productIds.slice(0, 3).map(async (id) => {
    const [p, ship, rev] = await Promise.all([
      external_getProduct({ id }),
      external_getStockAndShipping({ productId: id, size: '10', zipCode: '94107' }),
      external_getReviewSummary({ productId: id }),
    ])
    return { p, ship, rev }
  }),
)

rows.sort((a, b) => b.rev.averageRating / b.p.price - a.rev.averageRating / a.p.price)

for (const [i, { p, ship, rev }] of rows.entries()) {
  const cardId = `card-${p.id}`
  await ui_addProductCard({ id: cardId, productId: p.id, name: p.name, /* … */ highlight: i === 0 })
  await ui_addStockPill({ id: `pill-${p.id}`, parentId: cardId /* … */ })
  await ui_addReviewBar({ id: `rev-${p.id}`, parentId: cardId /* … */ })
}

await ui_addCTA({ id: 'cta', label: `Add ${rows[0].p.name} to cart` /* … */ })

return `${rows[0].p.brand} ${rows[0].p.name} — best value at $${rows[0].p.price}.`
```

Search → fan-out → sort → render → return one sentence. One model generation. ~15 host tool executions. Zero extra round-trips.

### From program to live UI

The `ui_*` bindings don't return components — they emit typed custom events. Each binding wraps `context.emitCustomEvent('storefront:ui', event)`, which gets piped through SSE to the browser as a `CUSTOM` chunk. On the client, `useChat`'s `onCustomEvent` routes those to a tiny reducer (`uiStore` in `src/features/storefront/stores/ui-store.ts`) backed by `useSyncExternalStore`. `StorefrontCanvas` walks the resulting tree and renders the React components — _while the program is still running_.

That's why product cards visibly stream in: the program awaits each `ui_addProductCard` in turn, the host emits the SSE chunk, the client appends a node to the tree. The model never re-enters this loop; it just writes the program once.

You also get observability for free. Every `external_*` call is wrapped in `createEventAwareBindings`, which emits `code_mode:external_call` / `external_result` / `external_error` around the underlying `execute`. Those drive the `ProgramCard` tab in the drawer that shows what the model's program actually did.

## When you'd use it (and when you wouldn't)

Code mode is a great fit when:

- **The workflow fans out.** "For each result, fetch X, Y, Z and combine" is the ideal shape — `Promise.all` in code is one round-trip; the equivalent tool-call sequence is N.
- **You want to render structured UI from the agent.** Closed-vocabulary UI primitives + a client reducer is much safer and faster than streaming HTML or JSX through the model. The model writes calls; the host renders the result.
- **You can express the host API as small, well-typed functions.** The model is good at calling functions whose JSON schemas are visible in the system prompt. Anything you can hand it as a `declare function` line, it can call.

It's a worse fit when:

- **The work needs human-in-the-loop turns mid-flow.** If the user has to confirm step 2 before step 3 happens, you want a multi-turn agent loop, not one program.
- **The model is weak at code.** Code mode pushes work into the model's code-generation skill. If that's shaky, you'll see runtime errors and retries; tool-calling can be more forgiving for small models.
- **You need long-running execution.** The library defaults to a 30-second sandbox timeout (this app bumps it to 45). For minute-scale workflows you want a queue, not an isolate.

## Code mode vs. classic tool-calling, at a glance

| Question                           | Classic tool-calling                                | Code mode                                      |
| ---------------------------------- | --------------------------------------------------- | ---------------------------------------------- |
| LLM round-trips per shopping query | ~16                                                 | 1                                              |
| Where parallelism lives            | Model has to interleave tool calls; usually doesn't | `Promise.all` in the sandbox                   |
| Where ranking / filtering lives    | Either in the prompt or via more tool calls         | Plain TypeScript                               |
| How the UI updates                 | Model emits text, client renders                    | Sandbox emits typed events as the program runs |
| What the model has to be good at   | Picking the next tool                               | Writing one correct TypeScript program         |
| Failure mode                       | Model picks the wrong tool, or stops early          | Program throws at runtime, model retries       |

## Where to look in the codebase

| File                                                                                      | What it owns                                                                                     |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/app/routes/api.storefront-agent.ts`                                                  | The chat endpoint. `createCodeMode` + Anthropic adapter + SSE.                                   |
| `src/lib/tools/catalog-tools.ts`                                                          | The `external_*` surface (search, products, stock, reviews, prices, cart, checkout).             |
| `src/features/storefront/api/ui-registry.ts`                                              | Single source of truth for every `ui_*` primitive — type, function name, zod props, prompt stub. |
| `src/features/storefront/api/ui-bindings.ts`                                              | Builds `ToolBinding`s from the registry; each binding emits a `storefront:ui` event.             |
| `src/features/storefront/api/ui-prompt.ts`                                                | Hand-written `declare function ui_*(…)` lines spliced into the system prompt.                    |
| `src/features/storefront/stores/ui-store.ts` + `components/storefront-canvas.tsx`         | Client reducer + walker that turn streamed events into the live React tree.                      |
| `src/app/routes/api.storefront-handler.ts` + `src/features/storefront/api/run-handler.ts` | CTA clicks re-enter code mode with a narrower prompt and a `cart_update` binding.                |

If you want the deeper architecture notes, they live under `brain/architecture/` — start with `code-mode.md` and `code-mode-execution-pipeline.md`.

## Takeaways

- Code mode replaces a menu of named tools with one tool, `execute_typescript`, whose input is a TypeScript program — one LLM generation, N sandboxed effects.
- The real win is fan-out: `Promise.all` in the sandbox is one round-trip; the equivalent tool-call chain is N.
- The closed `external_*` / `ui_*` vocabulary is also the security model — the sandbox can only call functions you handed it.
- `ui_*` bindings emit typed SSE events that a client reducer materializes into React components live, while the program is still running.
- Trust is in the model's code-writing ability; when it throws, retries cost round-trips again, so prompt and bindings both have to be tight.

## Try it

Open `http://localhost:3000`, open the network tab, click **Ask Storekeeper**, and send _"compare the three top-rated running shoes under $160 in size 10."_ You should see exactly one POST to `/api/storefront-agent` and one SSE stream — that's your one generation. Then read the program in the drawer's **Code** tab to see what the model actually wrote.

Once that clicks, the natural next step is `@tanstack/ai-code-mode-skills` — same primitive, but successful programs get persisted as named, reusable tools the model can invoke directly. This app intentionally leaves that out of scope so the core idea stays visible; the [TanStack AI code-mode docs](https://github.com/tanstack/ai/blob/main/docs/code-mode/code-mode.md) are the place to go from here.
