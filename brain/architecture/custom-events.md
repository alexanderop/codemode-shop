# Custom event channels

- `storefront:ui` — UI tree mutations (`add`/`update`/`remove`/`clear`). Dispatched to `uiStore`.
- `cart:update` — header badge refresh (handler only). Dispatched to `clientCart`.
- `code_mode:*` — `execution_started`, `external_call`, `external_result`, `external_error`, `console`. Recorded in `activityStore` to drive the `ProgramCard` UI that shows what the LLM's program did.
