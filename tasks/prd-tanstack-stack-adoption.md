# PRD: TanStack Stack Adoption

## Introduction

The codebase is committed to the TanStack stack but only uses a subset of it (Router, Start, AI, Hotkeys). Several high-leverage TanStack libraries — Query, Form, Store, plus the `createServerFn` RPC primitive and `react-router-ssr-query` integration (which is in `package.json` but unwired) — would replace ~250 lines of hand-rolled boilerplate currently scattered across `src/stores/client-cart.ts`, `src/features/storefront/stores/*`, the cart/order/checkout API route handlers, the manual `FetchState` reducer in `orders.$orderId.tsx`, and the unvalidated `checkout-form.tsx`.

This PRD plans a **phased rollout in four shippable PRs**, each with a clear scope, a verifiable acceptance bar, and isolated blast radius. After all four ship, the data layer, RPC layer, form layer, and store layer all flow through TanStack primitives.

## Goals

- Stand up `QueryClient` + `react-router-ssr-query` so cart and order pages SSR their data with no client-side loading flash.
- Replace ad-hoc `fetch()` calls and untyped `as Body` casts with `createServerFn` for in-app RPC, end-to-end typed with Zod input validators.
- Replace the manual checkout form with TanStack Form sharing the same Zod schema as its server function — single source of validation truth.
- Replace `client-cart.ts`, `ui-store.ts`, and `activity-store.ts` (`useSyncExternalStore` + manual listener bookkeeping) with `@tanstack/store` `createStore` + `useSelector`.
- Make the LLM agent's cart mutations (`external_addToCart` etc.) sync back to the React UI via `queryClient.invalidateQueries` rather than the bespoke `clientCart.refresh()` call in `storekeeper-drawer.tsx`.
- Net code reduction of ≥150 lines while preserving all existing behavior, tests, and devtools coverage.

## User Stories

Each story is one focused implementation session. Phase markers (P1–P4) match the phased rollout; each phase is one PR.

### P1 — Query + SSR-Query foundation

#### US-001: Wire up QueryClient and SSR-Query in the router

**Description:** As a developer, I need a `QueryClient` available on the router context and SSR-hydrated to the client so loaders can prefetch data and components can read it via `useQuery`.

**Acceptance Criteria:**

- [ ] `@tanstack/react-query` added as a dependency.
- [ ] `getRouter()` in `src/app/router.tsx` creates a `QueryClient`, wraps `createTanStackRouter` with `setupRouterSsrQueryIntegration` (or the current API name from `@tanstack/react-router-ssr-query`), and types `Register['router']` accordingly.
- [ ] Router context exposes `queryClient` so loaders can call `context.queryClient.ensureQueryData(...)`.
- [ ] `<TanStackDevtoolsPanel>` for React Query added alongside the existing Router devtools panel in `__root.tsx`.
- [ ] `pnpm typecheck` and `pnpm test` pass.
- [ ] Verify in browser: existing pages still render; React Query devtools panel opens.

#### US-002: Migrate cart fetching to TanStack Query

**Description:** As a developer, I want the cart to be fetched via TanStack Query so the UI re-syncs through `invalidateQueries` instead of imperative `clientCart.refresh()` calls.

**Acceptance Criteria:**

- [ ] New `cartQueryOptions()` in `src/features/storefront/queries/cart.ts` with `queryKey: ['cart']` and `queryFn` calling the existing `/api/cart` GET (or the server function once US-005 lands).
- [ ] `useCart()` hook reimplemented as `useQuery(cartQueryOptions())` returning the same `DetailedCart` shape.
- [ ] `clientCart.mutate(...)` reimplemented as a `useMutation` with optimistic update via `onMutate` (cancel queries → snapshot → optimistically apply mutation → return context), `onError` rollback, and `onSettled` invalidation. Hook lives at `useCartMutation()`.
- [ ] `CartHydrator` component deleted; initial fetch handled by route loader on `__root` or per-route loaders that call `ensureQueryData(cartQueryOptions())`.
- [ ] `src/stores/client-cart.ts` deleted.
- [ ] All call sites updated: `cart.tsx`, `checkout.tsx`, `checkout-form.tsx`, `site-header.tsx`, `storekeeper-drawer.tsx`.
- [ ] Cart count in header still updates instantly when items added/removed via the regular UI buttons.
- [ ] `pnpm typecheck` and `pnpm test` pass.
- [ ] Verify in browser: add to cart from a product card, increment/decrement on `/cart`, remove a line — counter and cart contents stay in sync; no double-fetch on mount.

