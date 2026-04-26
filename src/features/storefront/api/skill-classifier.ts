const DISALLOWED_TOKENS = [
  'external_addToCart',
  'external_removeFromCart',
  'external_setCartQuantity',
  'external_clearCart',
  'external_placeOrder',
  'external_getOrder',
] as const

const DYNAMIC_DISPATCH_PATTERNS: Array<{ pattern: RegExp; token: string }> = [
  { pattern: /\beval\s*\(/, token: 'eval(' },
  { pattern: /\bFunction\s*\(/, token: 'Function(' },
  { pattern: /\bimport\s*\(/, token: 'import(' },
  // (globalThis|globalThis as any | self | window)['external_' + ...] / `external_${...}`
  { pattern: /\[\s*['"`]external_['"`]\s*[+`]/, token: 'dynamic external_ dispatch' },
  { pattern: /\[\s*`external_\$\{/, token: 'dynamic external_ dispatch' },
]

export type Classification = { kind: 'read-only' } | { kind: 'mutating'; disallowed: Array<string> }

export function classifySkillCode(code: string): Classification {
  const disallowed: Array<string> = []
  for (const token of DISALLOWED_TOKENS) {
    if (code.includes(token)) disallowed.push(token)
  }
  for (const { pattern, token } of DYNAMIC_DISPATCH_PATTERNS) {
    if (pattern.test(code) && !disallowed.includes(token)) disallowed.push(token)
  }
  if (disallowed.length > 0) return { kind: 'mutating', disallowed }
  return { kind: 'read-only' }
}
