import type { AnthropicChatModel } from '@tanstack/ai-anthropic'

export const storefrontModel = (process.env.STOREFRONT_MODEL ??
  'claude-sonnet-4-6') as AnthropicChatModel
