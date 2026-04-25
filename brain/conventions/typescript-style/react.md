# React

Component conventions are the function conventions ([[conventions/typescript-style/functions]]) plus:

- **Required props by default.** Optionals only when truly cross-cutting (design-system buttons, etc.). If a component grows a long optional list, split it or move to a discriminated-union props type.
- **No `React.FC`.** Type the props arg directly: `({ name, score }: FooProps) => …`.
- **Props-to-state is a smell.** When unavoidable, prefix the prop with `initial*` (`initialProductName`) so the one-shot intent is explicit.
- **Component types:**
  - **Container** (`*Container` / `*Page`) — owns business logic + data fetching. Has its own `api/`, `components/`, `utils/` subfolders.
  - **Feature UI** — dumb, lives next to its container, no fetching.
  - **Design-system UI** — global, in `src/components/ui/` (shadcn).
- **Pass props, not whole objects.** Drill what's needed; don't shotgun the entire user blob.
- **Prefer URL state** for filters/sort/pagination. Don't sync URL state into local state.
- **Global state is a last resort.** Server-state lib (react-query / equivalent) before any global store; Zustand/Context only when truly app-wide.
- **Compound components** for things that belong together (menu, tabs, list). Export with the typed-cast pattern, not `Object.assign`.
- **Callback prop naming** — see [[conventions/typescript-style/naming]].
