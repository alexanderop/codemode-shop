# Markdown rendering

Use `ComarkClient` from `@comark/react` in client trees. **Not `Comark`.**

`Comark` is the default export and is an `async` Server Component. Used inside a Client Component (anything in `storekeeper-drawer.tsx` or its subtree) under React 19 it throws "A component was suspended by an uncached promise" on every render — symptom is a page that reload-loops with no obvious server-side error. `ComarkClient` is the sync equivalent with the same prop shape.

The reload loop with no log line is a [[principles/fix-root-causes]] case study: the surface symptom (loop) doesn't point at the cause (a server component suspending a client tree). Instrument the boundary, then the trace becomes obvious.

```ts
import { ComarkClient } from '@comark/react'

<ComarkClient markdown={markdown} streaming={isLiveStream} caret={false} />
```

`streaming` lets the renderer cope with mid-token markdown (unclosed code fences, half-written headings) without flickering. `caret` adds a blinking cursor at the end of streamed content — off here because the chat already has its own typing indicator.

Used by `src/features/storefront/components/storekeeper-drawer.tsx` for assistant message bodies.
