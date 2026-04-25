# Test infrastructure

Three suites, three commands:

- `pnpm test:unit` — Vitest `node` project. Includes `src/**/*.test.ts` + `test/**/*.test.ts`. Excludes `*.dom.test.*`.
- `pnpm test:dom` — Vitest `dom` project. Browser mode (`vitest-browser-react` + Playwright Chromium, headless). Includes `src/**/*.dom.test.{ts,tsx}`.
- `pnpm test:e2e` — Playwright.
- `pnpm test` — runs the full Vitest suite (both projects).

Config: `vitest.config.ts` defines both projects with the `#` alias. Both projects share `test/setup-global.ts`.

## Auto-guards (`test/setup-global.ts` + `test/guards.ts`)

The whole point: **convert silent failures into loud, default-on test failures.** No opt-in required.

- **Real Anthropic calls fail loudly.** A real network call to the Anthropic API mid-test trips a guard. Tests must use cassettes (see below) or the fixture-driven program runner ([[architecture/integration-testing]]).
- **`console.error` during a test fails the test.** Catches React warnings, store errors, anything that would otherwise scroll past in CI.
- **Module-scoped stores reset between tests.** `uiStore`, `activityStore`, `clientCart`, `assistantUi` all get reset in `beforeEach`. Without this, a singleton's state from an earlier test leaks into the next one.
- **Coverage meta-tests** (`src/features/storefront/api/coverage.test.ts`) assert every UI primitive and catalog tool has a corresponding test — adding a new tool without a test fails CI.

## Cassette server (`test/server.ts`, `test/cassettes/`)

Standalone HTTP server (`startCassetteServer`) replays typed `Cassette` recordings of streaming responses for deterministic SSE/chat tests. Cassettes are TypeScript modules (e.g. `test/happy-search-recommend.ts`, `test/slow-streaming.ts`) — typed shape, not opaque JSON.

## DOM tests (Vitest 4 browser mode + POMs)

- `await render(...)` is **async**.
- Locators **auto-retry**, so `waitFor` is gone. Use `await expect.element(locator).toBeVisible()` directly.
- No `fireEvent` — use the locator API.
- **Page Object Models live as `*.page.tsx`** colocated with the component. They expose factory functions for prop fixtures and locator/assertion helpers (e.g. `expectIdle`, `expectLoading`, `expectDone`).

See [[conventions/typescript-style/tests]] for AAA structure and naming.
