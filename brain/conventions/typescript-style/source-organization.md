# Source organization

- **Named exports only.** No `export default` — keeps imports uniform and catches typos at the import site. (Exception: framework-required defaults, e.g. some bundler entry points.)
- **Collocate by feature.** Each route/page/feature owns its `components/`, `api/`, `utils/`. Move things to a shared `common/` (or `src/lib/` here) only once they're reused across features. Deep nesting is fine.
- **Imports:**
  - Relative (`./foo`, `../bar`) **only** for files inside the same feature — keeps the feature movable without churn.
  - Absolute (`#/lib/...` in this repo, see [[conventions/import-aliases]]) for everything else.
  - Auto-sorted (Prettier / ESLint plugin).
- **`import type`** separated from runtime imports — see [[conventions/typescript-style/types]].

This repo's layout already follows the spirit: `src/app/routes/` for file-based routes, `src/features/<feature>/` for feature code (e.g. `src/features/storefront/{api,components,stores,types,testing}` — see [[architecture/ui-primitive]] for a worked example), `src/lib/` for cross-feature primitives (`tools`, `catalog`, `cart`, `orders`, `session`), `src/components/` for shared UI.
