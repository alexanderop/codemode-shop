# Orders

Session-scoped `Map<SessionId, Map<string, Order>>` in `src/lib/orders.ts`. Each request resolves its session via `sessionContext.get()`. **In-memory only — restart wipes everything.**

## Lifecycle

`placeOrder({ shippingAddress, paymentLast4 })`:

1. Reads the current cart via `getCartDetailed()` (also session-scoped — see [[architecture/cart-state]]).
2. Computes `shippingCost` (from shopper zip), `tax` (8%), `total`.
3. Mints `id = ord_${crypto.randomUUID()}`.
4. Stores the order in the session's bucket, **clears the cart**, returns the `Order`.

`getOrder(id)` is the only read.

## Fake payment (`src/lib/payment.ts`)

`processFakePayment({ cardNumber, expiry, cvc, amount })` validates basic shape (13–19 digits, `MM/YY`, 3–4 digit CVC, positive amount), waits 1.5s, and **always succeeds** with `{ ok: true, last4 }`. No decline path exists.

## Two surfaces

See [[principles/prefer-one-source-of-truth]] and [[architecture/checkout-flow]].

- **REST**: `POST /api/checkout` runs payment + placeOrder, returns `{ orderId }`. `GET /api/orders/$orderId` reads. Used by the `/checkout` page and the in-canvas `CheckoutForm`.
- **Chat sandbox**: `external_placeOrder({ shippingAddress, payment: { cardNumber, expiry, cvc } })` chains `processFakePayment` + `placeOrder` (the external tool takes raw card details; only the internal `placeOrder` sees `paymentLast4`). `external_getOrder({ id })` reads. The agent calls `placeOrder` directly only when the shopper has explicitly given card + address in chat — otherwise it renders `ui_addCheckoutForm` and lets the form post.

There is no `listOrders` tool by design — out of scope.
