# CLAUDE.md

## Commands

- `pnpm dev` — dev server on `http://localhost:3000`
- `pnpm build` / `pnpm preview` — production build / preview
- `pnpm test` — `vitest` (test runner wired, no tests yet)

Requires `ANTHROPIC_API_KEY` in `.env`. `STOREFRONT_MODEL` overrides the model (default `claude-haiku-4-5`).

# Brain

The `brain/` directory is an Obsidian vault — persistent memory across sessions. Architecture, conventions, and stack live there.

- **Read first.** Read brain files relevant to your task before acting. Start at [[brain/index]].
- **Write** after mistakes, corrections, or notable codebase learnings.
- **Structure:** One topic per file. Directories with `[[wikilink]]` indexes — no inlined content.
- **Maintain:** Delete outdated notes and stale artifacts.
