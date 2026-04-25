# PRD: Per-User Skills for the Storefront Agent

## Introduction

Codemode-shop's storefront agent (`/api/storefront-agent`) currently re-derives every shopping pattern from scratch on every request — search, enrich in parallel, render product cards. Power users repeat the same flows (reorder a brand, browse a favorite category, compare against last purchase) but get no speedup for repetition.

This feature integrates `@tanstack/ai-code-mode-skills` (`/Users/alexanderopalic/Projects/opensource/ai/packages/typescript/ai-code-mode-skills`) to give each session a small, growing library of personal "skills" — saved TypeScript snippets the LLM authored once, the user accepted, and can now fire in one click. Skills shrink the system prompt, eliminate `execute_typescript` JIT cost on the hot path, and make repeat shopping feel like keyboard shortcuts.

**Scope of v1**: read-only catalog skills only (no cart mutations, no checkout). LLM proposes; user confirms. Chips above the chat input fire skills directly. File-based storage namespaced by `sessionId`.

## Goals

- Enable a user to save a recurring catalog query as a one-click chip
- Cut latency and tokens on repeat queries by replacing `execute_typescript` with a direct skill tool call
- Validate the per-user skills mental model end-to-end (proposal → confirm → reuse) on a small surface before extending to mutations
- Ship without changing the public API of `@tanstack/ai-code-mode-skills` (work around the UI-binding gap with a thin local wrapper)
- Zero risk to cart/order correctness — skills cannot mutate state in v1

## User Stories

### US-001: Per-session skill storage

**Description:** As the system, I need skills to be stored in a directory namespaced by `sessionId` so that one user's skills never appear for another user.

**Acceptance Criteria:**

- [ ] `getSkillStorageForSession(sessionId)` returns a `SkillStorage` backed by `.skills/users/<sessionId>/`
- [ ] Two different session IDs see disjoint skill lists when calling `loadIndex()`
- [ ] `.skills/` is added to `.gitignore`
- [ ] Storage directory is created lazily on first write
- [ ] Unit test covers namespacing and lazy creation
- [ ] Typecheck and tests pass

### US-002: UI-binding-aware skill execution wrapper

**Description:** As a developer, I need skills to be able to call `ui_*` bindings so that a skill can both fetch and render in one call. The upstream `skillToTool` only injects `external_*` bindings — we need a thin local wrapper that adds the storefront UI bindings.

**Acceptance Criteria:**

- [ ] `src/features/storefront/api/skill-to-storefront-tool.ts` wraps `skillToTool` such that the executed skill code can call `ui_addProductCard`, `ui_addComparisonTable`, `ui_update`, `ui_remove`
- [ ] UI events emitted from inside a skill arrive as the same `storefront:ui` SSE custom events as today
- [ ] The wrapper does NOT inject any cart/order bindings (read-only enforcement)
- [ ] Unit test executes a fixture skill that calls `ui_addProductCard` and asserts the event was emitted
- [ ] Typecheck and tests pass

### US-003: Read-only safety classifier

**Description:** As the system, I need to refuse skill registration whose code references mutating tools so that v1 cannot accidentally introduce cart/checkout side effects.

**Acceptance Criteria:**

- [ ] `classifySkillCode(code: string): 'read-only' | 'mutating'` rejects code containing `external_addToCart`, `external_removeFromCart`, `external_setCartQuantity`, `external_clearCart`, `external_placeOrder`, `external_getOrder`
- [ ] Rejects dynamic dispatch patterns: `(globalThis as any)['external_' + ...]`, `eval(...)`, `Function(...)`, `import(...)`
- [ ] Allowed: `external_searchProducts`, `external_getProduct`, `external_getStockAndShipping`, `external_getReviewSummary`, `external_getPriceHistory`, all `ui_*`
- [ ] Returns 'mutating' on rejection with a list of disallowed tokens found
- [ ] Unit test covers each allowed and each rejected case
- [ ] Typecheck passes

### US-004: GET /api/skills route

**Description:** As the client, I need to fetch the current session's skill list so I can render chips.

**Acceptance Criteria:**

- [ ] `GET /api/skills` returns `{ skills: Array<{ name: string, label: string, description: string, createdAt: string }> }`
- [ ] Uses `withSession` to scope by sessionId
- [ ] Returns `{ skills: [] }` when the session has no skills yet (no error)
- [ ] Integration test covers empty + populated cases
- [ ] Typecheck passes

