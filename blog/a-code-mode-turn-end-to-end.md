# A code-mode turn, end to end: a guided reading of codemode.shop

I'll be honest — the first time I read a "code mode" explainer, I nodded along and immediately forgot half of it. The diagrams made sense. The thesis ("LLMs write code; we run it") made sense. But I couldn't draw the line from a sentence the user types in a chat box to the React components that paint on screen. The pieces are simple individually; the path between them is what I needed to see.

So this post is the version I wish I'd had: I'm going to open `codemode.shop` — a small TanStack Start app — and trace one shopping turn from the moment you press Enter to the moment a product card lands in the canvas. Same primitives the [Cloudflare team coined the term for](https://blog.cloudflare.com/code-mode/), same packages [the TanStack AI team announced](https://tanstack.com/blog/code-mode-let-your-ai-write-programs), no toy sandbox — just a real working app and the seven-or-so files that make it tick.

By the end you'll be able to point at any line in this repo and say what role it plays in the loop. That's the only thing I'm trying to give you.

## What we're building (already built, actually)

If you've already cloned the repo and run `pnpm dev`, click the **Ask Storekeeper** button and try:

> _Compare the three top-rated running shoes under $160 in size 10._

About a second later, three product cards stream into a canvas, each one wearing a stock pill, a review bar, and a "Add to cart" button. If you watch the network tab while it happens, you'll see exactly **one** POST to `/api/storefront-agent` and one Server-Sent Events stream. That's the whole thing — one LLM call, one stream, all the rendering.

That's the destination. Now let's walk back to the start and follow the bytes.

## Who this is for

I'm writing this for anyone who's used a tool-calling LLM at the conceptual level (you've heard of MCP, you've made an `addToCart` tool somewhere) but hasn't sat down with code mode in a real codebase. You should be comfortable with React, TypeScript, and the rough idea of what SSE is. You don't need to know `@tanstack/ai` — by the end you will.

A few cards I'll flip face up before we start:

- **The model:** Claude Haiku 4.5 by default (set in `src/config/model.ts`, overridable with `STOREFRONT_MODEL`). Anthropic key in `.env`.
- **The sandbox:** `@tanstack/ai-isolate-node`, which wraps `isolated-vm` — a real V8 isolate (not a Worker, not a container, just a separate V8 heap with a JIT). The Cloudflare post uses Worker isolates; same primitive, different host.
- **The contract:** the LLM has exactly one tool, `execute_typescript`. Inside it, two families of async functions: `external_*` (catalog, cart, checkout) and `ui_*` (renders components on the canvas). Nothing else. No `fetch`, no `import`, no filesystem.

If you want the conceptual case for any of this, the Cloudflare and TanStack posts cover it well; this one is concrete on purpose. Already-existing companion posts in this same `blog/` folder go deeper on the _why_ ([code-mode-explained.md](./code-mode-explained.md)) and the _build it from scratch_ angle ([build-a-code-mode-storefront.md](./build-a-code-mode-storefront.md)).

## Background: what one turn has to do

Before I open files, let me say in plain English what a single shopping turn must accomplish, because every file we're about to read is implementing one of these jobs:

1. Capture the user's typed sentence and POST it.
2. Pick an LLM, hand it a system prompt, hand it the `execute_typescript` tool, ask it to plan the turn.
3. Receive a TypeScript program from the model.
4. Run that program in a fresh V8 isolate with a closed vocabulary of bound functions.
5. As the program calls `external_*`, fetch real catalog data. As it calls `ui_*`, emit typed events.
6. Stream those events back to the browser as SSE.
7. Apply each event to a client-side reducer; React re-renders the canvas as the events land.
8. When the program returns, surface its return value as the assistant's chat reply.

That's the whole loop. Eight bullets. Here it is on one page:

```
  Browser                                Server
  ───────                                ──────

  [StorekeeperDrawer]                    [/api/storefront-agent]
         │                                       │
         │  POST { messages, data } ──────────►  chat({adapter, tools…})
         │                                       │
         │                                       ▼
         │                                  Anthropic LLM
         │                                       │
         │                          writes one TS program
         │                                       │
         │                                       ▼
         │                            execute_typescript tool
         │                                       │
         │                                       ▼
         │                              ┌─ V8 isolate ──┐
         │                              │  external_*   │ ─► catalog / cart
         │                              │  ui_*  ──┐    │
         │                              └──────────┼────┘
         │                                         │
         │                                         ▼
         │                       context.emitCustomEvent('storefront:ui', e)
         │                                         │
         │ ◄────── SSE: CUSTOM frame ──────────────┘
         ▼
   onCustomEvent
         │
         ▼
   uiStore.dispatch(event)
         │
         ▼
   StorefrontCanvas → <ProductCard/>, <ComparisonTable/>, …
```

Now let's match each box to files.

## Stop 1: The drawer and `useChat`

The chat UI lives in `src/features/storefront/components/storekeeper-drawer.tsx`. The relevant call is short:

```tsx
const { messages, sendMessage, isLoading, stop } = useChat({
  connection: fetchServerSentEvents('/api/storefront-agent'),
  body: { data: { zipCode } },
  onCustomEvent(eventType, data) {
    if (eventType === 'storefront:ui') {
      uiStore.dispatch(data as UIEvent)
    } else if (eventType.startsWith('code_mode:')) {
      activityStore.record(eventType, data as Record<string, unknown>)
    }
  },
  onFinish() {
    /* end-of-turn bookkeeping */
  },
})
```

`useChat` from `@tanstack/ai-react` is the chat-on-rails hook. I hand it an SSE endpoint and an `onCustomEvent` callback, and that's the entire client seam I need. Two event channels matter to me:

- `storefront:ui` — UI tree mutations. These get dispatched into `uiStore`, my client-side reducer.
- `code_mode:*` — observability events (`execution_started`, `external_call`, `external_result`, `external_error`, `console`). These go into `activityStore`, which drives the `ProgramCard` panel that shows the model's program and what it actually did.

When the user submits a message, `launch()` does three things, in order: clear the canvas (so we start with a blank tree), start a new "turn" record in `activityStore`, and call `sendMessage(text)`. That's bullet 1.

## Stop 2: The agent route

POST hits `src/app/routes/api.storefront-agent.ts`. I'm going to paste the inside of the handler with the noise stripped:

```ts
const adapter = anthropicText(storefrontModel)
const driver = await getStorefrontDriver({ timeout: TIMEOUT_MS, memoryLimit: 128 })
const codeMode = buildStorefrontCodeMode({ driver, sessionId, timeout: TIMEOUT_MS })

const stream = chat({
  adapter,
  messages,
  tools: [codeMode.tool],
  systemPrompts: [
    STOREFRONT_PROMPT,
    codeMode.systemPrompt,
    createStorefrontUIPrompt({ zipCode }),
    `Shopper context: zipCode=${zipCode}. Today is ${todayIso}.`,
  ],
  agentLoopStrategy: maxIterations(6),
  maxTokens: 4096,
})

return new Response(toServerSentEventsStream(stream, abortController), {
  headers: { 'Content-Type': 'text/event-stream' /* … */ },
})
```

Three things are happening here, and each one is a load-bearing decision.

**The driver is cached.** `getStorefrontDriver` (in `driver.ts`) holds a `Map<string, Promise<IsolateDriver>>` and reuses the same driver across requests with the same `(timeout, memoryLimit)` pair. I do _not_ want to re-spin up the V8 driver on every chat turn. The driver is the host that manufactures isolate contexts; it's heavy. Contexts are cheap, and the driver creates a fresh one per call.

**Code mode is built per-request.** That's the line `buildStorefrontCodeMode(...)`. Why? Because the bindings injected into the sandbox are session-scoped (the cart, the order book — see `createSessionScopedCatalogTools(sessionId)` inside `code-mode.ts`). I cache the driver but I rebuild code-mode every time, so each request gets its own session.

**The system prompt is _three_ prompts concatenated.** That's the bit that took me longest to internalize:

- `STOREFRONT_PROMPT` is the hand-written rulebook. Behavior, workflows, what to do when the cart is empty, etc.
- `codeMode.systemPrompt` is **generated** by `createCodeMode` from the JSON schemas of every tool I passed in. It contains real `declare function external_searchProducts(...)` lines, complete with parameter types and JSDoc. That's how the model knows what to call.
- `createStorefrontUIPrompt({ zipCode })` is the matching block for `ui_*`. Why hand-written? Because UI bindings are injected through `getSkillBindings` (a per-request callback), not through the static `tools:` list, and `createCodeMode` only auto-generates stubs for the static set. If you forget this prompt, the model won't know `ui_addProductCard` exists.

Visualizing the stack:

```
  systemPrompts: [
    ┌────────────────────────────────────────────────────┐
    │ STOREFRONT_PROMPT       (hand-written rulebook)    │
    │   "You are Storekeeper. For shopping queries…"     │
    └────────────────────────────────────────────────────┘,
    ┌────────────────────────────────────────────────────┐
    │ codeMode.systemPrompt   (auto-generated)           │
    │   declare function external_searchProducts(…)      │
    │   declare function external_getProduct(…)          │
    │   ← built from each tool's Zod schema              │
    └────────────────────────────────────────────────────┘,
    ┌────────────────────────────────────────────────────┐
    │ createStorefrontUIPrompt  (hand-written stubs)     │
    │   declare function ui_addProductCard(…)            │
    │   declare function ui_addCTA(…)                    │
    │   ← bindings come from getSkillBindings, not       │
    │     `tools:`, so they're NOT auto-documented       │
    └────────────────────────────────────────────────────┘,
    `Shopper context: zipCode=94107. Today is 2026-04-25.`,
  ]
```

This is bullet 2. The model is now sitting on a system prompt, the `execute_typescript` tool, and the conversation so far. It picks one tool, writes one program, and hands it back as the tool's argument.

## Stop 3: The model writes a program

Here's a real one — from the `comparison-table.ts` fixture in `evals/fixtures/programs/`, lightly edited for clarity:

```ts
const { productIds } = await external_searchProducts({ limit: 2 })
const [a, b] = await Promise.all(productIds.map((id) => external_getProduct({ id })))

await ui_addComparisonTable({
  id: 'cmp',
  columnHeaders: [a.name, b.name],
  rows: [
    { label: 'Brand', values: [a.brand, b.brand] },
    { label: 'Price', values: ['$' + a.price, '$' + b.price] },
    { label: 'Color', values: [a.color, b.color] },
  ],
  winnerColumn: a.price <= b.price ? 0 : 1,
})

const winner = a.price <= b.price ? a : b
await ui_addCTA({
  id: 'cta',
  label: 'Buy ' + winner.name,
  handlerId: 'addToCart',
  payload: { productId: winner.id, size: winner.sizes[0] },
})

return { winner: winner.id }
```

Notice what's _not_ here: there's no second LLM call. The `Promise.all`, the price comparison, the ranking, the rendering — all of it runs in the sandbox in a single `execute_typescript` invocation. The only thing the model has to be good at is writing this program correctly the first time. (When it doesn't, the host returns the error to the model and lets it try again — but each retry costs another round-trip, so the prompt and the type stubs need to be tight.)

The "richer" example from `ui-prompt.ts` — the one I literally show the model as a recommended pattern — fans out further:

```ts
const { productIds } = await external_searchProducts({
  query: 'running', maxPrice: 160, size: '10',
})
const rows = await Promise.all(productIds.slice(0, 3).map(async (id) => {
  const [p, ship, rev] = await Promise.all([
    external_getProduct({ id }),
    external_getStockAndShipping({ productId: id, size: '10', zipCode: '94107' }),
    external_getReviewSummary({ productId: id }),
  ])
  return { p, ship, rev }
}))

for (const [i, { p, ship, rev }] of rows.entries()) {
  const cardId = `card-${p.id}`
  await ui_addProductCard({ id: cardId, /* … */, highlight: i === 0 })
  await ui_addStockPill({ id: `pill-${p.id}`, parentId: cardId, /* … */ })
  await ui_addReviewBar({ id: `rev-${p.id}`, parentId: cardId, /* … */ })
}

await ui_addCTA({ id: 'cta', /* … */ })
```

About 15 catalog touches. One model call. The math is in `for` loops and `Array#sort`, not in token prediction, which means it's correct — that's the fan-out + arithmetic argument the TanStack post hammers, and it's the single most underrated benefit when you're trying to debug a production agent.

## Stop 4: Inside the sandbox

So the model returns `execute_typescript({ typescriptCode: "…" })`. What happens inside?

The pipeline is documented in `brain/architecture/code-mode-execution-pipeline.md`. Eight steps:

1. Emit `code_mode:execution_started`.
2. Strip TypeScript with esbuild's transform (which also doubles as a syntax check).
3. Resolve dynamic bindings — `getSkillBindings()` fires and returns my `external_*` (session-scoped) plus `ui_*` (UI emitters).
4. Wrap each binding in `createEventAwareBindings`, which emits `code_mode:external_call` / `external_result` / `external_error` around every call. Free observability.
5. Create a fresh isolate context: `driver.createContext({ bindings, timeout, memoryLimit })`.
6. Wrap the user's code in an async IIFE so top-level `await` and `return` work.
7. `JSON.stringify` the return value (objects can't transfer raw across the isolate boundary in `isolated-vm`).
8. Capture `console.log/warn/error/info` calls, re-emit each as `code_mode:console`. Always dispose the context in `finally`.

Each `external_*` call is a real function on the host running in real Node. Each `ui_*` call is a special kind of binding I should explain on its own — that's stop 5.

## Stop 5: How `ui_*` "renders" anything

This is the trick that makes the demo look magical. The implementation is anticlimactic in the best way. From `src/features/storefront/api/ui-bindings.ts`:

```ts
function binding<T extends z.ZodType>(
  name: string,
  description: string,
  schema: T,
  toEvent: (input: z.infer<T>) => UIEvent,
): ToolBinding {
  return makeBinding(name, description, schema, async (parsed, context) => {
    const event = toEvent(parsed)
    context?.emitCustomEvent?.('storefront:ui', event)
    return { ok: true }
  })
}
```

That's it. A `ui_*` binding doesn't compute anything. Its `execute` builds a typed `UIEvent`, calls `context.emitCustomEvent('storefront:ui', event)`, and returns `{ ok: true }`. Inside the sandbox the model just sees a plain async function that resolves; on the host, that emit lands as a `CUSTOM` chunk in the SSE stream.

Drawn out, one call's full path:

```
  Inside the sandbox             On the host                In the browser
  ──────────────────             ───────────                ──────────────

  await ui_addProductCard({
    id: 'card-p1',          ──►  binding.execute(args)
    name: 'Pegasus 41',           │
    price: 140,                   │  context.emitCustomEvent(
    …                             │    'storefront:ui',
  })                              │    { op:'add', id, type, props })
                                  ▼
                              SSE: CUSTOM frame ────►   useChat.onCustomEvent
                                                                │
                                                                ▼
                                                        uiStore.dispatch(e)
                                                                │
                                                                ▼
                                                        useSyncExternalStore
                                                                │
                                                                ▼
                                                        StorefrontCanvas
                                                        → <ProductCard/>
```

The function returns `{ ok: true }` to the sandbox in milliseconds; the React update happens out-of-band, on the client, while the program keeps running.

Where do the events come from? A registry — `ui-registry.ts`. Each entry declares the component type, the public function name, a Zod props shape, and the prompt-stub line. That one array feeds three consumers:

```
                  ui-registry.ts
              (single source of truth)
              ┌────────────────────────┐
              │ [                      │
              │   { type,              │
              │     functionName,      │
              │     description,       │
              │     propsShape (zod),  │
              │     promptDeclaration  │
              │   },                   │
              │   …                    │
              │ ]                      │
              └────────────┬───────────┘
                           │
       ┌───────────────────┼───────────────────┐
       ▼                   ▼                   ▼
  ui-bindings.ts      ui-prompt.ts      render-registry.tsx
  (runtime)           (system prompt)   (React)

  ToolBinding for     declare-function  switch on node.type
  each entry; each    block spliced     → <ProductCard/>,
  one's execute       into the LLM's    <ComparisonTable/>,
  emits the typed     system prompt     <CTAButton/>, …
  UIEvent
```

Adding a new primitive is one row in the registry plus one React `case` in `render-registry.tsx`. That's it.

Crucially, **the events stream while the program is still running.** The model awaits `ui_addProductCard`, which awaits `emitCustomEvent`, which writes a frame to the SSE stream — and the browser receives that frame _before_ the program has even decided what to render next. That's what gives you the "cards stream in" feeling instead of "everything appears at once at the end."

## Stop 6: The client store and the canvas

Back to the browser. `useChat`'s `onCustomEvent` routes `storefront:ui` events into `uiStore` (in `src/features/storefront/stores/ui-store.ts`):

```ts
function applyEvent(state: UIState, event: UIEvent): UIState {
  if (event.op === 'clear') return { ...emptyState(), version: state.version + 1 }
  if (event.op === 'update') {
    /* merge props */
  }
  if (event.op === 'remove') {
    /* delete + remove from parent.childIds */
  }
  // op === 'add' — insert node, link to parent or push as root
}
```

It's a plain reducer over a `Map<string, UINode>` plus a `rootIds` array. Backed by `useSyncExternalStore`. No Redux, no Zustand, no signals — just a function that takes a state and an event and returns a new state. I find this hilarious every time, because the conceptual heaviness of "the LLM is rendering UI" reduces, on the client, to ~70 lines of boring tree manipulation.

`StorefrontCanvas` walks the resulting tree and `renderNode` (in `components/canvas/render-node.tsx`) switches on `node.type` to pick the right React component. That's bullets 6 and 7.

When the program returns, its return value is serialized back to the model, the model writes a one-sentence reply ("The Hoka Speedgoat is the best value at $155"), the SSE stream closes, and `onFinish` fires in `useChat`. End of turn.

## Stop 7: When the user clicks the CTA

There's one detail the explainer-style posts gloss over: what happens when the model rendered an "Add to cart" CTA and the user clicks it?

You _could_ re-run the chat agent and let the LLM handle it. That works. But for a single-tool action it's wasteful — you're asking a model to write a program whose only job is to call one binding. So this app uses a second, narrower endpoint: `/api/storefront-handler`.

The CTA's `payload` (productId + size + width + quantity) is encoded into the rendered button. The click POSTs to the handler, which (currently) does the cart mutation directly without invoking the LLM:

```ts
addToCart({ productId, size, width, quantity })
const cart = getCartDetailed()
// stream back: storefront:ui (button label → 'Added to cart'), cart:update (header badge), text reply
```

That's a deliberate choice I made after burning a few model dollars on `addToCart` round-trips that were always going to do the same thing (commit `6556b02`). Code mode is _great_ when the work fans out across multiple tool calls; it's overkill for a single-shot mutation. The cleanest design uses code mode where it pays off (the chat) and bypasses it where it doesn't (the button).

The reverse is also worth noting: the cart UI you see when you ask _"what's in my cart?"_ does go through code mode, because the program needs to call `external_getCart`, then `ui_addCartSummary` with the result, then return a sentence. Same primitives, different cost-benefit.

## What I think when I read this codebase now

A few things have stuck with me after living in this code for a while:

- **The closed vocabulary is the security model.** I keep forgetting this and re-discovering it. The sandbox can't `fetch` the internet, can't read the filesystem, can't import npm. It can only call functions I handed it. So when I'm tempted to "just expose another binding," I'm actually expanding the attack surface — that should hurt a little.
- **The system prompt is a contract.** The model writes against the type stubs in `codeMode.systemPrompt` and `createStorefrontUIPrompt`. If those stubs disagree with the actual binding signatures, the program throws and I burn a retry. Keeping the registry as the source of truth (one place, three consumers: bindings, prompt, React) is the only reason this stays sane.
- **Streaming is the experience.** The reason this app feels different from a traditional tool-calling agent isn't that it's "smarter" — it's that the canvas mutates while the model thinks. That fall-out from `emitCustomEvent` mid-program is half of the perceived UX win.
- **Cost-shifting is the business case.** Every round-trip you eliminate is hundreds of tokens of message history you don't replay on the next turn. For shopping-shaped queries (one search → fan-out → render) the savings compound fast.

## Takeaways

- Code mode replaces a menu of named tools with one tool, `execute_typescript`, whose argument is a TypeScript program — the model produces one generation, the sandbox produces N effects.
- This app exposes _two_ binding families inside the sandbox: `external_*` for catalog and cart work, `ui_*` for typed UI emits. Both flow through the same `createCodeMode` + `getSkillBindings` plumbing.
- Each `ui_*` binding's `execute` doesn't compute — it calls `emitCustomEvent`, sending a typed event up the SSE stream that a client reducer materializes into React mid-program.
- The `ui-registry.ts` array is the single source of truth: bindings, system prompt, and React cases all derive from it. Adding a primitive is one row plus one React case.
- Code mode shines on fan-out workflows; for a single mutation (the "Add to cart" button), this app intentionally bypasses the LLM with a direct handler endpoint. Use code mode where it pays off.

## What to read next

If you want to go deeper from here, the move that taught me the most was this: open the Storekeeper drawer, send a query, and click open the **Code** tab on the program card it produces. You'll see the actual TypeScript the model wrote for your turn. Read it next to the `external_*` and `ui_*` declarations in `ui-prompt.ts`. That side-by-side — _what I told the model it could call_ vs _what it actually called_ — is where the model's behavior stops being mysterious.

When you've done that a few times, the natural follow-on is `@tanstack/ai-code-mode-skills`: same primitive, but successful programs get persisted as named, reusable tools the model can invoke directly. This app intentionally leaves that out of scope — but the [TanStack AI Code Mode announcement](https://tanstack.com/blog/code-mode-let-your-ai-write-programs) walks through the lifecycle, and the [Cloudflare post](https://blog.cloudflare.com/code-mode/) is still the best one-page case for why any of this is worth the trouble.

Now go open the drawer and send a query. The whole thing fits in your head once you've watched it happen once.
