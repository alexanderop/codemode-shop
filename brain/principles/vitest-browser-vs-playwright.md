# Vitest Browser Mode vs Playwright

Pick the testing tool that matches the **unit under test**, not the one with the familiar API. Component tests belong in Vitest Browser Mode. End-to-end tests belong in Playwright (`@playwright/test`).

**Why:** Vitest Browser Mode and Playwright look superficially similar — both drive real browsers, both expose a `page` API — but they were designed to solve different problems and work very differently under the hood. Mixing them up produces brittle, slow, or low-fidelity tests.

## Core distinction

- **Vitest Browser Mode** — a _component test_ is an extended **integration test**. The actionable unit is a rendered component.
- **Playwright** — a _component test_ is a limited **end-to-end test**. The actionable unit is a `page`.

A component test is, by design, an integration test. That's why Vitest's framing fits the job.

## How they actually differ

**Test environment:**

- Vitest Browser Mode: your `*.test.tsx` runs _in the browser_. Import CSS, touch `window`/`document`, render JSX the same way your app does. Node-only utilities (file system, `node:*` modules, HTTP servers) must be exposed via the Commands API, since the test process is the browser.
- Playwright Component Tests: your `*.test.tsx` runs _in Node.js_. JSX is serialized and shipped over a message channel to the browser, where the component tree is reconstructed.

**Component rendering:**

- Vitest is framework-agnostic. You call `render(<Component />)` from `react-dom` (or your framework's equivalent) — exactly how your app renders. Writing your own `render()` for any framework is trivial.
- Playwright cannot use `react-dom`'s `render()` directly because the test and the page live in two processes. It bridges the gap with serialization, which changes how rendering works compared to production.

**Browser automation:**

- Vitest Browser Mode does not ship its own automation — it abstracts a _provider_ (Playwright or WebdriverIO) behind a stable `page` API. Swap providers without changing tests. The exposed `page` API is intentionally a subset of Playwright's.
- Playwright ships its own first-class browser automation (`playwright` library), and `@playwright/test` is the framework on top.

## How to apply

When choosing or writing tests in this repo:

1. **Unit / pure logic in Node** → Vitest (default project).
2. **Component behavior in a real browser** → Vitest Browser Mode (with Playwright as the provider). This replaces JSDOM/HappyDOM — no more polyfilling `matchMedia`, `location`, `navigator`.
3. **Full app flows across pages, navigation, network** → `@playwright/test`.
4. **General-purpose browser automation** (scraping, agent flows, scripts) → the `playwright` library directly.

Reach for Vitest Browser Mode whenever you'd previously have written a JSDOM test — the environmental fidelity is free, and the test stays a component-level integration test rather than being forced into the shape of an e2e test.
