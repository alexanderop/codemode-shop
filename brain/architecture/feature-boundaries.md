# Feature boundaries

Imports flow in one direction. The rule is enforced structurally by a custom oxlint plugin (`tools/oxlint-plugin-boundaries/index.js`), wired in via `.oxlintrc.json`'s `jsPlugins`.

## The rule

```
src/app/  →  src/features/<X>/  →  src/{components,lib,stores,queries,config}/
```

- A feature (`src/features/<X>/`) MUST NOT import from another feature (`src/features/<Y>/`).
- A shared module (`src/components/`, `src/lib/`, `src/stores/`, `src/queries/`, `src/config/`) MUST NOT import from `src/features/*` — only `src/app/` may.
- `src/app/` (routes, root) is the only place allowed to compose multiple features.

## How the plugin sees it

`locate(filename)` classifies the importer as `feature` or `shared`; `resolveSpecifier(specifier)` does the same for the import target via the `#/` alias. The two illegal shapes throw at lint time:

- `feature → other feature` → `feature "X" must not import from feature "Y"`
- `shared (non-app) → feature` → `shared module "<name>" must not import from features/* (only app/ may)`

## Three legal seams when you need to share

1. **Lift to `src/lib/`** for cross-feature primitives. Example: `src/lib/code-mode-binding.ts` was created so both `storefront` and `ai-ui` could share the binding factory without one importing from the other.
2. **Lift to `src/queries/`** for client-side TanStack Query state shared by multiple features. Example: `src/queries/cart.ts`.
3. **Compose in `src/app/`** when the wiring is feature-specific glue. The drawer exposes a generic `onCustomEvent` prop; `__root.tsx` (which can import both features) routes events between them. `extraBindings` in `buildStorefrontCodeMode({ extraBindings })` is the official extension point — `api.storefront-agent.ts` passes `createAiUiBindings()` so `ai-ui` plumbs into the sandbox without `storefront` ever importing from `ai-ui`.

## Client/server hazard intersects this rule

Lifting to `src/lib/` is the right move structurally, but watch out for the AsyncLocalStorage trap: anything that touches `sessionContext` poisons client bundles (see [[architecture/client-server-module-boundary]]). Pure helpers (`src/lib/cart-key.ts`) live in their own file precisely so client code can import them without dragging server-only modules along.

## When you hit a `boundaries(no-cross-feature-imports)` error

Don't suppress. The fix is one of the three seams above. If a "shared" component grew a feature dependency, it isn't shared — move it back into the feature, or pull what it needs out of the feature into `lib/`. See [[principles/boundary-discipline]] for the principle this enforces.
