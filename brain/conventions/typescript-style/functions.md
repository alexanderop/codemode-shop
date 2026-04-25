# Functions

- **One responsibility, stateless, pure** wherever feasible. Same input → same output, no global side effects.
- **Single object arg** for anything beyond one primitive — readable call sites, easy to extend without breaking callers. Exceptions: tiny helpers like `isNumber(value)` and curried functions.
- **Mostly required args.** Optionals are a smell; ten focused functions beats one with fifty optional knobs.
- **Args as discriminated unions** when an arg's shape depends on a mode (`status: 'success' | 'loading' | 'error'`).
- **Explicit return types on the outside, inferred on the inside.** Public APIs and exported library code: annotate. Internal helpers: let TS infer.
