# CLAUDE.md

## Commands

Scripts live in `package.json`. Two non-obvious bits:

- `pnpm test` runs Vitest unit + component projects only. **`pnpm test:e2e`** is Playwright standalone and is **not** part of `pnpm test`.
- `pnpm test:component` is Vitest browser mode (Playwright Chromium); no dev server.

Requires `ANTHROPIC_API_KEY` in `.env`. `STOREFRONT_MODEL` overrides the model (default `claude-sonnet-4-6`).

## Verification

After any UI-affecting change, verify in a real browser via `agent-browser` on `http://localhost:3000` before reporting done. If verification isn't possible, say so explicitly — don't claim success based on type-checks or tests alone. `agent-browser --help` lists the commands.

# Brain

The `brain/` directory is an Obsidian vault — persistent memory across sessions. Architecture, conventions, and stack live there.

- **Read first.** Read brain files relevant to your task before acting. Start at [[brain/index]].
- **Write** after mistakes, corrections, or notable codebase learnings.
- **Structure:** One topic per file. Directories with `[[wikilink]]` indexes — no inlined content.
- **Maintain:** Delete outdated notes and stale artifacts.
