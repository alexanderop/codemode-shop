# Devtools

`@tanstack/react-ai-devtools` is a plugin for the unified `<TanStackDevtools>` panel — shows live chat messages, tool call inputs/outputs, state, and errors per `chat()` invocation.

## Wiring (this app — Vite)

```tsx
import { TanStackDevtools } from '@tanstack/react-devtools'
import { aiDevtoolsPlugin } from '@tanstack/react-ai-devtools'

<TanStackDevtools
  plugins={[aiDevtoolsPlugin(), /* ...others */]}
  eventBusConfig={{ connectToServerBus: true }}
/>
```

`<TanStackDevtools>` is already mounted in `src/app/routes/__root.tsx` with the router plugin — adding AI is a one-line plugin push + `eventBusConfig`. Install: `pnpm add -D @tanstack/react-ai-devtools`.

## How events get there

Server-side `devtoolsMiddleware` runs **automatically inside every `chat()` call** and emits tool-call events to a `ServerEventBus` (WebSocket/SSE on port 4206). The browser panel subscribes when `connectToServerBus: true`.

`@tanstack/devtools-vite` (already in `devDependencies`, registered in `vite.config.ts`) starts the bus during `vite dev` — nothing else to do.

## Non-Vite bundlers

For Next.js or other non-Vite setups the bus must be started manually at server boot — e.g. `instrumentation.ts` registering `new ServerEventBus().start()`, which sets `globalThis.__TANSTACK_EVENT_TARGET__`. Not relevant to this app, but the failure mode (panel renders, no events flow) is what to recognize if the wiring ever changes.
