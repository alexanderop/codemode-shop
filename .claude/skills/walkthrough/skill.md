---
name: walkthrough
description: >
  Generates a self-contained HTML walkthrough (Mermaid flowchart, ER diagram, or narrated
  linear trace) of a codebase feature, flow, architecture, or schema.
  Triggers: "$walkthrough", "walk me through", "trace the code path", "explain this flow",
  "visualize the data model".
compatibility: Designed for Claude Code (or similar products). Requires a browser to open generated HTML files.
allowed-tools: Bash Read Write Glob Grep Task
metadata:
  author: Alexander Opalic
  version: '1.2'
---

# Codebase Walkthrough Generator

Generate interactive HTML files that give new developers a **quick mental model** of how a feature or system works. The goal is fast onboarding — readable in under 2 minutes.

**Three formats**, each suited to a different kind of question:

| Format                     | Question it answers                                       | Output                                                                              |
| -------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Architecture Flowchart** | "What are the pieces and how are they wired?"             | Mermaid flowchart, clickable nodes, detail panel                                    |
| **ER Diagram**             | "What's the data model?"                                  | Mermaid ER diagram, entities + relationships                                        |
| **Narrated Trace**         | "Show me what happens, step by step, with real artifacts" | Linear timeline — each step shows the actual HTTP body / code / event / state / JSX |

**CRITICAL**: When this skill is triggered, you MUST generate a `walkthrough-*.html` file. Never respond with just text — always produce the interactive HTML output.

**Always dark mode.** Every walkthrough uses a pure black background (`#000000`), white text, and purple accents. Never generate light-mode walkthroughs. The `<html>` tag MUST include `style="color-scheme: dark"`.

## Workflow

### Step 1: Pick the format

Choose by signal in the user's prompt. **In the order checked:**

1. **ER Diagram** — user says: schema, tables, table relationships, data model, ERD, columns, foreign keys, migration.
2. **Narrated Trace** — user says: step by step, trace one, walk through one example, real request, from keystroke to, what happens when, show me what happens, end-to-end. Also pick this when the topic is a single concrete flow with one clear input → output.
3. **Architecture Flowchart** — user says: architecture, how is X organized, what are the pieces, system overview, layers, components and connections. Also the default for a bare `$walkthrough` (no topic).

**Ambiguous?** If the request fits more than one (e.g., "explain how X works"), ask the user once — don't guess:

> Which format would help most?
> **A.** Architecture flowchart — boxes + arrows showing the pieces and wiring
> **B.** Narrated trace — one real request walked through the code, step by step, with the actual artifact at each hop
> **C.** Both (architecture first, then trace) — generate two files
>
> If you don't pick, I'll go with **B** for flow/lifecycle topics and **A** for system/layer topics.

After the user replies (or after applying the default), commit to one format and proceed. Do not switch mid-generation.

### Step 2: Understand the scope

Frame the walkthrough as a **mental model for someone new**:

- **Flowchart**: "What are the 5–12 key concepts, and how do they connect?"
- **ER Diagram**: "What are the 3–8 entities, and how are they related?"
- **Trace**: "What concrete scenario should I trace? What does the artifact look like at each of the 5–9 hops?"

For traces, pick (or ask the user to pick) one realistic scenario — a specific user message, URL parameter, button click, or event payload. The whole trace stands or falls on this choice; pick the most representative path, not the simplest.

If the request is vague (and not a bare `$walkthrough`), ask one clarifying question. Otherwise proceed.

### Step 3: Explore the codebase with parallel subagents

**Always read real source files before generating.** Never fabricate code paths.

**Use the Task tool to delegate exploration to subagents.** This keeps the main context clean for HTML generation and parallelizes the research phase.

#### 3a. Identify areas to explore

Do a quick Glob/Grep yourself (1-2 calls max) to identify the relevant directories and file groups. Then split the exploration into 2-4 independent research tasks.

#### 3b. Launch parallel Explore subagents

Use `Task` with `subagent_type: "Explore"` to launch multiple agents **in a single message** (parallel). Each agent investigates one area and reports back the **purpose and connections** of each piece — not code dumps.

**Do NOT read the files yourself** — let the subagents do it. Your job is to orchestrate and then synthesize their results into the HTML.

The shape of the report depends on the format:

##### For Flowchart and ER walkthroughs

Tell each subagent to return a structured report:

```
NODE: drawingInteraction
  label: Drawing Interaction
  file: app/features/tools/useDrawingInteraction.ts
  purpose: Converts pointer events into shape data. The bridge between raw mouse input and the element model.
  connects_to: canvasRenderer (feeds shape data), toolState (reads active tool)
  key_snippet:
    const element = createElement(tool, startPoint, currentPoint)
  lang: typescript
```

Every node MUST include a code snippet. Pick the single most useful piece — a key function call, type definition, config line, or core algorithm (1–5 lines).

##### For Narrated Trace walkthroughs

