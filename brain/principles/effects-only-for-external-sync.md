# Effects synchronize with external systems — nothing else

`useEffect` is an escape hatch out of React. Reach for it only to sync a component with something React doesn't manage: the DOM directly, a stream, an analytics beacon, a third-party widget, a browser API. **Anything you can derive from props or state belongs in render. Anything caused by a user action belongs in the event handler.**

**Why:** Effects run _after_ commit, so any Effect that updates state forces a second render — your component pays the cost twice and the user sees a stale frame in between. Worse, Effects fire whenever their deps change, so an Effect that "responds to a click" actually fires on _any_ trigger of that state — page reload, history navigation, parent re-render — and silently re-runs the side effect. The bug you'll write is "the toast fires twice on refresh," and it'll be in production before you notice.

**The trigger test:** when you reach for `useEffect`, ask _why this code needs to run_. If the answer is:

- "because props/state changed and I need to recompute X" → calculate it in render, optionally `useMemo` if it's expensive.
- "because a prop changed and I need to reset state" → pass a `key`, or set state during render guarded by a `prev` comparison. Don't reset in an Effect.
- "because the user clicked / submitted / typed" → put it in the event handler. The handler knows what happened; an Effect only knows what changed.
- "because two components need to update together" → update both in the same event handler so React batches them. Don't bounce through state + Effect.
- "because the component is on screen and needs to stay in sync with [external thing]" → ✅ Effect. Or `useSyncExternalStore` if the external thing is a subscribable store.

**Rule:**

- No Effect whose body is `setX(deriveFromProps(...))`. Move the derivation to render.
- No Effect whose body is `if (prop changed) setX(initial)`. Use `key` or in-render state adjustment.
- No Effect whose body fires on a user action's _consequence_ (a flag flipping, a modal opening). Move the call into the event handler that flipped the flag.
- No chains of Effects each adjusting state to trigger the next. Compute the whole next state in the event handler.
- Data fetching: prefer the project's TanStack Query layer (see [[conventions/stack]]) over a hand-rolled `fetch` in `useEffect`. Raw Effect-fetching is a last resort and must include a cleanup flag for race conditions.

**Examples in this repo (legitimate Effects):**

- `src/features/ai-ui/use-ai-action.ts:9` — registers a handler with the AI-UI store. External subscription, classic sync. ✅
- `src/features/storefront/components/canvas/cta-button.tsx:15` — aborts an in-flight request on unmount. Cleanup of an external resource. ✅
- `src/features/storefront/components/highlighted-code.tsx:49` — async-loads the Shiki highlighter. External library init. ✅
- `src/features/docs/components/mermaid.tsx:9` — async-renders Mermaid SVG via the Mermaid library. External system. ✅
- `src/features/storefront/components/storekeeper-drawer.tsx:306` — attaches/detaches a DOM scroll listener. External (DOM) sync. ✅
- `src/components/product-card.tsx:22` — clears a timer on unmount. Cleanup. ✅

**Patterns the codebase has already corrected (study these):**

- `system-prompt-sheet.tsx` used to hand-roll `fetch` + a `cancelled` flag in `useEffect`. It now wraps the request in a local `systemPromptQueryOptions(zipCode, enabled)` and calls `useQuery(...)` — race conditions, caching, and the "did the user close the sheet mid-fetch" branch all handled by TanStack Query. Default-expansion of section 0 is derived in render via a `useMemo` + `expanded[key] ?? defaultExpanded[key]` lookup, no `setExpanded` after fetch.
- `program-card.tsx` `CopyCodeButton` used to flip `copied` and let an Effect schedule the reset. The reset timer is now created inline in `handleCopy` and tracked via a ref so the unmount cleanup is one line. The sister copy button in `system-prompt-sheet.tsx` already followed this pattern — one source of truth for "feedback flag" timing.
- `ai-ui/ai-action-confirm.tsx` no longer exists. The toast that was previously rendered from `useEffect(() => { ... }, [pending])` now lives directly in `aiUiStore.propose()` alongside the `setState`. Tracking the toast id in a module-level variable lets `commit()`/`dismiss()`/the next `propose()` close the prior toast deterministically — no more "pending changed" branch, no more cleanup-on-unmount race.

**Boundaries:**

- This principle is about **local component logic**, not "never use `useEffect`." Streams, sockets, browser APIs, third-party widgets — all legitimate. The trigger is "I'm using an Effect to react to my own component's state."
- Tactically pairs with [[principles/subscribe-dont-snapshot]]: that one says "subscribe to live state instead of taking it as props"; this one says "and once you've subscribed, don't bounce that subscription through another Effect to derive more state."
- Source: the React team's "[You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)" guide. The patterns above are the ones that actually show up in this codebase.
