# Adding a new UI primitive

The registry collapsed the old "five places" into **three**:

1. `src/features/storefront/types/ui-types.ts` — add `XxxProps` interface and extend `ComponentPropsByType`.
2. `src/features/storefront/api/ui-registry.ts` — add an entry to `storefrontUIPrimitives` (type + functionName + description + zod propsShape + prompt declaration). `ui-bindings.ts` and `ui-prompt.ts` iterate this array — no edits there.
3. `src/features/storefront/components/canvas/xxx.tsx` (the React component) + a case in `src/features/storefront/components/canvas/render-registry.tsx`.

That's it. The brain previously listed five files; `ui-store.ts` is now generic (handles any type) and `ui-bindings.ts` / `ui-prompt.ts` derive from the registry, so they don't need touching.
