# Tests

Three suites are wired — see [[architecture/test-infrastructure]] for the projects (`node`/`dom`/e2e), auto-guards, cassette server, and DOM browser-mode conventions. For agent-level tests that bypass the LLM, see [[architecture/integration-testing]]. The style rules below apply to all of them.

Style:

- **AAA structure** — Arrange / Act / Assert. Minimal actions, minimal asserts.
- **Test behavior, not implementation.** Refactors shouldn't break tests.
- **Black-box queries** — find elements by role/label/placeholder/text; reach for `data-testid` last (Testing Library priority order).
- **Isolated** — own storage/cookies/data per test; no order dependence.
- **Naming**: `it('should <expected> when <condition>')`.
- **Don't:** test the framework, mandate 100% coverage, test third-party libs/sites, snapshot-test (rare exceptions for design-system invariants).
- **Pure functions** are the easy target — pass args, observe return value, no mocks needed. Keeps the testing trophy bottom-heavy where it should be.
