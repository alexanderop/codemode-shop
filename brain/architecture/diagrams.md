# Architecture diagrams

One visual map of the system. Diagrams render in Obsidian (Mermaid native). Keep them in sync with the prose notes — when [[architecture/request-flow]], [[architecture/code-mode]], or [[architecture/feature-boundaries]] change, update the relevant diagram below.

C4 Context + Container give the big picture. The detailed flows are plain `flowchart` blocks because Mermaid's C4 Dynamic still renders awkwardly.

## System context

Who uses the system and what it talks to.

```mermaid
C4Context
  title System Context — Storekeeper

  Person(shopper, "Shopper", "Browses, asks the storekeeper, places orders")
  System(app, "Storekeeper", "TanStack Start app — chat-driven storefront where the agent writes one TS program per turn")
  System_Ext(anthropic, "Anthropic API", "Claude Sonnet 4.6 (configurable via STOREFRONT_MODEL)")

  Rel(shopper, app, "Chats / clicks CTAs", "HTTPS + SSE")
  Rel(app, anthropic, "Generates one program per turn", "HTTPS")
```

Linked notes: [[architecture/code-mode]], [[architecture/request-flow]].

## Containers

The deployable / runtime pieces inside the app.

```mermaid
C4Container
  title Containers — Storekeeper

  Person(shopper, "Shopper", "Browser")
  System_Ext(anthropic, "Anthropic API", "Claude")

  Container_Boundary(app, "Storekeeper (TanStack Start)") {
    Container(spa, "SPA", "React + TanStack Router/Query", "Storefront UI + drawer canvas")
    Container(agentRoute, "/api/storefront-agent", "TanStack Start route", "Wraps useChat in withSession, builds per-request code-mode")
    Container(handlerRoute, "/api/storefront-handler", "TanStack Start route", "Deterministic CTA handler — no LLM")
    Container(cartRoute, "/api/cart", "TanStack Start route", "REST read/mutate of session cart")
    Container(checkoutRoute, "/api/checkout", "TanStack Start route", "Fake payment + place order")
    Container(driver, "Isolate Driver", "isolated-vm (V8 + JIT)", "Module-cached per (timeout, memoryLimit)")
    ContainerDb(cart, "Session cart", "In-memory Map<SessionId, …>", "Lost on restart — see cart-state")
  }

  Rel(shopper, spa, "Uses", "HTTPS")
  Rel(spa, agentRoute, "useChat — chat turns", "SSE")
  Rel(spa, handlerRoute, "CTA clicks", "SSE")
  Rel(spa, cartRoute, "Read/mutate cart", "JSON")
  Rel(spa, checkoutRoute, "Submit checkout", "JSON")

  Rel(agentRoute, anthropic, "Generates program", "HTTPS")
  Rel(agentRoute, driver, "Executes one TS program per turn", "isolated-vm")
  Rel(driver, cart, "Session-scoped tools mutate", "external_*")
  Rel(handlerRoute, cart, "addToCart", "direct call")
  Rel(cartRoute, cart, "Read/write")
  Rel(checkoutRoute, cart, "Drains on order")
```

Linked notes: [[architecture/module-cache-pattern]], [[architecture/cart-state]], [[architecture/checkout-flow]], [[architecture/client-server-module-boundary]].

## Chat AI request flow

The numbered steps from [[architecture/request-flow]] — one chat turn end-to-end.

```mermaid
flowchart TD
  click[1. Shopper sends message<br/>storekeeper-drawer.tsx → useChat]
  route[2. /api/storefront-agent<br/>withSession + getStorefrontDriver + buildStorefrontCodeMode]
  llm[Anthropic generates one TS program]
  exec[3. execute_typescript<br/>strip TS → bindings → driver.createContext → run]
  ext[external_* — catalog / cart / orders]
  ui[ui_* — emitCustomEvent 'storefront:ui']
  sse[SSE chunks: CUSTOM + TEXT]
  store[4. uiStore.dispatch — useSyncExternalStore<br/>StorefrontCanvas + renderNode walk tree]
  finish[onFinish: invalidateCart only if turnTouchedCart]

  click --> route --> llm --> exec
  exec -->|tool calls| ext
  exec -->|tool calls| ui
  ext -.->|code_mode:* events| sse
  ui --> sse
  sse --> store
  store --> finish
```

Linked notes: [[architecture/code-mode-execution-pipeline]], [[architecture/custom-events]], [[architecture/tanstack-ai/chat-engine]].

## CTA click flow (no LLM)

The deterministic handler path. No model in the loop — see [[architecture/request-flow]] for why.

```mermaid
flowchart TD
  cta[Shopper clicks CTA in drawer canvas]
  post[POST /api/storefront-handler<br/>handlerId: 'addToCart', payload, zipCode]
  verify[findStock + addToCart server-side]
  emit[Stream SSE frames]
  ui[storefront:ui — flip CTA to 'Added']
  cart[cart:update — full DetailedCart]
  text[TEXT_MESSAGE_CONTENT — toast]
  client[run-handler.ts parses SSE manually<br/>queryClient.setQueryData(cartQueryKey, …)]
  fallback[invalidateCart at stream end if no cart:update]

  cta --> post --> verify --> emit
  emit --> ui
  emit --> cart
  emit --> text
  ui --> client
  cart --> client
  text --> client
  client -.->|safety net| fallback
```

## Feature boundaries

Imports flow one direction. Enforced by `tools/oxlint-plugin-boundaries`.

```mermaid
flowchart LR
  app["src/app/<br/>(routes, root — composes features)"]
  features["src/features/X/<br/>(no cross-feature imports)"]
  shared["src/{components, lib, stores, queries, config}/<br/>(no imports from features/*)"]

  app --> features
  app --> shared
  features --> shared

  features -. forbidden .-> features
  shared -. forbidden .-> features
```

Linked notes: [[architecture/feature-boundaries]], [[principles/boundary-discipline]].
