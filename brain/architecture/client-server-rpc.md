# Client/server RPC

> **Status: forward-design rule.** As of writing, this codebase has no
> `createServerFn` callers — every server entry point is still a file-based
> `api.*` route. The rule below governs the P2 adoption (see
> `tasks/prd-tanstack-stack-adoption.md`, US-005 / US-006). When new client → server
> calls land, follow this rule rather than copying existing routes.

## Rule

- **In-app RPC → `createServerFn`.** Reads or mutations whose only consumer is our
  own React tree (cart get/mutate, order get, checkout submit, future per-skill
  mutations) belong in `createServerFn` with a Zod `inputValidator` and a typed
  return. The client gets compile-time safety on inputs and outputs; the route
  module disappears.
- **Protocol-shaped endpoints → raw file-based route.** If the response is a
  streaming protocol — SSE for `useChat`, a hand-parsed multi-frame
  `ReadableStream`, an EventSource consumer — the endpoint stays a raw
  `createFileRoute(...)` handler. `createServerFn` is RPC, not a transport.

## Why

- `createServerFn` returns a value. SSE / multi-frame streams aren't values; their
  consumers (`useChat`, `run-handler.ts`) read frames over time and would have to
  reimplement the framing if forced through an RPC shim.
- Raw routes give us full control over headers (`text/event-stream`, `Cache-Control`,
  `Connection`) and the response body. RPC primitives don't expose those knobs
  cleanly.
- Splitting on consumer shape (RPC vs protocol) keeps the boundary obvious. A new
  contributor can decide where a new endpoint goes by asking one question: _does
  the client read a value or a stream of frames?_

## Routes that stay raw today

`api.storefront-agent.ts` (SSE for `useChat`) and `api.storefront-handler.ts`
(multi-frame stream parsed by `run-handler.ts`) — both protocol-shaped, see
[[request-flow]]. `api.skills.$name.ts` is raw today even though it's in-app RPC;
revisit when a second skill mutation appears. Each route has a top-of-file
comment pointing back to this note.

## Related

- [[client-server-module-boundary]] — keep ALS / `node:*` modules off the client
  bundle. Server functions still need this discipline (handler bodies run server-
  side, but type-only imports are safe; runtime-value imports leak).
- [[principles/prefer-one-source-of-truth]] — server functions and the agent's
  `external_*` tools should call the same underlying module function (e.g.
  `src/lib/cart.ts`); the server function is just a typed transport.
- [[cart-state]] — current cart fetching path; will move behind `getCartFn` /
  `mutateCartFn` in P2.
- [[checkout-flow]] — current checkout POST; will move behind `placeOrderFn` in P2.
