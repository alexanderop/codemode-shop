# Request flow

1. Client (`src/components/storekeeper-drawer.tsx`) uses `useChat` from `@tanstack/ai-react` against `/api/storefront-agent`.
2. Server route (`src/routes/api.storefront-agent.ts`) wires `createCodeMode({ driver: createNodeIsolateDriver(), tools: catalogTools, getSkillBindings: createStorefrontUIBindings })` + `anthropicText` adapter + SSE.
3. Inside the sandbox, `ui_*` bindings call `context.emitCustomEvent('storefront:ui', event)`. Those events flow to the browser as SSE `CUSTOM` chunks.
4. `uiStore.dispatch(event)` (a plain `useSyncExternalStore`-backed reducer in `src/lib/storefront/ui-store.ts`) applies each event to a node tree. `StorefrontCanvas` + `renderNode` walk the tree.
5. CTA clicks POST to `/api/storefront-handler`, which re-enters code mode with a narrower prompt + extra `cart_update` binding. Streamed events are read manually by `src/lib/storefront/run-handler.ts` (it re-parses SSE frames itself — it does NOT go through `useChat`).

See [[architecture/tanstack-ai/chat-engine]] for what the agent loop does between steps 2 and 3, and [[architecture/code-mode-execution-pipeline]] for what `execute_typescript` does internally.
