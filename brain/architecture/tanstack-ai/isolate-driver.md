# Isolate drivers

Three implementations of `IsolateDriver`, all interchangeable:

| Driver     | Package                           | Tradeoff                                                                               |
| ---------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| Node       | `@tanstack/ai-isolate-node`       | V8 + JIT, fastest. Requires `isolated-vm` C++ addon (native compile). **What we use.** |
| QuickJS    | `@tanstack/ai-isolate-quickjs`    | WASM, no native deps. Works in browsers/edge. Interpreted (slower). Limited stdlib.    |
| Cloudflare | `@tanstack/ai-isolate-cloudflare` | Runs against a deployed Worker. Network latency per tool call.                         |

The code-mode tool calls `driver.createContext({ bindings, timeout, memoryLimit })`, then `context.execute(code)`, then `context.dispose()` (always, in `finally`). One context per `execute_typescript` invocation — fresh sandbox each turn, no shared state.

`probeIsolatedVm()` from the Node package checks compatibility before crashing — the driver auto-probes unless you pass `skipProbe: true` (don't).

If we ever ship a fully client-side build, we'd swap to QuickJS. The `external_*` tools would also need to move client-side (or call out to the server).
