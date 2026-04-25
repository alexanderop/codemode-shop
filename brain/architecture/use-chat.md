# useChat (the main agent client)

`@tanstack/ai-react` hook. We use it in `src/components/storekeeper-drawer.tsx`. Key callbacks for our setup:

- `connection: fetchServerSentEvents('/api/storefront-agent')` — SSE transport.
- `body: { data: { zipCode } }` — merged into every POST. Server reads `body.data.zipCode`.
- `onCustomEvent(eventType, data, context?)` — fires for every `CUSTOM` chunk. `context.toolCallId` is available when relevant. We route:
  - `'storefront:ui'` → `uiStore.dispatch`
  - `'code_mode:*'` → `activityStore.record`
- `onFinish(message)` / `onError(err)` — close the activity turn (snapshot the canvas, surface a toast).
- Returned `messages` are `UIMessage`s (parts array). Tool calls show up as `parts[i].type === 'tool-call'` with `name === 'execute_typescript'` and `input.typescriptCode`. We extract them in the drawer to populate `ProgramCard`.

**Don't** use `useChat` for the handler endpoint — it would pull a whole second message history we don't want. The handler reads SSE manually in `run-handler.ts`.