#### US-003: Migrate order page to loader + Query

**Description:** As a user visiting an order confirmation page, I want the order data to be present on the first paint (SSR) so I don't see a loading spinner.

**Acceptance Criteria:**

- [ ] `orderQueryOptions(orderId)` defined alongside cart query options.
- [ ] `Route` in `src/app/routes/orders.$orderId.tsx` adds `loader: ({ context, params }) => context.queryClient.ensureQueryData(orderQueryOptions(params.orderId))`.
- [ ] Component body replaced with `useSuspenseQuery(orderQueryOptions(orderId))` (or `useQuery` with `Suspense` boundary, depending on what react-router-ssr-query expects).
- [ ] The `FetchState` discriminated union, `useEffect` cancel-flag dance, and manual JSON parsing block are deleted.
- [ ] 404 case handled by throwing a typed not-found error from the queryFn and rendering via `errorComponent` / `notFoundComponent` on the route.
- [ ] `pnpm typecheck` and `pnpm test` pass.
- [ ] Verify in browser: loading `/orders/<valid-id>` shows the order with no flash. Loading `/orders/<bogus-id>` shows the not-found state. Browser back/forward still works.

#### US-004: Sync agent cart mutations via query invalidation

**Description:** As a developer maintaining the agent code, I want the LLM's cart-touching turns to invalidate the cart query rather than calling a custom `refresh()` so there's a single sync mechanism.

**Acceptance Criteria:**

- [ ] In `storekeeper-drawer.tsx`, `onFinish` replaces both `void clientCart.refresh()` calls with `queryClient.invalidateQueries({ queryKey: ['cart'] })`. `queryClient` accessed via `useQueryClient()`.
- [ ] `CART_MUTATING_CALLS` set and `turnTouchedCart()` helper preserved; only the side effect changes.
- [ ] No remaining references to `clientCart` anywhere in the repo.
- [ ] Existing test in `storekeeper-drawer` (if any) updated; agent integration test still passes.
- [ ] Verify in browser: ask the agent "add the first running shoe to my cart" — header counter updates after the turn ends.

### P2 — createServerFn for in-app RPC

#### US-005: Cart server functions

**Description:** As a developer, I want type-safe server functions for cart reads and mutations so the client gets compile-time safety on inputs and outputs.

**Acceptance Criteria:**

- [ ] `src/features/storefront/server/cart.ts` defines:
  - `getCartFn = createServerFn({ method: 'GET' }).handler(...)` returning `DetailedCart`.
  - `mutateCartFn = createServerFn({ method: 'POST' }).inputValidator(cartMutationSchema).handler(...)` returning `DetailedCart`. `cartMutationSchema` is a Zod schema mirroring `CartMutation`.
- [ ] Each handler runs inside `withSession(...)`.
- [ ] `cartQueryOptions` and the cart mutation hook from US-002 now call these server functions instead of `fetch('/api/cart')`.
- [ ] `src/app/routes/api.cart.ts` deleted (no external consumer).
- [ ] `CartMutation` type re-exported from the server-function module so the agent's `external_*` tools and the React mutation share one source of truth, OR the union is derived via `z.infer`.
- [ ] `pnpm typecheck` and `pnpm test` pass.
- [ ] Verify in browser: cart still works end-to-end; no network panel error; SSR loader still hydrates cart correctly.

#### US-006: Order and checkout server functions

**Description:** As a developer, I want order fetch and checkout submission to be type-safe server functions matching the pattern from US-005.

**Acceptance Criteria:**

- [ ] `getOrderFn` (Zod-validated `{ orderId: string }`, returns `Order | null` so the route can render not-found from a `null`).
- [ ] `placeOrderFn` (Zod-validated checkout body, returns `{ orderId: string }`).
- [ ] `orderQueryOptions(orderId)` from US-003 calls `getOrderFn` directly.
- [ ] Checkout form's `fetch('/api/checkout', ...)` call replaced with `placeOrderFn({ data: ... })`.
- [ ] `src/app/routes/api.orders.$orderId.ts` and `src/app/routes/api.checkout.ts` deleted.
- [ ] `pnpm typecheck` and `pnpm test` pass.
- [ ] Verify in browser: place an order, land on `/orders/<id>`, see the confirmation; cart cleared.

