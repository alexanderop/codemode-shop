# Testing the AI Functionality

**Status**: research / decision doc. Not yet implemented.
**Scope**: how to test the LLM-driven "code mode" loop in this app — not generic
LLM testing advice.

This document surveys current best practice for testing agentic AI systems
(early 2026), maps it to **our specific architecture** (Claude → TanStack AI
code-mode → QuickJS isolate → SSE → React), and recommends a phased plan.

---

## TL;DR

Three layers, in this order:

1. **Unit tests** for the deterministic seams: reducers, parsers, bindings,
   catalog tools. Vitest, runs on every PR. Fast and free.
2. **Integration tests** with a **mocked LLM adapter** that returns canned
   TypeScript program text. Real isolate, real bindings, real reducer.
   Vitest, runs on every PR. Pins the entire pipeline except the LLM.
3. **Real-LLM evals** against a fixture set of user queries, scored on
   structural assertions + LLM-as-judge. Run on a nightly schedule, not
   per-PR. Tracks pass@1 and pass^3 over time.

Don't pull in Promptfoo / Braintrust / Inspect AI yet. Start with vitest +
a small custom eval script. Graduate to a managed eval platform if and only
if the eval suite outgrows hand-rolled tooling.

---

## What makes our case distinct

Most "test your LLM" advice assumes a single-shot prompt → text response.
We're not that. Per `CLAUDE.md`, our request flow is:

```
user query
  → Claude generates ONE TypeScript program
    → program runs in QuickJS isolate
      → program calls external_* (catalog) and ui_* (UI bindings)
        → bindings emit storefront:ui SSE events
          → client uiStore reduces events into a node tree
            → React renders the tree
```

This shape gives us **unusually rich testing seams** for an LLM app:

- **Tools are deterministic.** `src/lib/catalog.ts` is a `Map`-backed
  in-memory catalog. Same input → same output, every time. We don't have
  to mock anything.
- **The "program" is text.** It's stable enough to snapshot, lint, and
  even AST-inspect — separate from the LLM's prose response.
- **The isolate is sandboxed.** Tests can spin up real QuickJS isolates
  in CI safely (no network, no FS) and exercise the full execution path.
- **UI events are a structural artifact.** The `storefront:ui` event log
  is a deterministic side effect of program execution + tool responses
  — perfect for snapshot testing.
- **The TanStack AI adapter is a plug-in seam.** Same contract as Vercel
  AI SDK's `MockLanguageModelV4`: write a fake adapter that returns canned
  text, swap it in for `anthropicText` in tests.

What this means: **most of the "AI app" can be tested without ever calling
an LLM.** The real LLM only needs to be tested on whether it generates
_good programs_ — and that's a narrow, high-value eval, not a per-PR gate.

## What we're NOT trying to test

Be explicit about scope:

- **Not** testing Anthropic's model itself. Their evals cover that.
- **Not** testing QuickJS / isolated-vm correctness. The TanStack AI team
  owns that.
- **Not** testing TanStack Start routing. Out of band.
- **Not** building red-team / jailbreak coverage. Worth doing eventually,
  but not part of the core quality gate.

---

## Layer 1 — Unit tests (deterministic seams)

These are the cheap, fast tests that should run on every PR alongside lint
and types. Each targets a pure or near-pure function.

| Target                                   | Type     | What to assert                                                                    |
| ---------------------------------------- | -------- | --------------------------------------------------------------------------------- |
| `src/lib/storefront/ui-store.ts`         | reducer  | add / update / remove / clear / version (already in `QUALITY.md`)                 |
| `src/lib/client-cart.ts`                 | store    | set / increment / subscribe                                                       |
| `src/lib/storefront/activity-store.ts`   | store    | event recording, pruning                                                          |
| `src/lib/catalog.ts`                     | data     | `searchProducts` filtering, `addToCart` math, deterministic ID lookups            |
| `src/lib/tools/catalog-tools.ts`         | adapters | tool input validation, error mapping                                              |
| `src/lib/storefront/ui-bindings.ts`      | bindings | each binding emits the right `UIEvent` given valid args; rejects bad args via zod |
| SSE frame parser inside `run-handler.ts` | parser   | parses partial frames correctly across chunk boundaries                           |

