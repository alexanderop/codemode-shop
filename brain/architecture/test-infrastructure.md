# Test infrastructure

Three lanes, three folders, three scripts. Co-located test files are not allowed — all tests live under `test/`.

| You're testing…                              | Folder            | Runner                                    | Script                |
| -------------------------------------------- | ----------------- | ----------------------------------------- | --------------------- |
| A pure function / util                       | `test/unit/`      | Vitest (Node)                             | `pnpm test:unit`      |
| One component's rendered behavior or a11y    | `test/component/` | Vitest browser mode (Playwright Chromium) | `pnpm test:component` |
| A user flow across pages, SSR/hydration, CSP | `test/e2e/`       | Playwright standalone                     | `pnpm test:e2e`       |

`pnpm test` runs both Vitest projects (`unit` + `component`). E2E is separate.

## Decision rule

Don't pick the slowest tier you can get away with. An E2E test that could've been a unit test is a flaky, slow unit test.

- Can the logic be extracted to a pure function? Do that, put the test in `test/unit/`.
- Asserting on rendered HTML, classes, or running axe? `test/component/`.
- Words like _navigate_, _click through_, _hydration_, _the page should…_? `test/e2e/`.

## How they actually run

- **`test:unit`** — Node V8, no DOM. Fastest. Run thousands.
- **`test:component`** — Headless Chromium via Vitest's Playwright provider. **No dev server.** Mounts components directly via `vitest-browser-react`'s `render()`. Real DOM, real CSS, real layout — but isolated from routing/SSR.
- **`test:e2e`** — Real Chromium against the running dev app on `:3000`. Boots `pnpm dev` via Playwright's `webServer` config. MSW serves cassettes via Playwright route interception (`setupAgentInterception()` in `test/e2e/test-utils.ts`).

The trick: `test:component` and `test:e2e` both spin up Chromium via Playwright — but `test:component` skips the dev server entirely and mounts your component into a blank page, while `test:e2e` navigates a fully running app.

## Folder layout

```
test/
├── unit/             # Vitest Node — mirrors src/ layout
│   ├── lib/
│   ├── stores/
│   ├── features/storefront/{api,stores}/
│   └── msw/
├── component/        # Vitest browser
│   └── canvas/       # *.test.tsx + *.page.tsx (page objects)
├── e2e/              # Playwright standalone
│   ├── *.spec.ts
│   ├── global-setup.ts
│   └── test-utils.ts
├── msw/handlers.ts   # shared MSW handlers (used by unit + e2e)
├── cassettes/        # typed Cassette fixtures
├── sse.ts            # shared SSE parser helper
├── guards.ts         # shared global-setup guards
└── setup-global.ts   # Vitest setupFiles (both projects)
```

Imports in tests should use the `#/` alias (mapped to `src/`) to stay decoupled from physical location. Page object `.page.tsx` files live next to their `.test.tsx` and import the source component via `#/`.

## Vitest config

`vitest.config.ts` defines two projects. Both share `test/setup-global.ts` and the `#` alias. Coverage is a single top-level block (`provider: 'v8'`), merged across both projects automatically. Run merged coverage with `pnpm test:coverage`. E2E is **not** a coverage source.

## Auto-guards (`test/setup-global.ts` + `test/guards.ts`)

The whole point: **convert silent failures into loud, default-on test failures.** No opt-in required.

- **Real Anthropic calls fail loudly.** A real network call to the Anthropic API mid-test trips a guard. Tests must use cassettes (see below) or the fixture-driven program runner ([[architecture/integration-testing]]).
- **`console.error` during a test fails the test.** Catches React warnings, store errors, anything that would otherwise scroll past in CI.
- **Module-scoped stores reset between tests.** `uiStore`, `activityStore`, `assistantUi` all get reset in `beforeEach` (see `test/setup-global.ts`). Without this, a singleton's state from an earlier test leaks into the next one. Cart state lives in TanStack Query — tests get a fresh `QueryClient` per render, so it does not need a global reset.
- **Coverage meta-tests** (`test/unit/features/storefront/api/coverage.test.ts`) assert every UI primitive and catalog tool has a corresponding test — adding a new tool without a test fails CI.

## Cassette playback via MSW (`test/msw/handlers.ts`, `test/cassettes/`)

Typed `Cassette` recordings (e.g. `test/cassettes/happy-search-recommend.ts`, `test/cassettes/slow-streaming.ts`) are replayed by an MSW `http.post('/api/storefront-agent', …)` handler that emits a `ReadableStream` of SSE chunks honoring each chunk's `delayMs`. Playwright's `setupAgentInterception()` calls `getResponse(handlers, request)` and pipes the result to `route.fulfill({ … })` — no second HTTP server, no `CASSETTE_SERVER_URL` env. The same handlers are reusable for Vitest-browser integration via `setupServer()`.

## Component tests (Vitest 4 browser mode + POMs)

- `await render(...)` is **async**.
- Locators **auto-retry**, so `waitFor` is gone. Use `await expect.element(locator).toBeVisible()` directly.
- No `fireEvent` — use the locator API.
- **Page Object Models live as `*.page.tsx`** in the same `test/component/` folder as the test file. They expose factory functions for prop fixtures and locator/assertion helpers (e.g. `expectIdle`, `expectLoading`, `expectDone`).

See [[conventions/typescript-style/tests]] for AAA structure and naming.
