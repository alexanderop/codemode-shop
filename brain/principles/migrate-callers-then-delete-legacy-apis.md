# Migrate Callers Then Delete Legacy APIs

When we decide a new API is the right design, migrate callers and remove the old API in the same refactor wave instead of preserving compatibility layers.

**Rule:**

- Do not keep legacy API paths alive just because internal callers still exist
- Inventory callers, migrate them, and delete the old API immediately
- Treat temporary adapters as exceptional and time-boxed, not default architecture
- Update tests to assert the new contract, and delete tests that only protect pre-refactor implementation details

**When This Applies:**

- No external users depend on backward compatibility
- The project can absorb coordinated breaking changes
- The new API is part of a simplification/refactor initiative

Keeping both old and new APIs creates dual-path complexity, slows cleanup, and makes the codebase feel append-only.

This is the concrete sequencing rule for refactor waves under [[principles/outcome-oriented-execution]] — that principle accepts intermediate breakage; this one says don't paper over it with a transitional adapter.
