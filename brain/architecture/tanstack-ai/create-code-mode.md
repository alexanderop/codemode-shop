# createCodeMode()

Returns `{ tool, systemPrompt }`:

- `tool` — the `execute_typescript` `ServerTool`. Add it to `chat({ tools: [tool] })`.
- `systemPrompt` — a string documenting `execute_typescript` + every `external_*` function (with TypeScript signatures generated from each tool's input/output JSON Schema). Add it to `systemPrompts`.

Both come from the **same** `CodeModeToolConfig`, which is why you should always use `createCodeMode` over calling `createCodeModeTool` and `createCodeModeSystemPrompt` separately — keeps prompt and runtime in sync.

Config shape:

```ts
createCodeMode({
  driver,                                    // IsolateDriver — see [[architecture/tanstack-ai/isolate-driver]]
  tools,                                     // become external_<name>
  timeout?: number,                          // ms, default 30_000
  memoryLimit?: number,                      // MB, default 128
  getSkillBindings?: () => Promise<Record<string, ToolBinding>>,
})
```

`getSkillBindings` is called on **every** `execute_typescript` invocation — it's how we plumb dynamic, request-scoped bindings (the `ui_*` family, plus `cart_update` in the handler) into the sandbox without rebuilding the whole code-mode tool.

See [[architecture/tanstack-ai/tool-bindings]] for the binding interface, and [[architecture/code-mode-execution-pipeline]] for what runs when `execute_typescript` fires.