**Pattern for bindings tests** — call the binding with a fake context:

```ts
import { describe, expect, it } from 'vitest'
import { createStorefrontUIBindings } from './ui-bindings'

describe('ui_addProductCard', () => {
  it('emits an add event with productCard type', async () => {
    const bindings = createStorefrontUIBindings()
    const events: Array<{ name: string; value: unknown }> = []
    const fakeContext = {
      emitCustomEvent: (name: string, value: unknown) => events.push({ name, value }),
    }

    await bindings.ui_addProductCard.execute(
      {
        id: 'cta',
        productId: 'p1',
        name: 'Test Shoe',
        brand: 'Acme',
        price: 99,
        imageUrl: 'https://example/x.png',
      },
      fakeContext,
    )

    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({
      name: 'storefront:ui',
      value: expect.objectContaining({
        op: 'add',
        type: 'productCard',
        id: 'cta',
      }),
    })
  })

  it('rejects missing required fields via zod', async () => {
    const bindings = createStorefrontUIBindings()
    await expect(
      bindings.ui_addProductCard.execute({ id: 'x' }, { emitCustomEvent: () => {} }),
    ).rejects.toThrow()
  })
})
```

**Pattern for the SSE parser** — extract the parsing logic from
`run-handler.ts` into a pure function (`parseSSEFrames(buffer: string):
{ frames: StreamChunk[]; remainder: string }`) and unit-test that. The
parser currently lives inline in the `runHandler` function; refactoring
it out is the right call before adding tests, per
[`fix-root-causes`](brain/principles/fix-root-causes.md).

**Cost**: ~1–2 days to write the full Layer 1 suite. Effectively free in CI
(jsdom unit tests run in <2s on the existing matrix).

## Layer 2 — Integration with a mocked LLM adapter

This is the **highest-leverage test in the system.** It pins down everything
except the LLM: the agent loop, the isolate, the program execution, the
bindings, the SSE stream, and the reducer — all wired together. Only the
LLM is fake.

### How

TanStack AI's `chat({ adapter, ... })` accepts any adapter that implements
the chat-adapter contract. The real adapter is `anthropicText(model)`.
Write a fake:

```ts
// src/lib/storefront/test-helpers/mock-adapter.ts
import type { ChatAdapter } from '@tanstack/ai'

export function mockAdapter(programText: string): ChatAdapter {
  return {
    // Whatever the real adapter does — return a stream that looks like
    // the model called execute_typescript with this program.
    // Exact shape depends on @tanstack/ai version; mirror the real
    // adapter output by capturing it once with a real run + JSON.stringify.
    async *stream() {
      // tool_use chunk for execute_typescript
      yield {
        type: 'TOOL_USE_START',
        toolName: 'execute_typescript',
        toolUseId: 'mock-1',
      }
      yield {
        type: 'TOOL_USE_INPUT_DELTA',
        toolUseId: 'mock-1',
        delta: JSON.stringify({ code: programText }),
      }
      yield { type: 'TOOL_USE_END', toolUseId: 'mock-1' }
      // followed by a final text response
      yield {
        type: 'TEXT_MESSAGE_CONTENT',
        delta: 'Found it for you.',
      }
    },
  }
}
```

> **Implementation note for the junior dev**: don't hand-author the chunk
> sequence — record it once. Run the real flow with the actual Anthropic
> adapter, log every `StreamChunk` to disk, then check that JSON in as a
> fixture. This is how the Vercel AI SDK's own tests work (cassette-style).
> Same pattern as VCR / Polly.js for HTTP mocking.

### What integration tests assert

For each canned program fixture, assert:

1. **Program executes without error** in the real isolate.
2. **Tool calls** — set comparison (not sequence): "this program called
   `external_searchProducts` and `external_getProduct` ≥ 3 times". Don't
   pin order — that's brittle (Anthropic explicitly recommends against
   sequence-checks).
3. **UI event sequence** — `expect(events).toMatchSnapshot()`. The events
   are deterministic given a deterministic program + deterministic tool
   data, so snapshots are reliable here.
4. **CTA invariant** — exactly one event with `id: 'cta'` exists by the end
   (this is the load-bearing prompt rule in `api.storefront-agent.ts`).
