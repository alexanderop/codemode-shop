# Prefer One Source of Truth

When multiple surfaces need the same data or behavior — REST endpoint and sandbox tool, cart page and in-canvas cart, page form and chat-rendered form — route them all through one server-side function and one client-side store. Never reimplement the logic on either side.

**Why:** Parallel implementations drift. Bug fixes land on one path and not the other; new fields appear in one shape and not the other; tests start asserting against whichever copy the author was looking at. The cost shows up later, when a "weird inconsistency" report turns into a refactor.

**Rule:**

- Each piece of business logic lives in exactly one function. Surfaces that need it call that function.
- Each piece of client state lives in one store. Surfaces that need it subscribe to that store.
- When adding a new surface (a new route, a new tool, a new agent), the design test is: _which existing function does this delegate to?_ If the answer is "I'll write a parallel one," reject the design.

**Examples in this repo:**

- `src/lib/cart.ts` is called by both `POST /api/cart` (REST) and the session-scoped `external_*` cart tools (sandbox). See [[architecture/cart-state]].
- `src/lib/orders.ts` `placeOrder()` is called by both `POST /api/checkout` and `external_placeOrder`. See [[architecture/orders]].
- `<CheckoutForm />` mounts in both `/checkout` and the in-canvas `ui_addCheckoutForm` node, both posting to `/api/checkout`. See [[architecture/checkout-flow]].
- `clientCart` (`src/stores/client-cart.ts`) is the single client cache; the REST mutation, the SSE `cart:update` event, and the chat-turn `onFinish` refresh all converge on it.

**Boundaries:**

- This is forward-design, not legacy migration — see [[principles/migrate-callers-then-delete-legacy-apis]] for cleaning up an existing duplication.
- Not the same as [[principles/subtract-before-you-add]] (which is about removing what you don't need); this is about pointing what you _do_ need at one core.
- Not the same as [[principles/boundary-discipline]] (about validation placement); this is about runtime call topology.
