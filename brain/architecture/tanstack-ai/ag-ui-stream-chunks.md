# AG-UI stream chunks

The wire format `chat()` yields and `toServerSentEventsStream` serializes. We consume these in `run-handler.ts` and (indirectly) in `useChat`.

| Type                                             | Used for                                                                                                                                 |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `TEXT_MESSAGE_CONTENT`                           | Streamed assistant text (`delta` field).                                                                                                 |
| `TOOL_CALL_START` / `_ARGS` / `_END` / `_RESULT` | Tool call lifecycle. `execute_typescript` arrives this way.                                                                              |
| `RUN_FINISHED`                                   | Carries `finishReason` (`stop`, `tool_calls`, `length`) + optional `usage`.                                                              |
| `RUN_ERROR`                                      | Stream-side errors. **Don't expect a thrown exception** — check for this chunk.                                                          |
| `CUSTOM`                                         | `{ name, value }` — how `emitCustomEvent` from a binding reaches the client. We use names `storefront:ui`, `cart:update`, `code_mode:*`. |
| `REASONING_*`                                    | Extended-thinking models (Claude/Gemini). Currently unused in this app.                                                                  |

`useChat` parses these for us; manual consumers (`run-handler.ts`) split SSE frames on `\n\n`, take the `data:` line, and `JSON.parse` it.
