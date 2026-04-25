# Agent loop strategies

Function `({ iterationCount, messages, finishReason }) => boolean`. Returning `false` stops the loop after the current iteration.

Built-ins (`@tanstack/ai`):

- `maxIterations(n)` — `iterationCount < n`. Default if no strategy supplied is `maxIterations(5)`.
- `untilFinishReason(reasons[])` — stop on a specific finish reason (e.g. `["stop", "length"]`). Always allows the first iteration.
- `combineStrategies([s1, s2])` — AND.

Our usage:

- Main agent: `maxIterations(6)` — gives the model room to retry if its first program crashes.
- Handler: `maxIterations(2)` — one tool call + one short text reply, that's all we want.

If you change these, also revisit the prompts (`STOREFRONT_PROMPT` / `HANDLER_PROMPT`) which assume a single `execute_typescript` call.
