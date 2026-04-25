# `onFinish` fires before code-mode events

In code-mode, `useChat`'s `onFinish` fires **before** the sandbox's `code_mode:*` and `storefront:ui` events arrive. SSE order:

1. `RUN_STARTED` (model)
2. `TOOL_CALL_END` (model wrote the program)
3. `RUN_FINISHED finishReason=tool_calls` ← processor calls `finalizeStream` → `onStreamEnd` → **first `onFinish`**
4. `CUSTOM code_mode:execution_started` … `code_mode:external_call/result` … `storefront:ui` … (sandbox runs HERE)
5. `RUN_STARTED` (model again, for the prose reply)
6. `TEXT_MESSAGE_*`
7. `RUN_FINISHED finishReason=stop` → **second `onFinish`**

So `onFinish` fires twice per code-mode turn. See also [[architecture/use-chat]] for the consumer side, and [[principles/serialize-shared-state-mutations]] for why "tell actors to take turns" doesn't fix this.

## Rules

- **Never null out `currentTurnId` on turn end.** Let the next `startTurn` overwrite it. Late events for the previous turn keep landing on the right turn.
- **Re-snapshotting in `onFinish` is fine** because the second call (after `finishReason=stop`) sees the full UI state.
- **Prefer driving state from `onCustomEvent`** over `onFinish`/`onStreamEnd`. The canonical TanStack code-mode examples (e.g. `examples/ts-code-mode-web/_banking-demo`) update state inline as events arrive and never snapshot at all. The "freeze the canvas per turn" pattern in this repo is the reason we have a race at all.

Regression tests: `src/features/storefront/stores/activity-store.test.ts` ("endTurn keeps currentTurnId so late code-mode events still record", "startTurn overwrites a lingering currentTurnId from a finished turn").
