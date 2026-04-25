# Variables

- **`as const` for constants.** Narrows literals, freezes objects/arrays. Combine with `satisfies T` when a target type exists.
- **No `enum`.** Use:
  - **Literal type unions** for closed sets — `type UserRole = 'guest' | 'moderator' | 'administrator'`.
  - **`as const` arrays** when iterating values — `const ROLES = [...] as const; type Role = typeof ROLES[number]`.
  - **`as const` objects** for keyed lookups (e.g. design tokens) — `type ColorKey = keyof typeof COLORS`.
- **Type unions over boolean flags.** `type Status = 'pending' | 'processing' | 'confirmed' | 'expired'` beats four `is*` flags.
- **`null` vs `undefined`** — `null` to explicitly mean "no value" (assignments, return types); `undefined` for absent fields (form fields, optional payload, missing DB columns).