5. **No duplicate IDs** in the final node tree.
6. **All `parentId`s reference an extant node.**

### Fixtures to ship

Five to ten canned programs, each is the "good" program for a representative
query. Tag-tag the fixtures so we can extend later:

- `happy-search-recommend.ts` — typical query, returns 3 product cards + 1
  CTA.
- `comparison-table.ts` — exercises `ui_addComparisonTable`.
- `price-history.ts` — exercises `ui_addPriceSparkline` after fetching
  history.
- `out-of-stock-fallback.ts` — first product returns `inStock: false`,
  program falls back to second.
- `tool-error-recovery.ts` — program wraps a tool call in try/catch and
  emits an `inlineError` (or whatever the error UI is).
- `parallel-fetch.ts` — uses `Promise.all`, checks bindings handle
  concurrent emission correctly.

Each fixture is just a `.ts` file containing the program string. The test
file iterates over them.

### Cost

~2–3 days to wire the mock adapter + 5 fixtures. Tests run in CI in <30s
(isolate spin-up dominates). **This is the most valuable test you can
write for this project.**

## Layer 3 — Real-LLM evals

Eval the LLM itself against a fixture set of realistic user queries. This
is where the testing community converges on the same shape regardless of
framework choice:

> Anthropic's official guidance: "**don't grade on tool-call sequence**,
> grade on outcomes. Combine code-based graders for what's deterministic
> with LLM-as-judge for what's subjective. Track pass@1 and pass^k."

### Fixture format

```ts
// evals/fixtures/queries.ts
export const queries = [
  {
    id: 'find-running-shoes',
    user: 'I need running shoes for marathons under $200',
    expectations: {
      // Code-graded
      mustCallTools: ['external_searchProducts'],
      mustEmitTypes: ['productCard', 'ctaButton'],
      mustHaveCtaId: true,
      // LLM-judge rubric
      rubric:
        'Did the assistant recommend running shoes priced under $200, with at least one product card visible and a clear primary CTA?',
    },
  },
  // ...20–30 of these covering happy paths, edge cases, ambiguity, and refusals
]
```

### Eval runner

A single `evals/run.ts` script:

1. For each query, call the real `/api/storefront-agent` endpoint (or call
   `chat({ adapter: anthropicText(...) })` directly — same thing).
2. Capture: the generated program text, the tool calls, the UI event log,
   the final text response, latency, token count.