#### US-007: Audit and document remaining raw API routes

**Description:** As a developer, I need to know which `api.*.ts` routes must remain raw (because they're consumed externally, e.g., the agent's SSE stream) and which can be deleted.

**Acceptance Criteria:**

- [ ] `api.storefront-agent.ts` (SSE), `api.storefront-handler.ts`, and `api.skills.$name.ts` remain as file-based routes with raw handlers — these are consumed by the AI runtime / browser EventSource and aren't candidates for `createServerFn`.
- [ ] One-line comment at the top of each remaining `api.*.ts` route explaining why it stays a raw handler.
- [ ] `brain/architecture/` updated with a new note `client-server-rpc.md` (or extends `client-server-module-boundary.md`) describing the rule: in-app RPC uses `createServerFn`; external/protocol-shaped endpoints stay as raw route handlers.

### P3 — TanStack Form for checkout

#### US-008: Convert checkout form to TanStack Form + shared Zod schema

**Description:** As a user submitting the checkout form, I want client-side validation that matches the server's, so I see errors before I waste a round-trip.

**Acceptance Criteria:**

- [ ] `@tanstack/react-form` added as a dependency.
- [ ] `checkoutSchema` Zod object lives in a shared module (e.g., `src/features/storefront/server/checkout-schema.ts`) and is consumed by both the `placeOrderFn.inputValidator(checkoutSchema)` from US-006 and the `useForm({ validators: { onSubmit: checkoutSchema } })` in the React form.
- [ ] `src/features/storefront/components/canvas/checkout-form.tsx` rewritten with `useForm` + `<form.Field>` per input. Each field shows its specific Zod error inline.
- [ ] ZIP code, card-number length, expiry pattern, and CVC length are all validated client-side; submit button is disabled when the form is invalid.
- [ ] `DEMO_VALUES` preserved as `defaultValues`.
- [ ] Submission flow unchanged: success → `placeOrderFn` → invalidate cart → navigate to `/orders/$orderId`.
- [ ] `pnpm typecheck` and `pnpm test` pass.
- [ ] Verify in browser: submit with a 3-digit ZIP — see field-level error before the network call. Submit with valid data — order placed, redirected.

### P4 — TanStack Store for in-feature stores

#### US-009: Migrate ui-store to @tanstack/store

**Description:** As a developer, I want `uiStore` to use `createStore` + `useSelector` so I can derive slices without re-render churn and drop the listener-set bookkeeping.

**Acceptance Criteria:**

- [ ] `@tanstack/store` and `@tanstack/react-store` added as dependencies.
- [ ] `src/features/storefront/stores/ui-store.ts` rewritten: state held in a `createStore<UIState>(emptyState())`; `dispatch` and `clear` become methods that call `store.setState`.
- [ ] `useUIState()` becomes `useSelector(uiStore, (s) => s)` (or thin wrapper); call sites unchanged.
- [ ] All existing tests in `ui-store.test.ts` pass without modification.
- [ ] `pnpm typecheck` and `pnpm test` pass.
- [ ] Verify in browser: an agent turn that emits UI events still renders the canvas correctly.

#### US-010: Migrate activity-store to @tanstack/store

**Description:** As a developer, I want the activity store on the same primitive as ui-store so subscription patterns are consistent.

**Acceptance Criteria:**

- [ ] `src/features/storefront/stores/activity-store.ts` rewritten to use `createStore<ActivityState>` and `setState`. The reducer-shaped `mutateTurn` helper becomes a `setState` callback.
- [ ] `useActivityState()` becomes a `useSelector` call.
- [ ] At least one component (e.g., `storekeeper-drawer.tsx`) is updated to use a _targeted_ selector (`useSelector(activityStore, (s) => s.byTurnId[liveTurnId])`) where it currently consumes the whole state — proves the new primitive's main win.
- [ ] All existing tests in `activity-store.test.ts` pass without modification.
- [ ] `pnpm typecheck` and `pnpm test` pass.
- [ ] Verify in browser: agent turn lifecycle (writing → running → succeeded) still drives the program card; logs still stream.

#### US-011: Update brain notes

