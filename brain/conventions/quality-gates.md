# Quality gates

Five checks. All must be green before commit/push. CI mirrors them as parallel jobs.

| Gate      | Script           | What it covers                                     |
| --------- | ---------------- | -------------------------------------------------- |
| Lint      | `pnpm lint`      | `oxlint` (incl. `tools/oxlint-plugin-boundaries/`) |
| Format    | `pnpm format`    | `oxfmt`                                            |
| Typecheck | `pnpm typecheck` | `tsc --noEmit`                                     |
| Dead code | `pnpm knip`      | unused exports, files, deps                        |
| Tests     | `pnpm test`      | Vitest (`unit` + `component` projects)             |

`pnpm test:e2e` is a separate Playwright lane — see [[architecture/test-infrastructure]]. It is **not** part of `pnpm test` and is **not** a coverage source.

## Local enforcement

The pre-commit hook (`simple-git-hooks` → `lint-staged`) runs `oxlint --fix` + `oxfmt` on staged files plus a project-wide `pnpm typecheck`. The other gates aren't blocking at commit time but must pass before push — see [[conventions/stack]] for the hook setup.

## Configs

- `.oxlintrc.json` — lint config (incl. `jsPlugins: ['./tools/oxlint-plugin-boundaries/index.js']`)
- `.oxfmtrc.json` — format config (note: ignore field is `ignorePatterns`, not `ignore`)
- `tsconfig.json` — see [[conventions/typescript]]
- `knip.config.ts`
- `vitest.config.ts` — two projects (`unit`, `component`); coverage at top level

## Knip after refactors

Major moves and renames leave stale entries in the `knip` ignore list and stale unused-export warnings. Run `pnpm knip` after any large refactor and trim ignores aggressively — don't let dead-code drift accumulate.
