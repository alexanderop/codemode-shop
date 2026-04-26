# PRD: Component Test Uplift — Factories + A11y

## Introduction

Our canvas component DOM tests (`product-card.dom.test.tsx`, `cta-button.dom.test.tsx`, `comparison-table.dom.test.tsx`) already use Vitest browser mode with the Playwright provider, page objects (`*.page.tsx`), and `getByRole`-style queries. That's most of what the [Vue 3 Testing Pyramid article](https://example/vue-testing-pyramid) recommends for the component tier.

Two gaps remain:

1. **No factory pattern for test data.** Tests inline objects today. Adding a required field to `Product` or `UIEvent` means hand-fixing N test files.
2. **No accessibility assertions.** `axe-core` would catch missing labels, low contrast, and ARIA bugs in canvas components — components rendered by AI-generated programs, where a11y regressions are easy to miss.

This PRD brings the three existing `*.dom.test.tsx` files up to the article's standard. It does **not** introduce a `createTestApp` full-app render tier in vitest-browser — Playwright owns the full-flow integration tier and we explicitly keep that boundary.

## Goals

- Add a factory pattern for the test data shapes the canvas components consume (`Product`, `UIEvent` variants)
- Add an `axe-core` a11y assertion to each canvas component's DOM test suite
- Keep all three component DOM test files passing with no behavior loss
- Establish patterns (factories, a11y helper) that future component tests reuse

## Non-Goals

- No `createTestApp` / full-app mount in vitest-browser (Playwright covers that tier)
- No new visual regression tests beyond the existing `__screenshots__/` directory
- No changes to Playwright tests in `test/playwright/`
- No factories for entities not consumed by the three target components (no `Skill`, `Order`, `CartLine` factories yet)
- No per-route axe scans — component-level only

## User Stories

### US-001: Test data factories

**Description:** As a test author, I want `createProduct()`, `createProductCardEvent()`, `createCtaEvent()`, and `createComparisonTableEvent()` factories so I can override only the field that matters in a given test.

**Acceptance Criteria:**

- [ ] `test/factories/product.ts` exports `createProduct(overrides?: Partial<Product>): Product` with sensible defaults
- [ ] `test/factories/ui-event.ts` exports `createProductCardEvent`, `createCtaEvent`, `createComparisonTableEvent` — each accepts `Partial<...>` overrides
- [ ] Factories are typed against the real domain types (no `any`)
- [ ] Defaults render visibly in the DOM (no empty strings, no zero prices for products)
- [ ] Each factory has a unit test asserting defaults + override merge behavior

### US-002: A11y helper for component DOM tests

**Description:** As a test author, I want a single `assertNoViolations(container)` helper that runs `axe-core` against a rendered component and fails on any violation.

**Acceptance Criteria:**

- [ ] `test/a11y.ts` exports `assertNoViolations(container: Element): Promise<void>`
- [ ] Helper uses `axe-core` (browser bundle) and runs against the live DOM in vitest-browser
- [ ] Default ruleset is axe's `wcag2a` + `wcag2aa` (matches the article's defaults)
- [ ] On violation, the assertion error includes node selector + rule ID + help URL
- [ ] Helper has a smoke test against a deliberately-broken component

### US-003: ProductCard test uses factories + a11y

**Description:** As a test, I want `product-card.dom.test.tsx` to drive its scenarios with `createProduct()` and assert no a11y violations.

**Acceptance Criteria:**

- [ ] All inline product literals in `product-card.dom.test.tsx` are replaced with `createProduct({ ... })` calls
- [ ] One test asserts `await assertNoViolations(card.container)` for the default-rendered card
- [ ] Existing test names and assertions (rating, highlight badge, child slot) are preserved
- [ ] `pnpm test:dom` green

### US-004: CtaButton test uses factories + a11y

**Description:** As a test, I want `cta-button.dom.test.tsx` to use `createCtaEvent()` and assert no a11y violations.

**Acceptance Criteria:**

- [ ] All inline CTA event literals are replaced with `createCtaEvent({ ... })` calls
- [ ] One test asserts `assertNoViolations` against the rendered button
- [ ] Existing test coverage is preserved
- [ ] `pnpm test:dom` green

### US-005: ComparisonTable test uses factories + a11y

**Description:** As a test, I want `comparison-table.dom.test.tsx` to use `createComparisonTableEvent()` (and `createProduct()` for rows) and assert no a11y violations.

**Acceptance Criteria:**

- [ ] Inline comparison-table data is replaced with factory calls
- [ ] One test asserts `assertNoViolations` against the rendered table
- [ ] Existing test coverage is preserved
- [ ] `pnpm test:dom` green

## Verification

- `pnpm test:dom` — all DOM project tests green
- `pnpm test` — full suite green
- `pnpm typecheck` — clean
- `pnpm lint` — clean
- Manual: deliberately remove an `aria-label` from one canvas component, confirm the a11y test fails with a useful message, then revert

## Risks

- **`axe-core` perf in vitest-browser.** Each a11y scan adds ~50–200ms. Three tests × one scan each = negligible. If we expand to scanning every test, revisit budget.
- **Factory drift from real types.** If a factory's defaults diverge from production data shapes, tests pass while real renders fail. Mitigation: factories live in `test/factories/`, are typed strictly, and are reviewed alongside type changes.
- **`axe-core` false positives on AI-generated content.** Canvas components render whatever an LLM produced; we test the component shells, not LLM output. Scope a11y assertions to component-level only.

## Out of Scope (Future PRDs)

- A11y scans against full Playwright runs (chat drawer, route-level)
- Factories for `Skill`, `Order`, `CartLine`
- Visual regression expansion beyond canvas components
- A `createTestApp` integration tier in vitest-browser (we keep Playwright as the integration tier)
- Color-contrast and focus-order scans against the design system base components
