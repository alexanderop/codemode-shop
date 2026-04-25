# Stack

TanStack Start (file-based routing via `src/routes/`, Nitro server) · `@tanstack/ai` + `@tanstack/ai-react` · `@tanstack/ai-code-mode` + `@tanstack/ai-isolate-node` (isolated-vm; native build) · `@tanstack/ai-anthropic` · shadcn/ui (new-york, zinc) · Tailwind CSS v4 via `@tailwindcss/vite` · React 19 · zod v4.

shadcn add: `pnpm dlx shadcn@latest add <component>` (alias `#/components/ui`).

`isolated-vm` requires native compilation — the `pnpm.onlyBuiltDependencies` allowlist in `package.json` opts it in. If a fresh install fails, that's the first place to look.
