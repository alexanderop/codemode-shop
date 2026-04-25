# Module-cached code mode

Both `api.storefront-agent.ts` and `api.storefront-handler.ts` define:

```ts
let codeModeCache: ReturnType<typeof createCodeMode> | null = null
async function getCodeMode() {
  if (!codeModeCache) {
    const { createNodeIsolateDriver } = await import('@tanstack/ai-isolate-node')
    ...
    codeModeCache = createCodeMode({ driver, tools: catalogTools, ... })
  }
  return codeModeCache
}
```

Two things this is doing:

1. **Lazy `await import`** — `@tanstack/ai-isolate-node` pulls in `isolated-vm` (native addon). Importing it eagerly at module top-level breaks SSR/build environments that don't have the binary. Dynamic import keeps the route tree-shakeable.
2. **Reuse the driver across requests** — driver creation does the `isolated-vm` probe and other setup. We only pay that once per process. Per-request state stays inside `createContext` (which IS made fresh every `execute_typescript`, see [[architecture/code-mode-execution-pipeline]]).

The catalog tools are static and the `getSkillBindings` callback closes over nothing request-specific (UI bindings only need the request when they `emitCustomEvent`, which is wired through `ToolExecutionContext` per-call). So the cache is safe.

If we ever need per-request bindings that depend on the Request object (e.g. user-scoped tools), build a new code-mode per request — don't try to leak the request through the cache.
