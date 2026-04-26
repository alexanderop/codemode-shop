# Cart state

Session-scoped `Map<SessionId, Map<string, CartLine>>` in `src/lib/cart.ts`. Each request resolves its session via `sessionContext.get()` (`src/lib/session-context.ts` + `src/lib/session.ts`). **In-memory only — restart = empty.**

## Operations (server-side, called by both REST endpoints and sandbox tools)

- `addToCart({ productId, size, width, quantity })` — increments line qty for the current session
- `removeFromCart({ productId, size, width })` — drops the line
- `setCartLineQuantity({ productId, size, width, quantity })` — qty 0 removes
- `clearCart()` — empties everything
- `getCartDetailed()` — enriched lines + `itemCount` + `subtotal`

## Two surfaces, one source of truth

See [[principles/prefer-one-source-of-truth]] and [[architecture/checkout-flow]].

- **REST**: `GET /api/cart`, `POST /api/cart` with `{ action: 'add' | 'set' | 'remove' | 'clear', ... }`. Used by the regular UI.
- **Chat sandbox**: `external_addToCart`, `external_removeFromCart`, `external_setCartQuantity`, `external_clearCart`, `external_getCart`. These come from `createSessionScopedCatalogTools(sessionId)` in `src/lib/tools/catalog-tools.ts` — each session gets its own bound tool set so the sandbox can't see another session's cart. The bound tools wrap the same module functions that the REST endpoints call.

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
