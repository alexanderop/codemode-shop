# Subscribe to live state, don't snapshot it as props

When a component renders shared mutable state — cart, current user, online status, anything the source of truth can update underneath — have it subscribe to the live store. **Don't accept that state as props.** Snapshot props freeze the moment of mount; the store keeps changing; the two diverge silently and the user sees inconsistent surfaces.

**Why:** Drift is invisible until a user reports "the chat cart shows 30 but the badge shows 34." By then you've already shipped a contract — caller code, prompt declarations, agent training — that _passes_ the state. Removing it later is a breaking change. The cheap moment to reject snapshot props is when you draft the schema, before any caller exists.

**The contract test:** When you design a component or tool API for a surface that displays shared state, look at what it accepts. If the answer includes the state itself (`items`, `subtotal`, `currentUser`, `unreadCount`), redesign. The right contract takes a render signal — `{ id }`, or a query key like `{ orderId }` — and the component reads the live data from the store.

**Rule:**

- Components that render shared mutable client state subscribe to its store (`useCart()`, `useSession()`, etc.). They don't accept the same data as props, even when a caller "has it handy."
- Tool / UI primitive schemas that mount such components don't accept the data either — only enough to identify _which_ slice (an order ID, a user ID).
- If a snapshot is genuinely what you want — a frozen historical view, an audit log, a receipt for an immutable record — name it accordingly and keep it pure-props. The distinction must be intentional, not accidental.

**Examples in this repo:**

- `<CartSummary />` and the in-canvas `<CheckoutForm />` (`src/features/storefront/components/canvas/`) read totals and lines from `useCart()`. The agent's `ui_addCartSummary({ items, itemCount, subtotal })` and `ui_addCheckoutForm({ subtotal, lineCount })` snapshot props are still accepted by the schema but ignored — schema cleanup is follow-up work, see [[principles/migrate-callers-then-delete-legacy-apis]].
- `<OrderConfirmation />` is the counterexample done right: an order is immutable once placed, so taking the full order as props matches reality. The "shared mutable state" trigger doesn't apply, and snapshot props _are_ the live data.

**Boundaries:**

- Pure presentational components — a `<Price />` formatter, a `<StockPill />` — that take any value as props are fine. They're not "the cart," they're "show me a number." The trigger is _shared mutable state_, not "any data."
- Parent → child data flow within a single render is not the same thing. Drift only matters when the source of truth changes underneath a long-lived render.
- This is the tactical companion to [[principles/prefer-one-source-of-truth]]: that one says "one store"; this one says "components subscribe to it directly — receiving it as props is the bug."