Tell each subagent to trace ONE concrete execution. Example prompt body:

> Trace ONE concrete execution of `<scenario>` through the codebase. Use a realistic input (e.g., a specific user message or URL param). For each step **in execution order**, report the artifact that exists at that moment:
>
> - STEP `<N>` kind: one of `HTTP REQUEST`, `AGENT WIRING`, `TYPESCRIPT PROGRAM`, `SANDBOX EXECUTION`, `SSE FRAME`, `STORE DISPATCH`, `STATE DIFF`, `REACT RENDER`, `LOG`, etc.
> - file: path
> - what happens in 1–2 sentences (plain English, why this hop exists)
> - code: 4–12 lines showing the _actual artifact_ at this point — real HTTP body, real function output, real JSON, real state mutation, real JSX. **Real values, not `foo`/`bar`/`...` placeholders.**
> - lang: typescript / tsx / json / bash / text
>
> Aim for 5–9 steps total. The reader should be able to read the code blocks alone, top-to-bottom, and watch the data transform.

If you split the trace across multiple subagents, give each a contiguous _range_ of steps (e.g., "steps 1–3: client + server boot", "steps 4–6: sandbox + streaming", "steps 7–9: store + render") and tell them what the previous range produced as output.

#### 3c. Synthesize subagent results (no more file reads)

Once subagents return, you have everything needed. **Do NOT read more files or launch more subagents.** Go directly to Step 4.

Combine results:

- **Flowchart**: 5–12 nodes (strict min 5), 2–4 subgraphs, edge list with plain-verb labels.
- **ER**: 3–8 entities, relationships with cardinality.
- **Trace**: 5–9 steps (strict min 5) in execution order, each with the six required fields (`kind`, `title`, `description`, `files`, `lang`, `code`).

If a subagent's report is missing something, drop the affected node/step rather than reading files yourself — but ensure you still meet the format's minimum.

### Step 4: Generate the HTML file

Create a single self-contained HTML file. **Pick the right reference based on format:**

| Format                 | Reference                                                    |
| ---------------------- | ------------------------------------------------------------ |
| Architecture Flowchart | [references/html-patterns.md](references/html-patterns.md)   |
| ER Diagram             | [references/html-patterns.md](references/html-patterns.md)   |
| Narrated Trace         | [references/trace-patterns.md](references/trace-patterns.md) |

**File location**: Write to the project root as `walkthrough-{topic}.html` (e.g., `walkthrough-canvas-drawing.html`). Use kebab-case for the topic slug. For the "Both" choice, write two files: `walkthrough-{topic}-architecture.html` and `walkthrough-{topic}-trace.html`.

**Architecture (all three formats)**:

- `<script type="module">` — native ES modules, no Babel
- Template literals work fine — use them freely
- Shiki imported via ESM, highlights code at startup
- React/ReactDOM as UMD globals — `React.createElement()`, no JSX

**Required elements** vary by format — see the reference file. Common to all:

1. Title and subtitle
2. **TL;DR summary** — 2-3 sentences, named the _non-obvious mechanism_ of the system
3. Code snippets pre-highlighted with Shiki (`vitesse-dark` theme)
4. Every snippet has an explicit `lang` field — never omit, default to `"typescript"`

**After writing the file**, open it in the user's browser:

```bash
open walkthrough-{topic}.html    # macOS
```

## Architecture Flowchart Conventions

Use for: feature flows, request lifecycles, system overviews, "how the pieces connect".

**Direction**: `graph TD` (top-down) for hierarchical flows, `graph LR` (left-right) for sequential pipelines or request/response stories.

**Node types** (styled by category):

| Type         | Style      | Use for                                    |
| ------------ | ---------- | ------------------------------------------ |
| `component`  | Purple-500 | UI components, pages                       |
| `composable` | Purple-600 | Composables, hooks, bridges                |
| `utility`    | Purple-700 | Utils, helpers, pure functions             |
| `external`   | Gray-600   | Libraries, browser APIs, external services |
| `event`      | Purple-200 | Events, user actions, triggers             |
| `data`       | Purple-600 | Stores, state, registries                  |

**Subgraphs**: Group related nodes into 2-4 subgraphs with approachable mental-model labels (e.g., "User Input", "Core Logic", "Visual Output") — not technical layer names. Numbered subgraphs (`1 · User Input`, `2 · Core Logic`) help when the diagram is sequential.

**Node IDs**: Descriptive camelCase (e.g., `drawingInteraction`, `canvasRenderer`).

**Node labels**: Plain English ("Drawing Interaction"), not function signatures or file names.

**Edges**: Plain verbs ("triggers", "feeds into", "reads", "produces", "watches"). Not API method names.

| Mermaid syntax | Use for |
| -------------- | ------- | --- | ------------------------------------------------------------------ |
| `A -->         | "label" | B`  | Direct call / synchronous                                          |
| `A -.->        | "label" | B`  | Reactive / watch / subscribe                                       |
| `A ==>         | "label" | B`  | Streamed event / emission (visually distinct, can be CSS-animated) |

