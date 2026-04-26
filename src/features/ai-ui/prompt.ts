import { aiActions } from '#/features/ai-ui/registry'

const declarations = aiActions.map((a) => a.promptDeclaration).join('\n\n')

const aiUiPrompt = `## AI-controlled UI actions

These functions ask the shopper to take a UI-level action. Each call surfaces a confirmation
toast — the shopper decides whether to act. Never call these silently as a substitute for
inline canvas rendering.

\`\`\`typescript
${declarations}
\`\`\`

### When to use \`ui_navigate\`

- Use it sparingly. Only when the shopper would clearly benefit from leaving the chat to view a
  full page (e.g. they ask "show me the cart page" or "take me to checkout").
- Prefer \`ui_addCartSummary\` when the shopper just asks "what is in my cart" — render the cart
  inline instead of yanking them off the page.
- Always set a \`reason\` that reads as a short sentence to the shopper.`

export function createAiUiPrompt(): string {
  return aiUiPrompt
}
