# Integration testing the agent (without the LLM)

The interesting failure modes of this app live below the LLM: TypeScript codegen, isolate execution, binding plumbing, UI reducer, cart/order side effects. So we test that surface with real artifacts and skip the LLM.

## The seam

`src/features/storefront/testing/run-program.ts` exports `runProgram(typescriptCode)`. It builds a real Node isolate (driver-cached across tests, 64 MB / 15 s), runs the supplied code through the same `buildStorefrontCodeMode` the production route uses, and captures every `storefront:ui` event, every tool call, and the program's return value.

```ts
const out = await runProgram(/* ts */ `
  const { productIds } = await external_searchProducts({ limit: 3 })
  // ...
  return { count: productIds.length }
`)
expect(out.success).toBe(true)
expect(out.uiEvents).toContainEqual(...)
```

## Fixtures

`evals/fixtures/programs/*.ts` — each fixture exports `program: string` (a TypeScript snippet). Existing fixtures cover the canonical happy and unhappy paths: `happy-search-recommend`, `comparison-table`, `out-of-stock-fallback`, `place-order`, `price-history`, `tool-error-recovery`. Used by `test/unit/features/storefront/api/integration.matrix.test.ts` and `integration.test.ts`.

## Why no LLM

The LLM isn't what breaks. The mechanism around it is: bindings emitting wrong shapes, isolate boundary conditions, store reducers, cart mutations under concurrency. Mocking the LLM to drive those would be slower, flakier, and test the mock instead of the system. Mocking the isolate to test the LLM would test the mock too.

When the LLM **is** what's under test (regression on a prompt change, model swap), use MSW cassette playback (`test/cassettes/`, `test/msw/handlers.ts`) — see [[architecture/test-infrastructure]].

## Determinism

`test/unit/features/storefront/api/integration.matrix.test.ts` includes a determinism assertion: same fixture run twice produces identical `uiEvents` and `toolCalls`. If you make any binding non-deterministic (random ids, `Date.now()` in event payloads), this guard catches it.
