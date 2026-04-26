# Request flow

## Chat AI (the storekeeper)

1. Client (`src/features/storefront/components/storekeeper-drawer.tsx`) uses `useChat` from `@tanstack/ai-react` against `/api/storefront-agent`.
2. Server route (`src/app/routes/api.storefront-agent.ts`) wraps the handler in `withSession` (resolves `sessionId` into `sessionContext`), gets the cached driver via `getStorefrontDriver({ timeout, memoryLimit })`, and constructs the per-request code-mode with `buildStorefrontCodeMode({ driver, sessionId, timeout })`. The code-mode's `getSkillBindings` closure injects session-scoped catalog tools (`createSessionScopedCatalogTools(sessionId)`) plus the storefront UI bindings. See [[architecture/module-cache-pattern]].
3. Inside the sandbox, `ui_*` bindings call `context.emitCustomEvent('storefront:ui', event)`. Those events flow to the browser as SSE `CUSTOM` chunks.
4. `uiStore.dispatch(event)` (a plain `useSyncExternalStore`-backed reducer in `src/features/storefront/stores/ui-store.ts`) applies each event to a node tree. `StorefrontCanvas` + `renderNode` walk the tree.
5. CTA clicks POST to `/api/storefront-handler`. The handler is **hard-coded** (no LLM, no code-mode): it accepts `{ handlerId: 'addToCart', payload, zipCode }`, runs `addToCart` server-side, and emits an SSE stream of `storefront:ui` (CTA label update), `cart:update` (full `DetailedCart`), and a single text frame. Streamed events are read manually by `src/features/storefront/api/run-handler.ts` (it re-parses SSE frames itself — it does NOT go through `useChat`).
6. `run-handler.ts` consumes the stream: `cart:update` frames write directly into the cart query (`queryClient.setQueryData(cartQueryKey, …)`); if no `cart:update` arrived, it calls `invalidateCart(queryClient)` at stream end. The drawer's chat `onFinish` independently calls `invalidateCart` when `turnTouchedCart` says the agent turn touched cart state — covers cart mutations made directly inside the sandbox (e.g. `external_placeOrder`) without spamming `/api/cart` on pure search turns.

## Regular UI mutations (no LLM in the loop)

- `GET /api/cart` → read; `POST /api/cart` with `{ action }` → mutate. Both return the `DetailedCart`. Used by `/cart`, the in-canvas cart controls, and product card quick-add.
- `POST /api/checkout` → runs `processFakePayment` + `placeOrder`, returns `{ orderId }`. Used by `/checkout` and the in-canvas `CheckoutForm`.
- `GET /api/orders/$orderId` → read.

See [[architecture/checkout-flow]] for how both surfaces reach `/api/checkout`.
See [[architecture/tanstack-ai/chat-engine]] for what the agent loop does between steps 2 and 3, and [[architecture/code-mode-execution-pipeline]] for what `execute_typescript` does internally.