**Description:** As a future contributor, I want the brain vault to reflect the new architecture so I don't reach for the old patterns.

**Acceptance Criteria:**

- [ ] `brain/architecture/cart-state.md` updated to describe the Query-based cart instead of `client-cart.ts`.
- [ ] `brain/architecture/checkout-flow.md` updated to mention TanStack Form + shared Zod schema.
- [ ] New note `brain/architecture/data-layer.md` (or similar) explaining the loader → `ensureQueryData` → `useSuspenseQuery` pattern, with the cart and order routes as examples.
- [ ] New note describing the rule for `createServerFn` vs raw `api.*` handlers (referenced in US-007).
- [ ] `brain/conventions.md` (if it touches data fetching/store patterns) updated.

## Functional Requirements

- **FR-1:** `getRouter()` must construct a `QueryClient`, integrate it with the router via `react-router-ssr-query`, and expose it on the router context as `queryClient`.
- **FR-2:** All cart reads and mutations from React must flow through TanStack Query (`useQuery`/`useMutation`); no direct `fetch('/api/cart')` calls remain in `src/`.
- **FR-3:** `cart.tsx`, `checkout.tsx`, and `orders.$orderId.tsx` must define a `loader` that calls `context.queryClient.ensureQueryData(...)` for the data they render.
- **FR-4:** Cart mutations must use optimistic updates: `onMutate` snapshots previous data and applies the change, `onError` rolls back, `onSettled` invalidates `['cart']`.
- **FR-5:** When the LLM agent finishes a turn whose `external_*` calls touched the cart, the React tree must re-sync via `queryClient.invalidateQueries({ queryKey: ['cart'] })` — not via a custom refresh function.
- **FR-6:** All in-app RPC (cart get/mutate, order get, checkout submit) must use `createServerFn` with a Zod `inputValidator` and a typed return.
- **FR-7:** File-based `api.*` routes that exist solely as RPC for our own React app must be deleted after their replacement server function ships.
- **FR-8:** `api.storefront-agent.ts`, `api.storefront-handler.ts`, and `api.skills.$name.ts` must remain raw handlers with a top-of-file comment stating why.
- **FR-9:** The checkout form must be implemented with `@tanstack/react-form` and validated against the same Zod schema the `placeOrderFn` server function consumes.
- **FR-10:** `client-cart.ts`, `ui-store.ts`, and `activity-store.ts` must not call `useSyncExternalStore` or maintain hand-rolled `Set<listener>` bookkeeping after P4. They must be backed by `@tanstack/store`.
- **FR-11:** Net source-line delta across `src/` (excluding tests) must be **negative or ≤ +50 lines**, measured by `git diff --stat main`.
- **FR-12:** Existing test suite (`pnpm test`, `pnpm test:e2e`) must pass at the end of every phase. No phase ships with skipped tests.
- **FR-13:** `pnpm typecheck` and `pnpm lint` must pass at the end of every phase.

## Non-Goals

- **No TanStack DB.** No real sync layer in this app; adding `@tanstack/db` would be over-engineering.
- **No TanStack Table.** The comparison table is AI-rendered, non-interactive, and not a data table.
- **No agent code changes beyond US-004.** The TanStack AI integration (`useChat`, `fetchServerSentEvents`, code-mode pipeline) stays as-is.
- **No catalog refactor.** `PRODUCTS` stays an in-memory module; we don't move it behind a server function or query.
- **No swap of session/cookie infrastructure.** `withSession` and `sessionContext` remain unchanged.
- **No SSR for the home page (`index.tsx`).** It already renders from a static module — adding a loader for it is busywork.
- **No persistence/offline mutation queue.** We use Query's optimistic updates but don't dehydrate/hydrate paused mutations.
- **No UI redesign.** This is a structural refactor; pixels stay the same.

## Design Considerations

- **Devtools:** TanStack Query devtools panel is added next to the existing Router panel in `__root.tsx` so the unified `<TanStackDevtools>` shell shows both.
- **Loaders on shared layout:** The cart query is needed in the header (cart count) on every page. Put `ensureQueryData(cartQueryOptions())` on the `__root` route's loader so every page hydrates with cart data.
- **Suspense boundaries:** If `useSuspenseQuery` is chosen for orders, the route component must be wrapped in a Suspense boundary or the route's `pendingComponent` must be set; pick whichever matches the existing loading-skeleton conventions.
- **Form field components:** Reuse `<Input />` from `components/ui/input.tsx` inside `<form.Field>` render props — don't introduce new primitives.
- **Selector granularity:** In `storekeeper-drawer.tsx`, the current `useActivityState()` causes the whole component to re-render on every event. After P4, prefer narrow selectors (e.g., `useSelector(activityStore, (s) => s.currentTurnId)`) where it materially reduces re-renders. Don't over-shard — measure first.

