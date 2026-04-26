# What execute_typescript actually does

When the LLM calls `execute_typescript({ typescriptCode })`, the tool (in `@tanstack/ai-code-mode/create-code-mode-tool.ts`) runs:

1. Emit `code_mode:execution_started`.
2. **Strip TypeScript** — `stripTypeScript()` runs the code through esbuild's TS transform (also catches syntax errors as `TypeScriptError`).
3. **Resolve dynamic bindings** — call `getSkillBindings()` (in our case: `createStorefrontUIBindings()` / + `createHandlerExtraBindings()` for the handler).
4. Merge static (`external_*`) and dynamic bindings, wrap each in `createEventAwareBindings` → emits `code_mode:external_call/result/error` around every call. See [[architecture/tanstack-ai/tool-bindings]] for how bindings are derived from `ToolDef`s.
5. **Create context** — `driver.createContext({ bindings, timeout, memoryLimit })`. Fresh sandbox per call.
6. **Execute** — wraps code in an async IIFE (`code-wrapper.ts`) so top-level `await` and `return` work. The return value is `JSON.stringify`'d before crossing the isolate boundary (objects can't transfer raw through `isolated-vm`).
7. Capture `console.log/warn/error/info` → re-emit each as `code_mode:console`.
8. Return `{ success, result|error, logs }` to the LLM. **Always** dispose the context (try/finally).

So the LLM gets a JSON-cloneable result and a log array; the client gets the play-by-play via custom events — see [[architecture/custom-events]].

The JSON-cloneable boundary at step 6 is a [[principles/boundary-discipline]] application: the isolate edge is the only place where shape conversion happens, so callers and bindings never need to think about transfer semantics.
