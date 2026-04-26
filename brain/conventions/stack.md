# Stack

TanStack Start (file-based routing via `src/app/routes/`, with `src/app/router.tsx` and the auto-generated `src/app/routeTree.gen.ts`; Nitro server) · `@tanstack/ai` + `@tanstack/ai-react` · `@tanstack/ai-code-mode` + `@tanstack/ai-isolate-node` (isolated-vm; native build) · `@tanstack/ai-anthropic` · `@tanstack/react-query` · `@tanstack/react-hotkeys` · `@tanstack/store` · shadcn/ui (new-york, zinc) · Tailwind CSS v4 via `@tailwindcss/vite` · React 19 · zod v4.

shadcn add: `pnpm dlx shadcn@latest add <component>` (alias `#/components/ui`).

`isolated-vm` requires native compilation — the `pnpm.onlyBuiltDependencies` allowlist in `package.json` opts it in. If a fresh install fails, that's the first place to look.

## TanStack-first

When the need is covered by an `@tanstack/*` package, reach for it before generic alternatives or hand-rolled hooks. This is the de-facto stack rule:

- **State store** — `useSyncExternalStore` + `@tanstack/store` (with `useSelector`). Don't add Zustand; the existing pattern in `src/stores/` is the template.
- **Hotkeys** — `@tanstack/react-hotkeys`. Don't write a custom `useHotkey`. The library defaults match what we want (`ignoreInputs: true` for single-letter and Shift combos; `false` for `Escape` and `Mod+_`); binding `?` requires the `RawHotkey` object form (TS rejects the string form on purpose).
- **Server state** — `@tanstack/react-query`.
- **AI** — `@tanstack/ai*` (see [[conventions/tanstack-ai-vs-vercel-ai]]).

## Git hooks: `simple-git-hooks` + `lint-staged`

No Husky. `package.json` wires `simple-git-hooks` (`prepare: simple-git-hooks`) with one `pre-commit`: `pnpm exec lint-staged && pnpm typecheck`. `lint-staged` runs `oxlint --fix` and `oxfmt` on staged files; the typecheck is project-wide (catches type errors that staged-only linting would miss).

Bypass when actually justified: `git commit --no-verify` or `SKIP_SIMPLE_GIT_HOOKS=1 git commit ...`. Don't reach for these to silence a real failure — fix the underlying issue.
