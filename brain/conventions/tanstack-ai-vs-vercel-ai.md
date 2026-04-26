# TanStack AI ≠ Vercel AI SDK

Easy to confuse. `@tanstack/ai` looks superficially similar to `ai` / `@ai-sdk/*` but the API is different. Don't reach for Vercel patterns.

| Wrong (Vercel)                                  | Right (TanStack)                                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `streamText({ model, messages })`               | `chat({ adapter, messages })`                                                                           |
| `import { openai } from '@ai-sdk/openai'`       | `import { anthropicText } from '@tanstack/ai-anthropic'`                                                |
| `createOpenAI({ apiKey })`                      | `anthropicText('claude-haiku-4-5')` (model passed to factory)                                           |
| `streamText({ model, onFinish: ... })`          | `chat({ middleware: [{ onFinish: ... }] })`                                                             |
| `chat({ adapter, model: '...', messages })`     | `chat({ adapter: anthropicText('...'), messages })` (model lives on adapter, not chat options)          |
| Custom `ReadableStream` for SSE                 | `toServerSentEventsStream(stream, abortController)` (or `toServerSentEventsResponse` for full Response) |
| `import { useChat } from '@tanstack/ai-client'` | `import { useChat } from '@tanstack/ai-react'`                                                          |

`chat()` has **no `onFinish`/`onEnd` option** — middleware is the only way to hook the lifecycle.

`temperature`, `topP`, `maxTokens`, `metadata` are **top-level** on `chat({ ... })` — not nested in `options`. Provider-specific knobs go in `modelOptions`.

## Model id must be a literal type

`anthropicText(...)` expects `AnthropicChatModel` (a string-literal union), not bare `string`. A centralized `export const storefrontModel = process.env.X ?? 'claude-haiku-4-5'` will fail typecheck at the `anthropicText(storefrontModel)` call site. Cast at the source: `as AnthropicChatModel` (see `src/config/model.ts`). Don't sprinkle the cast at every call site.

## Consult the upstream source before designing

Before designing or debugging any TanStack AI feature, read the canonical reference at `~/Projects/opensource/ai`:

- `examples/ts-code-mode-web/` — the worked example for code-mode in a browser app. Per-route demos (e.g. `_database-demo`, `_banking-demo`) are the patterns to mimic.
- The library packages themselves (`@tanstack/ai`, `@tanstack/ai-code-mode`, `@tanstack/ai-anthropic`, `@tanstack/ai-react`) — read the actual source for `chat()`, `createCodeMode`, middleware, bindings.

Search/training-data answers drift; the upstream is canonical. This applies recursively when delegating: instruct subagents to read the same source rather than recall the API. See [[principles/quote-code-from-disk]].
