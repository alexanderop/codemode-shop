# chat() agent loop

`chat({ adapter, messages, tools, systemPrompts, agentLoopStrategy, ... })` returns an `AsyncIterable<StreamChunk>`. Internally a `TextEngine` runs the loop:

1. **init** — convert `UIMessage`s → `ModelMessage`s, build middleware pipeline (devtools first, strip-to-spec last), extract pending approvals/client tool results.
2. Per iteration:
   - `processText` — call `adapter.chatStream(...)`, yield each AG-UI chunk (see [[architecture/tanstack-ai/ag-ui-stream-chunks]]) through middleware. Track `finishReason` from `RUN_FINISHED`.
   - `executeToolCalls` — if `finishReason === 'tool_calls'`, run each pending tool. Append assistant message + tool result messages. Loop again.
3. Stop when `agentLoopStrategy(...)` returns false OR `finishReason !== 'tool_calls'` OR a tool needs client approval/execution (paused, not finished).

Default strategy: `maxIterations(5)`. Terminal hooks (`onFinish` / `onAbort` / `onError`) are mutually exclusive.

Source: `node_modules/@tanstack/ai/src/activities/chat/index.ts`.
