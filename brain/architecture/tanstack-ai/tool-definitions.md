# toolDefinition() and ServerTool

```ts
const tool = toolDefinition({
  name: 'searchProducts',
  description: '...',
  inputSchema: z.object({ ... }),   // zod, ArkType, Valibot, or raw JSON Schema
  outputSchema: z.object({ ... }),
}).server(async (input) => { ... })  // becomes a ServerTool
```

- `.server(fn)` returns a `ServerTool` (has `execute`). Tools without `.server()` are `ToolDefinition`s — passing one to `chat({ tools })` makes the LLM aware of it but expects the **client** to execute (`useChat({ tools })`).
- Schemas are converted to JSON Schema before being sent to the model and before being passed to code mode (`convertSchemaToJsonSchema` from `@tanstack/ai`). This is why our custom UI bindings call that helper directly.
- Code mode requires every tool to have `execute` — it throws if you pass a bare definition.

In this app every catalog tool is server-side (`src/lib/tools/catalog-tools.ts`). We don't use the client-tool / approval flow.
