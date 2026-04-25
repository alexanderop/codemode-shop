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
