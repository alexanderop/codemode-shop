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
2. **Reuse the driver across requests** — driver creation does the `isolated-vm` probe and other setup. We pay it once per `(timeout, memoryLimit)` combo per process.

## Code-mode is rebuilt per request, not cached

Unlike the driver, `buildStorefrontCodeMode({ driver, sessionId, timeout })` (in `src/features/storefront/api/code-mode.ts`) runs on every request because `getSkillBindings` closes over `sessionId` to produce session-scoped catalog tools (`createSessionScopedCatalogTools(sessionId)`). Caching the code-mode would leak one session's tools into another. Construction is cheap — just object plumbing — so this isn't a hot path.

If you ever want per-request bindings beyond `sessionId` (e.g. user-scoped tools), keep doing it via the `getSkillBindings` closure. Don't try to leak the request through the driver cache.

See [[architecture/code-mode]] and [[architecture/code-mode-execution-pipeline]].