**Click binding** (mandatory on every node):

```
click nodeId nodeClickHandler "View details"
```

where `nodeClickHandler` is a global JS function defined in the HTML.

## ER Diagram Conventions

Use for: schema design, table relationships, migrations, data models.

**Syntax**:

```
erDiagram
    USERS {
        string id PK
        string email UK
        string name
        timestamp created_at
    }
    TEAMS {
        string id PK
        string name
        string owner_id FK
    }
    USERS ||--o{ TEAMS : "owns"
```

**Cardinality**:

| Syntax       | Meaning            |
| ------------ | ------------------ |
| `\|\|--o{`   | One to many        |
| `\|\|--\|\|` | One to one         |
| `}o--o{`     | Many to many       |
| `\|\|--o\|`  | One to zero-or-one |

**Column markers**: `PK` (primary), `FK` (foreign), `UK` (unique).

**Click handlers**: ER entities don't support Mermaid `click` callbacks — attach handlers manually via `querySelectorAll('.entityLabel')` after render. See html-patterns.md for the pattern.

## Narrated Trace Conventions

Use for: "step by step", "what happens when X", request lifecycles, end-to-end flows. Output is a linear timeline — no diagram. See [references/trace-patterns.md](references/trace-patterns.md) for the full template.

**Step shape**:

```js
{
  kind: 'SSE FRAME ON THE WIRE',         // ≤ 4 words, uppercase
  title: '5 · Each ui_* call emits an event',
  description: '1-2 sentences in plain text. What and why.',
  files: ['src/.../ui-bindings.ts'],
  lang: 'json',
  code: `data: { "type": "custom", "eventType": "storefront:ui", ... }`,
}
```

**Suggested step kinds** (mix and match — these are anchors, not a fixed taxonomy):
`HTTP REQUEST` · `HTTP RESPONSE` · `AGENT WIRING` · `CONFIG` · `TYPESCRIPT PROGRAM` · `CODE PATH` · `SANDBOX EXECUTION` · `EXECUTION TRACE` · `LOG` · `SSE FRAME ON THE WIRE` · `EVENT` · `MESSAGE` · `STORE DISPATCH` · `STATE DIFF` · `REACT RENDER` · `DOM`

**Key constraints**:

- 5–9 steps (strict min 5).
- Each `code` is a _real artifact_, not a concept summary. If the step is "the model writes a program", the code IS the program — not a comment describing it.
- Strict execution order. No parallel branches, no "meanwhile…".
- Realistic data values throughout. No `foo`/`bar`/`...`.
- Title format: `N · Imperative phrase` (numeric prefix is stripped at render time but kept in source for at-a-glance scanning).

## Quality Checklist

Before finishing, verify the format-appropriate items:

### All formats

- [ ] `<html>` tag includes `style="color-scheme: dark"`
- [ ] TL;DR is present, ≤ 3 sentences, names the _non-obvious mechanism_
- [ ] Every code snippet has `lang` explicitly set
- [ ] Code snippets are real code from the codebase (or faithfully derived artifacts), not fabricated
- [ ] File paths exist and are relative to project root
- [ ] HTML opens in a browser without console errors
- [ ] Shiki has try/catch graceful fallback

### Flowchart

- [ ] 5–12 nodes (strict min 5)
- [ ] Every node has a code snippet (1–5 lines)
- [ ] Node labels are plain English (not function signatures)
- [ ] No node description exceeds 2 sentences
- [ ] Subgraph labels are approachable ("User Input"), not technical ("Composable Layer")
- [ ] Edge labels are plain verbs ("triggers"), not method names
- [ ] Every node has a `click nodeId nodeClickHandler "View details"` binding
- [ ] Diagram renders without Mermaid syntax errors
- [ ] Clicking any node opens its detail panel

### ER Diagram

- [ ] 3–8 entities
- [ ] Every relationship has explicit cardinality (`||--o{`, etc.)
- [ ] PK / FK / UK markers on the right columns
- [ ] `.entityLabel` click handlers attached after render (Mermaid `click` syntax doesn't work for ER)

### Narrated Trace

- [ ] 5–9 steps (strict min 5)
- [ ] Each step has all six fields: `kind`, `title`, `description`, `files`, `lang`, `code`
- [ ] Every `code` block is a real artifact (HTTP body, code, log, JSON, JSX) — not a concept summary
- [ ] Realistic data values throughout (no `foo`/`bar`)
- [ ] Steps are in strict execution order
- [ ] Each `title` is `N · Imperative phrase`
- [ ] Each `kind` pill is ≤ 4 words and uppercase
- [ ] No Mermaid imports in the HTML

## References

- [references/html-patterns.md](references/html-patterns.md) — Flowchart and ER template, CSS, JavaScript patterns
- [references/trace-patterns.md](references/trace-patterns.md) — Narrated-trace template, step structure, timeline rail CSS
