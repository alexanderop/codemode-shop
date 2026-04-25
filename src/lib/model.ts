import type { AnthropicChatModel } from '@tanstack/ai-anthropic'

export const storefrontModel = (process.env.STOREFRONT_MODEL ??
  'claude-haiku-4-5') as AnthropicChatModel
