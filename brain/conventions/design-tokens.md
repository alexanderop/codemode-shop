# Design tokens

Semantic tokens live in `src/styles.css` under `@theme inline`. Components reference token names — never raw values. Future redesigns become "edit `styles.css`, done."

## Token families

Declared in `@theme inline`:

1. **Surface elevation** — `--color-surface-1`, `--color-surface-2`, `--color-surface-3`
2. **Text tiers** — `--color-fg-subtle` (plus shadcn `foreground` / `muted-foreground`)
3. **Hairlines** — `--color-line`, `--color-line-strong`
4. **Brand accent** — `--color-brand`, `--color-brand-deep`, `--color-brand-fg`, `--color-brand-glow`, `--color-brand-soft`, `--color-brand-line` (Linear purple family)
5. **Semantic accents** — `--color-star`
6. **Type scale** — `--text-micro`, `--text-mini`, `--text-tag`, `--text-lede`, `--text-section`
7. **Shadows** — `--shadow-brand-glow`

## Rules

- **No `[var(--...)]` arbitraries** in component classNames. If a token is missing, add it to `styles.css`; don't reach into the variable directly.
- **No hex literals** in component code.
- **No `text-[Npx]`** — use the type-scale tokens.
- **Default Tailwind / shadcn sizes are fine.** Don't replace generic spacing/radius tokens unless there's a design reason; shadcn primitives in `src/components/ui/` rely on them.

## Dark-mode caveat

The app is **dark-only**, with no `.dark` class on `<html>`. shadcn variants that rely on `dark:` prefixes silently fall through to invisible states (e.g. `outline` button → `bg-background` on `bg-background`). Don't use `dark:`-prefixed shadcn variants — reference the tokens directly.

## Unlayered globals beat utilities

A bare `a { color: var(--color-foreground); }` rule outside `@layer` wins over Tailwind utilities (which live in `@layer utilities`). The symptom is white-on-white silently rendering. Wrap globals in `@layer base` or scope them via `:not([class*="text-"])`.
