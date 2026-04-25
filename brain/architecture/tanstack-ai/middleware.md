# Middleware

Lifecycle hooks attached via `chat({ middleware: [...] })`. Run left-to-right. We don't currently use any custom middleware, but if we ever need analytics, retries, tool caching, or per-iteration config tweaks — middleware is the right hook, not a callback on `chat()`.

Available hooks (subset): `onConfig`, `onStart`, `onIteration`, `onChunk`, `onBeforeToolCall`, `onAfterToolCall`, `onToolPhaseComplete`, `onUsage`, `onFinish`, `onAbort`, `onError`.

Notes worth knowing before reaching for these:

- Terminal hooks (`onFinish` / `onAbort` / `onError`) are mutually exclusive — exactly one fires per `chat()` invocation.
- `chat()` itself has **no `onFinish` / `onEnd` callback option** — it must be middleware.
- `ctx.defer(promise)` registers a side-effect that's awaited at stream end without blocking emission.
- Built-in `tool-cache` middleware (in `@tanstack/ai/middlewares`) is a starting point for caching expensive tool results across turns.