### US-005: Skill chips above chat input

**Description:** As a user, I want to see my saved skills as small pill buttons above the chat input so I can fire them in one click.

**Acceptance Criteria:**

- [ ] `<SkillChips />` component renders one `<button>` per skill, label-only, in a horizontally scrollable row
- [ ] Component fetches `/api/skills` on mount and on a `skill:registered` SSE custom event
- [ ] Each chip has a context menu (right-click or long-press) with a single "Remove" action
- [ ] Empty state: component renders nothing when skills list is empty (no placeholder copy)
- [ ] Mounted in `storekeeper-drawer.tsx` directly above the chat input
- [ ] Typecheck passes
- [ ] Verify in browser

### US-006: One-click skill execution

**Description:** As a user, I want clicking a chip to fire the skill immediately and stream results back into the chat — same UX as if I'd typed the equivalent prompt.

**Acceptance Criteria:**

- [ ] Clicking a chip POSTs to `/api/storefront-agent` with `messages` containing a synthetic user turn `{ role: 'user', content: '@skill:<name>' }`
- [ ] The route detects the `@skill:<name>` prefix and invokes the skill directly via the agent loop, bypassing `execute_typescript`
- [ ] User-visible chat message reads as the skill's `label` (e.g. "Reorder Pegasus"), not `@skill:reorder_pegasus`
- [ ] Skill output renders into the canvas via the same `ui_*` flow as a normal turn
- [ ] If the skill fails (throws), the chat shows an inline error card with the skill name and message
- [ ] Verify in browser

### US-007: LLM `propose_skill` tool

**Description:** As the LLM, I need a `propose_skill` tool to suggest saving a successful pattern as a reusable shortcut, without registering it directly.

**Acceptance Criteria:**

- [ ] New tool `propose_skill` is added to the storefront agent's tool list
- [ ] Input schema: `{ name: string (snake_case), label: string, description: string, code: string, inputSchema: string, outputSchema: string, usageHints: string[] }`
- [ ] Tool runs `classifySkillCode` (US-003) and rejects mutating proposals with a tool error
- [ ] On success, emits a `skill:proposed` custom event with the proposal payload, returns `{ proposed: true, name }`
- [ ] Tool does NOT persist the skill — that happens only on user confirmation (US-008)
- [ ] System prompt is updated with a short rule: _"After a successful turn, if the pattern is likely to recur for this user, propose it as a skill (max one per turn)."_
- [ ] Typecheck passes

### US-008: Skill proposal banner

**Description:** As a user, when the LLM proposes a skill I want a small, dismissible banner asking if I want to save it, with one-click accept/reject.

**Acceptance Criteria:**

- [ ] `<SkillProposalBanner />` listens for `skill:proposed` SSE custom events via `useChat`'s `onCustomEvent`
- [ ] Banner shows the proposed `label`, `description`, and two buttons: `Save shortcut` and `Not now`
- [ ] `Save shortcut` POSTs to `POST /api/skills` with the full proposal payload; on 200 response, banner dismisses and a fresh fetch repopulates `<SkillChips />`
- [ ] `Not now` POSTs to `POST /api/skills/decline` with the proposal `name`; banner dismisses
- [ ] Only one banner visible at a time; new proposals queue
- [ ] Banner auto-dismisses after 30 seconds with no action (counts as decline)
- [ ] Typecheck passes
- [ ] Verify in browser

### US-009: POST /api/skills + decline tracking

**Description:** As the client, I need endpoints to confirm or decline a proposed skill, and the system needs to remember declines so the LLM doesn't re-propose the same thing.

**Acceptance Criteria:**

- [ ] `POST /api/skills` accepts the proposal payload, runs `classifySkillCode` again (defense in depth), persists via `getSkillStorageForSession(sessionId).save(...)`
- [ ] `POST /api/skills/decline` records the proposed `name` in a per-session decline list (file: `.skills/users/<sessionId>/_declined.json`)
- [ ] `propose_skill` tool checks the decline list and refuses to propose any name already declined for this session
- [ ] `DELETE /api/skills/:name` removes a skill (used by US-005 chip context menu)
- [ ] Integration test covers full propose → save → list → delete cycle
- [ ] Typecheck and tests pass

### US-010: Wire skills into `/api/storefront-agent`

**Description:** As the system, I need the agent route to load this session's skills on every request, expose them as direct tools alongside `execute_typescript`, and document them in the system prompt.

