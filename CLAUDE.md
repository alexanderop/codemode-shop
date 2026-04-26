# CLAUDE.md

## Commands

- `pnpm dev` — dev server on `http://localhost:3000`
- `pnpm build` / `pnpm preview` — production build / preview
- `pnpm test` — full vitest run; `pnpm test:unit` (Node), `pnpm test:component` (Vitest browser via Playwright), `pnpm test:e2e` (Playwright standalone). `pnpm test:coverage` for merged coverage.
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` / `pnpm lint:fix` — oxlint
- `pnpm format` / `pnpm format:check` — oxfmt
- `pnpm knip` — unused-export / dead-file scan

Requires `ANTHROPIC_API_KEY` in `.env`. `STOREFRONT_MODEL` overrides the model (default `claude-haiku-4-5`).

## Verification

After completing any UI-affecting change, **verify in a real browser** using the `agent-browser` CLI before reporting the task done. Open the relevant page on `http://localhost:3000`, exercise the changed flow (`open`, `click`, `type`, `scroll`, etc.), and capture a `screenshot` or `snapshot` to confirm the fix. If verification isn't possible, say so explicitly — don't claim success based on type-checks or tests alone. Run `agent-browser --help` for the full command list.

# Brain

The `brain/` directory is an Obsidian vault — persistent memory across sessions. Architecture, conventions, and stack live there.

- **Read first.** Read brain files relevant to your task before acting. Start at [[brain/index]].
- **Write** after mistakes, corrections, or notable codebase learnings.
- **Structure:** One topic per file. Directories with `[[wikilink]]` indexes — no inlined content.
- **Maintain:** Delete outdated notes and stale artifacts.
