# Import aliases

Both `#/*` and `@/*` resolve to `./src/*` in `tsconfig.json`, but the codebase imports via `#/` (matches `package.json` `imports`). Prefer `#/` for consistency.
