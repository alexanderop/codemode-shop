# useChat (the main agent client)

`@tanstack/ai-react` hook. We use it in `src/features/storefront/components/storekeeper-drawer.tsx`. Key callbacks for our setup:

- `connection: fetchServerSentEvents('/api/storefront-agent')` — SSE transport.
- `body: { data: { zipCode } }` — merged into every POST. Server reads `body.data.zipCode`.
- `onCustomEvent(eventType, data, context?)` — fires for every `CUSTOM` chunk. `context.toolCallId` is available when relevant. We route:
  - `'storefront:ui'` → `uiStore.dispatch`
  - `'code_mode:*'` → `activityStore.record`
- `onFinish(message)` / `onError(err)` — surface a toast and re-snapshot the canvas. Note `onFinish` fires twice per code-mode turn — see [[architecture/onfinish-race]].
- Returned `messages` are `UIMessage`s (parts array). Tool calls show up as `parts[i].type === 'tool-call'` with `name === 'execute_typescript'`. We extract them in the drawer to populate `ProgramCard`.

**Don't** use `useChat` for the handler endpoint — it would pull a whole second message history we don't want. The handler reads SSE manually in `run-handler.ts`.

## Reading tool inputs from message parts

**Gotcha:** `tool-call` parts have `arguments` (raw JSON string) but **never** `input` (the typed parsed object) — the server-side `updateToolCallPart` in `@tanstack/ai` doesn't populate it. Reading `part.input?.typescriptCode` will always be `undefined`. The `input` field exists in the `ToolCallPart` type but is reserved for client-side use; the library never fills it from the stream.

**Pattern:** Use `parsePartialJSON` from `@tanstack/ai`:

```ts
import { parsePartialJSON } from '@tanstack/ai'

const parsed = parsePartialJSON(part.arguments) as { typescriptCode?: string } | null
const code = parsed?.typescriptCode
```

`parsePartialJSON` also handles incomplete JSON during streaming, so the Code tab can populate live while the model writes — not just after the run finishes.

Reference: `examples/ts-code-mode-web` in `~/Projects/opensource/ai`.