3. Run code-based assertions on tool calls + event types + CTA invariant.
4. Run LLM-as-judge on the rubric — call Claude (preferably **a different
   model** than the one being evaluated, per Anthropic's guidance) with the
   rubric + actual response, ask for `correct`/`incorrect` + reasoning.
5. Aggregate: pass rate, p50/p95 latency, mean tokens.
6. Repeat each query **3 times** — compute pass@1 and pass^3.
7. Emit a markdown report; diff against the baseline; fail the run if
   pass@1 drops by >5 percentage points.

### Don't

- **Don't snapshot the program text.** It varies legitimately. Snapshot the
  _outcomes_ (events, tool calls), not the program.
- **Don't snapshot the prose response.** Score it via rubric.
- **Don't run on every PR.** Real-LLM evals cost real money and take
  minutes. Run nightly via `schedule:` cron in GitHub Actions, plus a
  manual workflow_dispatch trigger when the prompt changes.

### Cost

- **Engineering**: ~3–5 days for the eval runner + 20 fixtures + the
  scheduled workflow.
- **API**: ~$0.10–$1.00 per nightly run depending on model + suite size.
  Use `STOREFRONT_MODEL=claude-haiku-4-5` for evals to keep this cheap;
  upgrade to Sonnet for release gates.

---

## Tooling: build vs. buy

| Option                      | When it makes sense                                               | Verdict for us                                                        |
| --------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| Vitest + custom eval script | Solo / small team, simple eval needs, in-repo fixtures            | ✅ **Start here.** All ingredients already in deps.                   |
| **Promptfoo**               | CLI-driven, local-only, strong red-team coverage, zero cloud deps | Reasonable add when we have ≥30 fixtures and want shared run history. |
| **Braintrust**              | Need persistent dashboards, prod monitoring, non-eng stakeholders | Premature. Revisit if/when this is a team-of-many product.            |
| **Inspect AI**              | Research-grade rigor, Python ecosystem                            | Wrong language, wrong shape for our app.                              |
| **DeepEval**                | Maximum metric coverage, RAG-heavy stacks                         | Overkill. We're not RAG.                                              |
| **LangSmith**               | LangChain stack                                                   | Not our stack.                                                        |

**Recommendation**: vitest for Layers 1 + 2; a single hand-rolled TS file
(~300 lines) for Layer 3. Reassess in 3 months — if the eval suite has >50
fixtures, multiple maintainers, or external reporting needs, migrate
Layer 3 to Promptfoo (it has a TS config format and can wrap our fixture
shape).

## Anti-patterns to avoid

These come up in every "testing AI apps" thread. Don't:

- ❌ **Snapshot the LLM's prose response.** It varies on every run; you'll
  spend more time updating snapshots than catching regressions.
- ❌ **Pin tool-call sequence.** Programs find legitimate alternative
  orderings. Pin the _set_ of tools called, or the outcomes.
- ❌ **Use the same model as judge and judged.** Anthropic recommends
  different models. Our eval is generated by Haiku → judged by Sonnet (or
  vice versa).
- ❌ **Test prompts via screenshots.** UI tests belong in Playwright
  (Layer 2 component-style) or visual regression. Don't ask an LLM to
  read screenshots — too noisy, too slow.
- ❌ **Run real-LLM evals on every PR.** Slow, expensive, flakey. Keep
  per-PR signal deterministic.
- ❌ **Forget eval-awareness.** Per Anthropic's `eval-awareness-browsecomp`
  research, frontier models can detect when they're being evaluated and
  behave differently. Mitigation: use realistic shopper-style prompts in
  the fixture set, not synthetic-looking benchmark prompts.
- ❌ **Ignore non-determinism.** A single passing run isn't proof. Compute
  pass^3 for any fixture that gates a release.
- ❌ **Hide failures.** Eval failures should print the program text + tool
  log + reason for fail. Without that, debugging is guesswork.

---

## Phased rollout

### Phase 0 — already covered in `QUALITY.md`

- `ui-store.ts` reducer test (eight cases). This is the seed.

### Phase 1 — fill out Layer 1 (1 sprint)

- Extract SSE frame parser from `run-handler.ts` into a pure function;
  unit-test it.
- Tests for `client-cart`, `activity-store`, `catalog`, `catalog-tools`.
- Tests for every binding in `ui-bindings.ts` using the fake-context
  pattern shown above.
- **Exit criteria**: ≥30 unit tests, all green in CI, total runtime <5s.

### Phase 2 — Layer 2 integration (1 sprint)

- Record the canned-program-and-stream cassette format. Build the
  `mockAdapter` helper.
- Write 5 fixtures covering happy path + comparison + price-history +
  out-of-stock + tool-error.
- For each fixture: assert tool-set, event snapshot, CTA invariant, no
  duplicate IDs, parent-ID integrity.
- **Exit criteria**: integration tests run in CI in <30s, all five
  fixtures green.

### Phase 3 — Layer 3 nightly eval (1 sprint)

- Write `evals/run.ts` runner.
- Author 20 fixture queries (start with real shopper conversations from
  manual testing — beats synthetic queries on eval-awareness).
- Wire `.github/workflows/evals.yml` on `schedule: '0 6 * * *'` (06:00 UTC
  daily) + `workflow_dispatch`.
- Land a baseline `evals/baseline.json`. Future runs diff against it.
- Track pass@1 and pass^3 in the markdown report. Post the report as a PR
  comment when the workflow runs against a PR (manual dispatch).
- **Exit criteria**: nightly run is green for 7 days; baseline pass rate
  ≥85%; eval cost <$2 per night.

### Phase 4 — bring in tooling (only if needed)

- If Phase 3 outgrows the hand-rolled script (≥50 fixtures, multiple
  maintainers, want a UI), migrate to Promptfoo.
- If we need prod monitoring + non-eng stakeholders, evaluate Braintrust.
- Add Playwright-based browser tests for the SSE round-trip if visual
  regressions become a recurring problem.

---

## Concrete starter code

To make Phase 1 unambiguous, here's the first non-trivial test beyond
`ui-store.test.ts`. Drop into `src/lib/storefront/ui-bindings.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createStorefrontUIBindings } from './ui-bindings'

function mkContext() {
  const events: Array<{ name: string; value: unknown }> = []
  return {
    events,
    ctx: {
      emitCustomEvent: (name: string, value: unknown) => events.push({ name, value }),
    },
  }
}

describe('storefront UI bindings', () => {
  it('ui_addProductCard emits an add event with productCard type', async () => {
    const { events, ctx } = mkContext()
    const b = createStorefrontUIBindings()
    await b.ui_addProductCard.execute(
      {
        id: 'p1',
        productId: 'sku-1',
        name: 'Runner X',
        brand: 'Acme',
        price: 129,
        imageUrl: 'https://x/y.png',
      },
      ctx,
    )
    expect(events).toEqual([
      {
        name: 'storefront:ui',
        value: expect.objectContaining({
          op: 'add',
          type: 'productCard',
          id: 'p1',
        }),
      },
    ])
  })

  it('ui_addCTA accepts the addToCart handler shape', async () => {
    const { events, ctx } = mkContext()
    const b = createStorefrontUIBindings()
    await b.ui_addCTA.execute(
      {
        id: 'cta',
        label: 'Add to cart',
        handlerId: 'addToCart',
        payload: { productId: 'sku-1', size: '10' },
      },
      ctx,
    )
    expect(events).toHaveLength(1)
    const ev = events[0]!.value as { id: string; type: string }
    expect(ev.id).toBe('cta')
    expect(ev.type).toBe('ctaButton')
  })

  it('ui_remove emits an op: remove event', async () => {
    const { events, ctx } = mkContext()
    const b = createStorefrontUIBindings()
    await b.ui_remove.execute({ id: 'p1' }, ctx)
    expect(events[0]!.value).toEqual({ op: 'remove', id: 'p1' })
  })

  it('zod schema rejects bad input', async () => {
    const { ctx } = mkContext()
    const b = createStorefrontUIBindings()
    await expect(b.ui_addProductCard.execute({ id: 'p1' }, ctx)).rejects.toThrow()
  })
})
```

Eight ish lines of helper, four tests, ~60 lines total. The pattern
generalizes across all bindings.

---

## Sources

Research basis (April 2026):

- Anthropic, [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- Anthropic, [Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests)
- Anthropic, [Eval awareness in Claude Opus 4.6's BrowseComp](https://www.anthropic.com/engineering/eval-awareness-browsecomp)
- Vercel, [AI SDK testing docs](https://ai-sdk.dev/docs/ai-sdk-core/testing) (`MockLanguageModelV4`, `simulateReadableStream`)
- TanStack AI, [Code Mode docs](https://github.com/tanstack/ai/blob/main/docs/code-mode/code-mode.md)
- Cloudflare, [Code Mode: the better way to use MCP](https://blog.cloudflare.com/code-mode/)
- Northflank, [Best code execution sandbox for AI agents (2026)](https://northflank.com/blog/best-code-execution-sandbox-for-ai-agents)
- Braintrust, [Best Promptfoo alternatives 2026](https://www.braintrust.dev/articles/best-promptfoo-alternatives-2026)

## Open questions

Worth answering before Phase 2 starts:

1. **What's the exact `StreamChunk` shape** TanStack AI's adapters emit?
   Capturing one real run will answer this — but it's the load-bearing
   detail of the mock adapter implementation.
2. **Can the QuickJS isolate be safely re-used across tests**, or must it
   be created per-test? Affects test runtime by an order of magnitude.
3. **Do we want to record real-LLM cassettes** for Layer 2 (run real
   Claude once, snapshot the program, replay in tests forever) — or write
   cannned programs by hand? Cassettes are more realistic; hand-written
   programs are more controllable. Probably both: hand-written for edge
   cases, cassettes for happy paths.
4. **Where does the eval baseline live?** Checked into the repo
   (`evals/baseline.json`)? Or in cloud storage? Repo is simpler but
   means baseline updates need a PR.
