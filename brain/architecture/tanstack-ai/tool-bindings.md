# ToolBinding interface

What `getSkillBindings` returns and what `tools` get converted into. The shape (`@tanstack/ai-code-mode/types`):

```ts
interface ToolBinding {
  name: string // becomes the function name in the sandbox
  description: string
  inputSchema: Record<string, unknown> // JSON Schema (already converted)
  outputSchema?: Record<string, unknown>
  execute: (args: unknown, context?: ToolExecutionContext) => Promise<unknown>
}
```

`ToolExecutionContext` carries `emitCustomEvent(name, data)` — the **only** way a binding can push something to the client mid-execution. That's the whole mechanism behind `storefront:ui` and `cart:update` (see [[architecture/custom-events]]).

Code mode wraps every binding in `createEventAwareBindings`, which:

1. Emits `code_mode:external_call` before calling.
2. Emits `code_mode:external_result` (with duration) on success or `code_mode:external_error` on throw.
3. Always passes through to the underlying `execute(args, { emitCustomEvent })`.

So a binding gets two emit channels for free (the `code_mode:*` lifecycle events) without touching `emitCustomEvent` itself.

`toolsToBindings(tools, prefix)` converts `ServerTool`s into bindings; we use that under the hood and also call `convertSchemaToJsonSchema` directly for our hand-rolled `ui_*` bindings.
