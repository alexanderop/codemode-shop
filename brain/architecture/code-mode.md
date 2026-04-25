# Code mode

TanStack Start app where the shopping assistant answers queries by writing **one TypeScript program per turn** that executes inside a Node isolate (`@tanstack/ai-isolate-node`, backed by the `isolated-vm` C++ addon — V8 with JIT). The program calls two families of async functions:

- `external_*` — catalog tools (`searchProducts`, `getProduct`, `getStockAndShipping`, `getReviewSummary`, `getPriceHistory`, `addToCart`, `getCart`).
- `ui_*` — UI primitives that emit SSE custom events back to the client, materialized into React components live as the program runs.

The win: one LLM generation + N sandboxed tool calls, instead of N round-trips through the model.

See [[architecture/tanstack-ai/index]] for what the library does under the hood.
