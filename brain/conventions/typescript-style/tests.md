# Tests

Vitest is wired (`pnpm test`); no tests in the repo yet. When we add them:

- **AAA structure** — Arrange / Act / Assert. Minimal actions, minimal asserts.
- **Test behavior, not implementation.** Refactors shouldn't break tests.
- **Black-box queries** — find elements by role/label/placeholder/text; reach for `data-testid` last (Testing Library priority order).
- **Isolated** — own storage/cookies/data per test; no order dependence.
- **Naming**: `it('should <expected> when <condition>')`.
- **Don't:** test the framework, mandate 100% coverage, test third-party libs/sites, snapshot-test (rare exceptions for design-system invariants).
- **Pure functions** are the easy target — pass args, observe return value, no mocks needed. Keeps the testing trophy bottom-heavy where it should be.
