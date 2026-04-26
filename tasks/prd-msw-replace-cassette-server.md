# PRD: Replace Cassette HTTP Server with MSW

## Introduction

Our Playwright e2e suite mocks the storefront agent by running a standalone Node HTTP server (`test/cassettes/server.ts`) that replays canned SSE streams. Playwright rewrites requests via `page.route(...).continue({ url: cassetteUrl })` so the browser hits the cassette server instead of the dev server's `/api/storefront-agent`.

This works but carries ~80 LOC of bespoke server plumbing (port-0 allocation, `CASSETTE_SERVER_URL` env propagation, manual SSE encoding) that MSW 2.0's `msw/sse` namespace solves with a typed, well-known API. Replacing the server with MSW handlers in-process removes the cross-process boundary, eliminates the env dance, and unlocks per-test handler overrides for negative-path tests.

**Scope of v1:** infrastructure swap only. Cassette fixture content (`happy-search-recommend.ts`, `slow-streaming.ts`) stays unchanged. No new test scenarios. Tests pass before and after with no behavior change.

## Goals

- Delete `test/cassettes/server.ts` and the `CASSETTE_SERVER_URL` env plumbing
- Move cassette playback into MSW `sse()` handlers running in the Playwright worker process
- Preserve all existing Playwright e2e tests as-is — same assertions, same fixtures, same green/red signal
- Unlock per-test handler overrides via `server.use(...)` (don't add new tests using this in v1, but make it possible)
- Position the codebase to share MSW handlers with a future Vitest-browser integration tier (out of scope for this PRD)

## Non-Goals

- Adding new cassettes or test scenarios
- Adding MSW to Vitest projects (`node` / `dom`) — Playwright only for v1
- Service Worker setup in the dev server — we intercept via `page.route` + `getResponse`, not via a worker
- Changing how cassettes are authored or matched (`pickCassette` logic stays)
- Replacing Playwright's `page.route` for `api.anthropic.com` blocking — that stays as a safety net

## User Stories

### US-001: Cassettes serve via MSW handlers

**Description:** As a test author, I want cassette playback to run inside an MSW `sse()` handler so the test suite has one fewer process to manage.

**Acceptance Criteria:**

- [ ] `test/msw/handlers.ts` exports an `sse('/api/storefront-agent', ...)` handler that calls `pickCassette()` against the request body and streams `cassette.chunks` via `client.send()`
- [ ] Inter-chunk `delayMs` is honored (verified by `streaming.spec.ts` still passing)
- [ ] When no cassette matches, the handler returns a 404 with the same body shape as today (`{ error: 'no matching cassette', url, method }`)
- [ ] Handler is unit-testable in Node (`pnpm test` green)

### US-002: Playwright globalSetup boots MSW instead of an HTTP server

**Description:** As CI, I want globalSetup to start an MSW node server and tear it down on suite end — no port allocation, no env vars.

**Acceptance Criteria:**

- [ ] `test/playwright/global-setup.ts` calls `setupServer(...handlers).listen()` and returns a teardown that calls `.close()`
- [ ] `CASSETTE_SERVER_URL` env var is removed from the codebase (grep returns zero hits)
- [ ] `playwright.config.ts` `globalSetup` path is unchanged (still `./test/playwright/global-setup.ts`)
- [ ] Suite startup time is within ±500ms of current baseline

### US-003: page.route hands off to MSW

**Description:** As a Playwright test, I want `page.route('**/api/storefront-agent', ...)` to delegate to MSW's `getResponse(request)` so the browser sees a real `Response` produced by the handler — no second HTTP server in the loop.

**Acceptance Criteria:**

- [ ] `setupAgentInterception()` in `test/playwright/test-utils.ts` calls MSW's `getResponse(request)` and pipes the result to `route.fulfill({ response })`
- [ ] SSE chunks reach the browser with the same Content-Type (`text/event-stream`) and pacing as today
- [ ] The `api.anthropic.com` block-banner route handler is unchanged
- [ ] All four files in `test/playwright/*.spec.ts` pass without modification

### US-004: Old cassette server is deleted

**Description:** As a maintainer, I want the old cassette HTTP server removed so there's one source of truth for cassette playback.

**Acceptance Criteria:**

- [ ] `test/cassettes/server.ts` is deleted
- [ ] `test/cassettes/server.test.ts` is deleted (or rewritten to test the MSW handler)
- [ ] `test/cassettes/{happy-search-recommend,slow-streaming,index,types}.ts` are unchanged
- [ ] No other file imports from `test/cassettes/server`

## Verification

- `pnpm test:e2e` — all Playwright specs green
- `pnpm test` — full vitest suite green (cassette server unit test gone or migrated)
- `pnpm typecheck` — clean
- `pnpm lint` — clean
- Manual: run `pnpm test:e2e --headed` once and confirm chat flow streams as before

## Risks

- **`msw/sse` inter-chunk pacing.** If `client.send()` doesn't honor a synchronous `delayMs` between sends, we wrap with `await delay(ms)` between calls — same pattern as today's server. Verified by `streaming.spec.ts`.
- **`getResponse` in Node returning to Playwright.** Playwright's `route.fulfill({ response })` accepts a `Response`; MSW's `getResponse` returns one. Should be a clean pipe but worth confirming with a smoke test before refactoring all three specs.

## Out of Scope (Future PRDs)

- Vitest-browser integration tier sharing the same handlers
- MSW Service Worker setup for in-browser dev mocking
- Per-test cassette overrides (`server.use(...)`) for negative-path scenarios
- Recording new cassettes from real Anthropic runs
