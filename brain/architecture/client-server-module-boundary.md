# Client/server module boundary

Vite externalizes `node:async_hooks` (and other Node built-ins) for the browser. If a client component transitively imports a module that uses `AsyncLocalStorage`, the browser throws at module-load — but the throw silently halts hydration of the entire subtree. **No console error. No stack trace. Just "the click does nothing."**

## How it bites

`src/lib/cart.ts` uses `sessionContext` (an ALS) for session-scoped state. `cart-summary.tsx` (client) only needs the `cartLineKey` helper, but importing it from `#/lib/cart` drags ALS into the client bundle and silently kills hydration of the surrounding tree (e.g. `<AssistantShortcut />` — chat won't open). Same hazard hit during the per-session refactor: any runtime-value import from a module using `node:async_hooks` is a leak.

## Fix

**Extract pure helpers to their own files.** `src/lib/cart-key.ts` holds `cartLineKey`. `src/lib/cart.ts` re-exports it for server callers. Client code imports directly from `#/lib/cart-key`.

```ts
// src/lib/cart-key.ts — safe in client bundles
import type { Width } from '#/lib/catalog'
export function cartLineKey(productId: string, size: string, width: Width) {
  return `${productId}|${size}|${width}`
}
```

## Rule

If a module touches `sessionContext` (or any other `node:*` API), keep it server-only. Pure helpers that are used by both client and server live in their own file. **Type-only imports (`import type`) are safe** — they're erased — but any runtime value import pulls the whole module.

When debugging "this client behavior just stopped working with no error," check the import graph for an ALS module first. See [[principles/fix-root-causes]] — instrument over guessing.
