# Request flow

## Chat AI (the storekeeper)

1. Client (`src/features/storefront/components/storekeeper-drawer.tsx`) uses `useChat` from `@tanstack/ai-react` against `/api/storefront-agent`.
2. Server route (`src/app/routes/api.storefront-agent.ts`) wraps the handler in `withSession` (resolves `sessionId` into `sessionContext`), gets the cached driver via `getStorefrontDriver({ timeout, memoryLimit })`, and constructs the per-request code-mode with `buildStorefrontCodeMode({ driver, sessionId, timeout })`. The code-mode's `getSkillBindings` closure injects session-scoped catalog tools (`createSessionScopedCatalogTools(sessionId)`) plus the storefront UI bindings. See [[architecture/module-cache-pattern]].
3. Inside the sandbox, `ui_*` bindings call `context.emitCustomEvent('storefront:ui', event)`. Those events flow to the browser as SSE `CUSTOM` chunks.
4. `uiStore.dispatch(event)` (a plain `useSyncExternalStore`-backed reducer in `src/features/storefront/stores/ui-store.ts`) applies each event to a node tree. `StorefrontCanvas` + `renderNode` walk the tree.
5. CTA clicks POST to `/api/storefront-handler`, which re-enters code mode with a narrower prompt + `cart_update` binding. Streamed events are read manually by `src/features/storefront/api/run-handler.ts` (it re-parses SSE frames itself — it does NOT go through `useChat`).
6. After every chat turn, `onFinish` in the drawer calls `clientCart.refresh()` **only when the turn touched the cart** (`turnTouchedCart` short-circuit) so cart mutations made directly inside the sandbox (e.g. `external_placeOrder`) reach the header badge without spamming `/api/cart` on pure search turns.

## Regular UI mutations (no LLM in the loop)

- `GET /api/cart` → read; `POST /api/cart` with `{ action }` → mutate. Both return the `DetailedCart`. Used by `/cart`, the in-canvas cart controls, and product card quick-add.
- `POST /api/checkout` → runs `processFakePayment` + `placeOrder`, returns `{ orderId }`. Used by `/checkout` and the in-canvas `CheckoutForm`.
- `GET /api/orders/$orderId` → read.

See [[architecture/checkout-flow]] for how both surfaces reach `/api/checkout`.
See [[architecture/tanstack-ai/chat-engine]] for what the agent loop does between steps 2 and 3, and [[architecture/code-mode-execution-pipeline]] for what `execute_typescript` does internally.
