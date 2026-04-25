# Types

- **Narrow > wide.** Explicitly annotate only when it narrows (`new Map<string, number>()`, `useState<UserRole>('admin')`). Otherwise let inference do the work.
- **Immutability by default.** `ReadonlyArray<T>` for collections passed around; return new arrays/objects from transformations. Mutate sparingly.
- **Required props win.** Most object properties should be required; reach for discriminated unions before piling on optionals.
- **Discriminated unions** for variants — gives exhaustiveness checks in `switch`, kills flag-variable soup.
- **`as const satisfies T`** for typed constants — narrows literals AND validates against the contract without widening.
- **Template literal types** instead of bare `string` for patterns (versions, API routes, CSS color tokens, i18n keys).
- **No `any`** — use `unknown` and narrow via type guard or last-resort `as`.
- **Avoid `as` and `!`** — both bypass the compiler. Acceptable only with a written rationale (third-party type mismatches etc.).
- **`@ts-expect-error <reason>`**, never `@ts-ignore`. The expect form fails when the underlying error is fixed.
- **`type` over `interface`** for almost everything; use `interface` only for declaration merging (e.g. extending `NodeJS.ProcessEnv`).
- **Generic array syntax**: `Array<string>` / `ReadonlyArray<string>`, not `string[]`.
- **`import type` for type-only imports** — keeps the bundler from pulling runtime code.
- **Generate, don't write, external types** (OpenAPI/GraphQL/DB schemas).