## Technical Considerations

- **`@tanstack/react-router-ssr-query` API drift.** It's already in `package.json` but unused. Verify the exact integration call name (`setupRouterSsrQueryIntegration`, `routerWithQueryClient`, etc.) against current docs in P1; pin the version that works.
- **Order not-found UX.** With Suspense + Query, a 404 needs to surface as either a route-level `errorComponent` or a sentinel return. Pick one and document it in the brain note.
- **Optimistic cart math.** The optimistic `onMutate` for cart mutations needs to recompute `lineTotal` and `subtotal` client-side, mirroring `getCartDetailed()`. Extract a pure `applyMutationToCart(cart, mutation)` helper in `src/lib/cart.ts` so client and server share it. (Server-side, the existing `getCartDetailed()` after `applyMutation` already does this.)
- **Agent and React share `CartMutation` type.** Today defined in `client-cart.ts`. After US-002 it must move to a non-React module so the server function and the agent's `external_*` tools can both import it. Suggest `src/features/storefront/types/cart-mutation.ts` (or co-locate with the Zod schema).
- **`@tanstack/store` adapter package.** Confirm the React adapter package name (`@tanstack/react-store` is the historical name; the consolidated `@tanstack/store` may export `useSelector` directly). Resolve in P4 task US-009.
- **Test coverage.** `ui-store.test.ts` and `activity-store.test.ts` exercise the stores' public surfaces, not the internal listener mechanics — they should pass unchanged when the implementation switches to `createStore`. Treat any failure as a real regression, not a churn artifact.
- **Pre-commit hook.** `simple-git-hooks` runs `lint-staged` + `pnpm typecheck` on commit. Phases must not introduce typecheck failures even mid-refactor.

## Success Metrics

- **Code reduction:** Combined deletion of `src/stores/client-cart.ts` (~85 lines), `src/components/cart-hydrator.tsx` (~10), `src/app/routes/api.cart.ts` (~60), `api.orders.$orderId.ts` (~25), `api.checkout.ts` (~50), and the order page's `FetchState` block (~40) ≈ **270 lines removed**, against an estimated 100-line addition for query/server-function modules. **Net ≥ –150 LOC** in `src/` (excluding tests).
- **Behavioral parity:** All existing Vitest projects (`node`, `dom`) and Playwright e2e tests pass at every phase boundary.
- **Loading flash gone:** `/orders/<id>` and `/cart` paint with data on first frame (verified by manual browser test with throttled CPU).
- **Type safety:** Zero `as Body`-style casts across cart, order, and checkout flows after P2. Searchable: `grep -r "as.*Body" src/app/routes` returns nothing in those files.
- **Single sync mechanism:** `clientCart.refresh()` references in `src/` after P1 = 0.
- **Devtools:** Both Router and Query devtools panels appear in the `<TanStackDevtools>` shell in dev.

## Open Questions

- **`react-router-ssr-query` integration shape.** Resolve the exact setup call against the version in `package.json` during P1's first task. If the API has shifted, update US-001's acceptance criteria before starting.
- **Suspense vs non-suspense queries.** Default to `useSuspenseQuery` on order page (matches "data-on-first-paint" goal) but confirm the existing `pendingComponent` infrastructure on routes is acceptable. If not, fall back to `useQuery` with a manual loading branch.
- **Where does `cartQueryOptions` live?** Proposed: `src/features/storefront/queries/`. Confirm before P1 — or move to `src/lib/queries/` if the convention favors lib-level shared queries.
- **Should the agent's `external_*` cart tools call the same server functions?** They run inside an isolate and currently use the bound `catalog-tools.ts`. Out of scope for this PRD, but flag in the brain note for a future cleanup.
- **TanStack Store adapter name.** `@tanstack/react-store` vs `@tanstack/store` exporting `useSelector` — verify in P4 and pick.
