# Checkout flow

Two paths reach the same `POST /api/checkout` endpoint:

## Path A — regular UI

1. Shopper opens `/cart`, clicks **Proceed to checkout** → navigates to `/checkout`.
2. `/checkout` mounts `<CheckoutForm />` (the same React component used in the canvas).
3. Form submit → `POST /api/checkout` with `{ shippingAddress, payment }` → returns `{ orderId }`.
4. `useNavigate({ to: '/orders/$orderId' })` → renders `<OrderConfirmation />`.

## Path B — chat AI

1. Shopper says "checkout" / "place my order" without giving card details.
2. Agent calls `ui_addCheckoutForm({ id: 'checkout', subtotal, lineCount })`.
3. Same `<CheckoutForm />` mounts in the drawer canvas.
4. Same submit path as above. Navigation to `/orders/$orderId` closes the drawer naturally (the page changes).

If the shopper gives full payment details in chat, the agent skips the form: it calls `external_placeOrder({ shippingAddress, payment })` directly and then `ui_addOrderConfirmation`.

## Why the form (not the LLM) handles submit

The form posts directly to `/api/checkout`, not through the LLM handler. Re-entering code mode for a pure mutation would just slow it down; the form already has all the data and the server already has all the logic.
