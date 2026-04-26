export type ShortcutGroup = 'global' | 'navigation' | 'storekeeper'

export type Shortcut = {
  keys: ReadonlyArray<string>
  description: string
  group: ShortcutGroup
}

export const SHORTCUT_GROUP_LABELS: Record<ShortcutGroup, string> = {
  global: 'Global',
  navigation: 'Navigation',
  storekeeper: 'Storekeeper',
}

export const SHORTCUTS: ReadonlyArray<Shortcut> = [
  { keys: ['⌘K'], description: 'Toggle Storekeeper', group: 'global' },
  { keys: ['?'], description: 'Show keyboard shortcuts', group: 'global' },
  { keys: ['G', 'H'], description: 'Go to home', group: 'navigation' },
  { keys: ['G', 'C'], description: 'Go to cart', group: 'navigation' },
  { keys: ['/'], description: 'Focus message input', group: 'storekeeper' },
  { keys: ['↵'], description: 'Send message', group: 'storekeeper' },
  { keys: ['Esc'], description: 'Stop generation', group: 'storekeeper' },
  { keys: ['R'], description: 'Retry last prompt', group: 'storekeeper' },
  { keys: ['P'], description: 'Open system prompt', group: 'storekeeper' },
  { keys: ['1'], description: 'Pick first starter prompt', group: 'storekeeper' },
  { keys: ['2'], description: 'Pick second starter prompt', group: 'storekeeper' },
  { keys: ['3'], description: 'Pick third starter prompt', group: 'storekeeper' },
]
