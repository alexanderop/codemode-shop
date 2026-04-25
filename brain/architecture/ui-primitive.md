# Adding a new UI primitive

Must be done in all five places or it breaks:

1. `src/lib/storefront/ui-types.ts` — add `XxxProps` interface and extend `ComponentPropsByType`.
2. `src/lib/storefront/ui-bindings.ts` — add a `component('xxx', …)` entry to `createStorefrontUIBindings()` and a case to the `switch` inside `component()`.
3. `src/lib/storefront/ui-store.ts` — add cases to `createNode` and `updateNodeProps`.
4. `src/lib/storefront/ui-prompt.ts` — add the `declare function ui_xxx(...)` stub so the LLM codes against it.
5. `src/components/canvas/xxx.tsx` + case in `src/components/canvas/render-node.tsx`.
