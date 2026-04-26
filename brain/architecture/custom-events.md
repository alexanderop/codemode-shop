# Custom event channels

- `storefront:ui` — UI tree mutations (`add`/`update`/`remove`/`clear`). Dispatched to `uiStore`.
- `cart:update` — full `DetailedCart` (handler only). `run-handler.ts` writes it directly into the TanStack Query cache via `setQueryData(cartQueryKey, …)`. See [[architecture/cart-state]].
- `code_mode:*` — `execution_started`, `external_call`, `external_result`, `external_error`, `console`. Recorded in `activityStore` to drive the `ProgramCard` UI that shows what the LLM's program did.
