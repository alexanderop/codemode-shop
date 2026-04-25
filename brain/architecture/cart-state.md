# Cart state

Session-scoped `Map<SessionId, Map<string, CartLine>>` in `src/lib/cart.ts`. Each request resolves its session via `sessionContext.get()` (see [[architecture/sessions]] if present, else `src/lib/session-context.ts` + `src/lib/session.ts`). **In-memory only — restart = empty.**

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

## Client cart store (`src/stores/client-cart.ts`)

Holds the full `DetailedCart` shape (not just count). `useCart()` returns the cart, `useCartCount()` derives the badge count.

The store is hydrated/refreshed by:

- `<CartHydrator />` in `src/app/routes/__root.tsx` — fetches `/api/cart` once on mount.
- Every REST mutation re-uses the response body to call `clientCart.set(next)`.
- Handler endpoint emits `cart:update` SSE event (full `DetailedCart`) → `run-handler.ts` calls `clientCart.set`.
- Chat agent's `onFinish` callback in `src/features/storefront/components/storekeeper-drawer.tsx` calls `clientCart.refresh()` only when the turn touched the cart (`turnTouchedCart` short-circuit) — covers direct `external_addToCart` / `placeOrder` calls inside the sandbox without spamming `/api/cart` on pure search turns.
- `run-handler.ts` tracks whether the stream actually emitted `cart:update`; if not (e.g. the handler-agent forgot to call `cart_update({})`), it falls back to `clientCart.refresh()` once the stream ends. Safety net — the handler-LLM has been observed using `cart_update` as a UI node id instead of invoking the binding, so don't rely on it alone.
