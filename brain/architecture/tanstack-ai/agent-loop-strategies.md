# Agent loop strategies

Function `({ iterationCount, messages, finishReason }) => boolean`. Returning `false` stops the loop after the current iteration.

Built-ins (`@tanstack/ai`):

- `maxIterations(n)` — `iterationCount < n`. Default if no strategy supplied is `maxIterations(5)`.
- `untilFinishReason(reasons[])` — stop on a specific finish reason (e.g. `["stop", "length"]`). Always allows the first iteration.
- `combineStrategies([s1, s2])` — AND.

Our usage:

- Main agent (`/api/storefront-agent`): `maxIterations(6)` — gives the model room to retry if its first program crashes.
- The handler (`/api/storefront-handler`) is hard-coded — it does **not** call `chat()`, so no strategy applies. See [[architecture/request-flow]].

If you change the main agent strategy, also revisit `STOREFRONT_PROMPT`, which assumes a single `execute_typescript` call.
