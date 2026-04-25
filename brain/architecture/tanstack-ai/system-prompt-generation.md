# System prompt generation

`createCodeModeSystemPrompt(config)` builds the prompt that documents `execute_typescript`. It:

1. Calls `toolsToBindings(tools, 'external_')` to get bindings (only the static catalog tools — **not** `getSkillBindings`).
2. Passes those through `generateTypeStubs` to produce TypeScript `declare function external_x(input: ...): Promise<...>` lines, generated from the JSON Schema of each input/output schema.
3. Wraps everything in a fixed template with examples and rules.

Implication: dynamic bindings (`ui_*`, `cart_update`) are **not** documented automatically — that's why we hand-write `createStorefrontUIPrompt()` (`src/lib/storefront/ui-prompt.ts`) with `declare function ui_*(...)` stubs the model can read. Skip it and the model has no idea those functions exist.

If a `ui_*` binding's shape changes, the prompt stub must change too. See [[architecture/ui-primitive]] for the full add-a-primitive checklist.
