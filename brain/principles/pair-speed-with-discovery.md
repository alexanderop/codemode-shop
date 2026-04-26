# Pair Speed With Discovery

For every meaningful action in a UI, ship a fast path (keyboard shortcut, command menu) _and_ a discovery path (button, tooltip, context menu) for the same outcome. Never force users to choose between fluent and findable.

**Why:** Speed compounds. A user doing hundreds of actions a day reaps dramatic total savings from per-action improvements that feel invisible — but only if they actually discover the shortcut. Manual-only documentation leaves shortcuts unused; keyboard-only interfaces create a learning cliff that kills adoption. Linear's resolution is to make _every slow path advertise the fast path_ — buttons display their shortcut, tooltips and context menus surface mnemonics inline, the command menu (Cmd+K) catches anything forgotten. The slow paths teach the fast paths, so new users grow into power users passively without ever being trained.

Origin: Linear's keyboard model — _"your keyboard is the fastest method for using Linear"_, paired with _"contextual menus are also a great tool for onboarding and teaching people how to use our popular keyboard shortcuts."_

**Pattern:**

- **Multiple pathways, one action.** Button + shortcut + command menu + right-click context menu. Same outcome, different speeds; the user picks based on which they remember.
- **Mnemonic clusters, not arbitrary keys.** Group shortcuts by prefix so they're learnable as a system: Linear uses `G` then `I` for _go to Inbox_, `O` then `P` for _open Projects_, `C` for _create_. Patterns scale; random bindings don't.
- **Inline teaching.** Every slow path shows the fast path next to it — tooltips, hover hints, context menus. Muscle memory builds by osmosis, not by reading a help page.
- **Searchable escape hatch.** A global command menu (Cmd+K, `?` for help) lets users find any action by name. Nobody has to memorize everything; forgetting is cheap.
- **Rank by frequency.** Bind shortcuts to actions done hundreds of times, not the rare ones. The rare ones live in the command menu — keeping the keyboard namespace uncluttered for the hot path.
- **Design for the 100th interaction.** When an action repeats daily, micro-savings compound; optimize the hot path aggressively and tolerate verbosity in the cold path.
- **The principle generalizes beyond keys.** Tool APIs, CLI flags, and agent affordances all benefit from the same shape: a terse expert form, a verbose discoverable form, and inline cross-references between them.
