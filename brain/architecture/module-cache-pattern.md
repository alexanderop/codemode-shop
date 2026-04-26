# Module-cached driver

The `isolated-vm` driver is expensive to construct (native probe + setup) and stateless across requests. We cache it in `src/features/storefront/api/driver.ts`:

```ts
const driverCache = new Map<string, Promise<IsolateDriver>>()

export function getStorefrontDriver(opts: { timeout: number; memoryLimit: number }) {
  const key = `${opts.timeout}:${opts.memoryLimit}`
  let pending = driverCache.get(key)
  if (!pending) {
    pending = (async () => {
      const { createNodeIsolateDriver } = await import('@tanstack/ai-isolate-node')
      return createNodeIsolateDriver(opts)
    })()
    driverCache.set(key, pending)
  }
  return pending
}
```

Two things this is doing:

1. **Lazy `await import`** — `@tanstack/ai-isolate-node` pulls in `isolated-vm` (native addon). Importing it eagerly at module top-level breaks SSR/build environments without the binary. Dynamic import keeps the route tree-shakeable.
2. **Reuse the driver across requests** — driver creation does the `isolated-vm` probe and other setup. We pay it once per `(timeout, memoryLimit)` combo per process. The cache is keyed by config rather than identity, which makes startup [[principles/make-operations-idempotent|idempotent]] — concurrent first-callers converge on the same `Promise<IsolateDriver>` instead of double-initializing.

## Code-mode is rebuilt per request, not cached

Unlike the driver, `buildStorefrontCodeMode({ driver, sessionId, timeout })` (in `src/features/storefront/api/code-mode.ts`) runs on every request because `getSkillBindings` closes over `sessionId` to produce session-scoped catalog tools (`createSessionScopedCatalogTools(sessionId)`). Caching the code-mode would leak one session's tools into another. Construction is cheap — just object plumbing — so this isn't a hot path.

If you ever want per-request bindings beyond `sessionId` (e.g. user-scoped tools), keep doing it via the `getSkillBindings` closure. Don't try to leak the request through the driver cache.

## Failure mode if you regress the lazy import

A static top-level `import { createNodeIsolateDriver } from '@tanstack/ai-isolate-node'` crashes Vite/Nitro at module-eval time. Symptoms in the browser:

- "A component was suspended by an uncached promise" on every render
- Page reload-loops with no obvious server-side error
- Server logs are clean — the route module never finished evaluating

`vite.config.ts` `ssr.external` must include the native/wasm packages so SSR doesn't try to bundle them: `isolated-vm`, `esbuild`, `quickjs-emscripten`, `quickjs-emscripten-core`, `@jitl/quickjs-wasmfile-release-asyncify`, `@jitl/quickjs-wasmfile-release-sync`, `@jitl/quickjs-wasmfile-debug-asyncify`, `@jitl/quickjs-wasmfile-debug-sync`. Plus `optimizeDeps.exclude` for `isolated-vm` and `quickjs-emscripten`. Plus the Nitro plugin's `rollupConfig.external` for `isolated-vm`.

See [[architecture/code-mode]] and [[architecture/code-mode-execution-pipeline]].
