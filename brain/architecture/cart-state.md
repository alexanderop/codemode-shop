# Cart state

Session-scoped `Map<SessionId, DetailedCart>` in `src/lib/cart.ts`. Each request resolves its session via `sessionContext.get()` (`src/lib/session-context.ts` + `src/lib/session.ts`). **In-memory only — restart = empty.**

## The deep module

`src/lib/cart-mutation.ts` owns the cart concept: `DetailedCart` value type, `CartMutation` discriminated union (`add | set | remove | clear`), `cartLineKey`, and the pure transform `applyMutationToCart(cart, mutation) → DetailedCart`. No `sessionContext` import — safe for client bundles.

`src/lib/cart.ts` is the thin server bridge — two functions, ~20 lines:

- `getCart(): DetailedCart` — read the current session's cart (returns `EMPTY_CART` when absent).
- `mutateCart(mutation): DetailedCart` — `store.set(sid, applyMutationToCart(store.get(sid) ?? EMPTY_CART, mutation))`, return the new cart.

The client side (`src/queries/cart.ts:useCartMutation`) calls `applyMutationToCart` for optimistic updates and the `mutateCart` ServerFn for the real write. **One transform drives both surfaces** — the client's optimistic and the server's actual mutation cannot drift.

## Two surfaces, one source of truth

See [[principles/prefer-one-source-of-truth]] and [[architecture/checkout-flow]].

- **REST**: `GET /api/cart`, `POST /api/cart` with `{ action: 'add' | 'set' | 'remove' | 'clear', ... }`. Used by the regular UI.
- **Chat sandbox**: `external_addToCart`, `external_removeFromCart`, `external_setCartQuantity`, `external_clearCart`, `external_getCart`. These come from `createSessionScopedCatalogTools(sessionId)` in `src/lib/tools/catalog-tools.ts` — each session gets its own bound tool set so the sandbox can't see another session's cart. Each tool builds a `CartMutation` and calls `mutateCart` (or `getCart` for the reader).

`external_placeOrder` and `external_getOrder` are part of the same session-scoped tool set — see [[architecture/orders]].

## Client cart state — TanStack Query

`src/queries/cart.ts` owns the cart on the client. There is no module-scoped store.

- `cartQueryOptions()` / `useCart()` / `useCartCount()` — read.
- `useCartMutation()` — optimistic update against the `['cart']` queryKey, rolls back on error, replaces with the server response on success.
- `invalidateCart(queryClient)` — triggers a refetch.

Hydration / refresh:

- `__root.tsx` loader prefetches `cartQueryOptions()` so the badge is correct on first paint.
- The handler endpoint emits a `cart:update` SSE frame carrying the full `DetailedCart`. `run-handler.ts` calls `queryClient.setQueryData(cartQueryKey, …)` directly. If no `cart:update` arrives during the stream (e.g. a sandbox call mutated the cart without the SSE frame), `run-handler.ts` calls `invalidateCart(queryClient)` once at stream end as a safety net.
- The drawer's `onFinish` calls `invalidateCart(queryClient)` only when the turn touched the cart (`turnTouchedCart` short-circuit) so cart mutations made directly inside the sandbox reach the badge without spamming `/api/cart` on pure search turns.