**Acceptance Criteria:**

- [ ] `api.storefront-agent.ts` calls `getSkillStorageForSession(sessionId)` per request
- [ ] All saved skills (no LLM-side selection step in v1 — file storage is small per user) are converted via the wrapper from US-002 and added to the tool array
- [ ] System prompt is appended with a "Your saved shortcuts:" section listing each skill's `name` + `description`, generated from current skill list
- [ ] When the request body contains the `@skill:<name>` prefix (US-006), the system prompt instructs the LLM to call that exact skill tool and nothing else
- [ ] When skill list is empty, no skill-related prompt content is appended (don't bloat the prompt for first-time users)
- [ ] Existing `execute_typescript` flow continues to work unchanged for non-skill requests
- [ ] All existing storefront integration tests still pass
- [ ] Typecheck and tests pass
- [ ] Verify in browser: full flow — ask a novel query, accept the proposal, click the new chip, see results

## Functional Requirements

- FR-1: Skills are stored on disk under `.skills/users/<sessionId>/`, with one directory per skill containing `meta.json` + `code.ts` (matches upstream `createFileSkillStorage` layout)
- FR-2: A skill's code may only call read-only catalog `external_*` functions and any `ui_*` binding; mutating tools are rejected at registration and on every request
- FR-3: The LLM proposes new skills via `propose_skill` (does not persist) and only after a successful `execute_typescript` turn
- FR-4: A skill is persisted only after the user clicks `Save shortcut` in the proposal banner
- FR-5: The user fires a saved skill by clicking its chip; chips render in `<SkillChips />` above the chat input
- FR-6: Chip click triggers a normal `/api/storefront-agent` request whose system prompt directs the LLM to call exactly that skill's tool
- FR-7: A user may delete a skill from the chip's context menu; deletion is immediate and irreversible
- FR-8: Declined proposals are remembered per session; the same skill name will not be re-proposed
- FR-9: Skill execution streams `ui_*` events through the same SSE pipeline as normal `execute_typescript` runs — no client-side rendering changes
- FR-10: A skill failure surfaces as an inline error card in the chat, not a silent retry

## Non-Goals (Out of Scope)

- **No cart or checkout mutations in skills.** Skills cannot call `addToCart`, `removeFromCart`, `setCartQuantity`, `clearCart`, `placeOrder`, `getOrder`. Adding "reorder my last" requires a follow-up PRD.
- **No cross-user skill sharing.** Skills are strictly per-`sessionId`. No public skill library, no copy/import.
- **No skill code editor in the UI.** Users see chips and labels only. To edit a skill, delete it and let the LLM re-propose. (Power users can still edit `.skills/users/<sessionId>/<name>/code.ts` on disk.)
- **No skill input parameters.** v1 supports only zero-arg skills. The LLM-authored code may embed user-derived constants (e.g. zip code, last brand). Parameterized skills with a popover form are deferred.
- **No selection round-trip.** Skip `selectRelevantSkills` (which adds a Haiku call per request). Per-user skill counts are small enough (<20) to expose all of them as tools every request.
- **No trust strategy / promotion ladder.** All skills are equally trusted once user-confirmed. The upstream `trustLevel` field is set to `trusted` immediately and ignored.
- **No registry across server restarts beyond what file storage gives us.** No DB. No migration story.
- **No upstream PR to `@tanstack/ai-code-mode-skills`.** We work around the UI-binding gap locally (US-002). Upstreaming is a separate decision after v1 ships and the pattern proves out.

## Design Considerations

**Chip placement and styling.** Chips live in `<SkillChips />`, mounted in `storekeeper-drawer.tsx` directly above the existing chat input. Use existing design tokens — match the visual weight of the input field's secondary controls. Horizontally scrollable when count exceeds row width. No icons in v1.

**Banner placement.** `<SkillProposalBanner />` mounts inside the drawer at the top of the message list (sticky), so it never blocks the input. Single banner at a time; queue subsequent proposals.

**Reuse existing primitives.**

- UI bindings (`createStorefrontUIBindings`) already work via the `getSkillBindings` mechanism in `buildStorefrontCodeMode` — we lift the same map for the wrapper in US-002
- SSE custom event pipeline (`storefront:ui`, `cart:update`) already plumbed through `run-handler.ts` and `useChat`; new events (`skill:proposed`, `skill:registered`) follow the same pattern
- `inline-error-card.tsx` already exists for failure rendering (US-006)

**System prompt budget.** With <20 skills per user and one line per skill, the appended skill catalog adds ~500 tokens worst case. Acceptable. Skip the catalog entirely when the list is empty.

## Technical Considerations

**The UI-binding gap.** `skillToTool` in `@tanstack/ai-code-mode-skills/src/skills-to-tools.ts` line 168–286 builds its own isolate context with only the bindings passed to it; it does not have a `getSkillBindings` hook like `createCodeModeTool` does. Our wrapper (US-002) calls `skillToTool` with `bindings = { ...toolsToBindings(catalogReadTools, 'external_'), ...createStorefrontUIBindings() }` — pre-merging UI bindings into the tools-to-bindings output. Verified in `code-mode-with-skills.ts:75–104` that no other host injection happens between binding setup and code execution.

**ALS preservation across the isolate boundary.** The current `withSession` model uses Node `AsyncLocalStorage`. Skill execution awaits `context.execute()` from inside the request handler, so ALS is preserved across the isolated-vm bridge — same guarantee `buildStorefrontCodeMode` already relies on. Only catalog _read_ tools call `sessionContext.get()` in v1, but those don't actually use the session ID — they read from the global `PRODUCTS` map. So even if ALS propagation broke, US-001–US-010 are unaffected. Worth a sanity-check assertion in the US-002 test, but not load-bearing.

**Skill name collisions.** Two different sessions can each have a `reorder_pegasus`. That's fine — each session's storage is namespaced. But two skills in the _same_ session can't share a name; `register_skill` upstream returns an error. Surface that error cleanly in the proposal banner.

**LLM-authored constants.** Skills will embed strings like `"Pegasus 41"`, `"94107"`, `"size 10W"`. That is by design — the skill is personalized. Make sure the classifier (US-003) does NOT reject embedded literal strings; it only inspects function call sites.

**No `register_skill` from the LLM.** We bypass the upstream `register_skill` tool entirely (it would persist immediately and skip user confirmation). v1 uses our `propose_skill` (US-007) + `POST /api/skills` (US-009) two-step instead.

**Performance budget.** Per-request overhead on top of today's flow: one `loadIndex()` (~5ms file read) + appending skill catalog to system prompt (~0ms). Per skill execution: same isolate cost as today's `execute_typescript`. No new LLM calls. Net: negligible additional latency floor; meaningful savings on the hot path when chips are used.

## Success Metrics

- After 1 week of dogfooding: at least one saved skill exists in your own `.skills/users/<sessionId>/` directory
- Hot-path latency: chip-fired skill returns rendered cards in **<1.5s p50** (vs. ~3-4s for an equivalent `execute_typescript` cold turn)
- Token savings on chip-fired turns: **>40% reduction** in main-model input tokens vs. the same query typed naturally
- Zero cart/order regressions: all existing storefront integration tests pass, plus a new test covering the read-only enforcement
- Qualitative: when you open the storefront after a week and see your own chips, clicking one feels faster than typing

## Open Questions

- **Schema drift.** If we rename or remove a catalog tool later, every saved skill referencing it crashes. Do we (a) freeze tool names forever once shipped, (b) write a CI check that runs every saved skill against current tool schemas, or (c) accept the breakage and add a "skill needs rebuild" UX? Probably (a) for v1.
- **Refusal heuristic.** "Don't re-propose declined names" handles exact duplicates. What about near-duplicates (`reorder_pegasus` vs. `reorder_my_pegasus`)? Probably fine to let through in v1 and revisit if it becomes annoying.
- **Editing skills.** When a user wants to tweak a saved skill, the v1 answer is "delete and re-propose." Is that good enough, or do we need an inline edit affordance (textarea on the chip context menu)?
- **Auto-fire on chip click vs. confirm prompt.** v1 fires immediately. For mutating skills (future v2), the chip should probably show a confirmation step. Worth deciding the affordance shape now so v1 chips don't feel inconsistent later.
- **Prompt instruction strength for `propose_skill`.** "Propose at most one per turn, only when likely to recur" is fuzzy. We may need to track per-session pattern repetition explicitly to avoid annoying proposal spam.
- **Skill discovery in the UI.** When a user has 15+ chips, the row gets unwieldy. Do we add search, grouping, or a "recently used" sort? Probably not in v1 — let's see if anyone hits the limit.
