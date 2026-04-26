import { Fragment, useMemo } from 'react'
import { Keyboard } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Kbd } from '#/components/ui/kbd'
import {
  SHORTCUT_GROUP_LABELS,
  SHORTCUTS,
  type Shortcut,
  type ShortcutGroup,
} from '#/lib/shortcuts'

function groupShortcuts(): ReadonlyArray<[ShortcutGroup, ReadonlyArray<Shortcut>]> {
  const map = new Map<ShortcutGroup, Array<Shortcut>>()
  for (const s of SHORTCUTS) {
    const list = map.get(s.group) ?? []
    list.push(s)
    map.set(s.group, list)
  }
  return [...map.entries()]
}

export function KeyboardCheatsheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const groups = useMemo(groupShortcuts, [])
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-primary" />
            Keyboard shortcuts
          </SheetTitle>
          <SheetDescription>
            Press any time. Tap <Kbd>?</Kbd> to reopen this list.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
          {groups.map(([group, items]) => (
            <section key={group} className="space-y-2">
              <h3 className="text-mini font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                {SHORTCUT_GROUP_LABELS[group]}
              </h3>
              <ul className="divide-y divide-border rounded-md border">
                {items.map((s) => (
                  <li
                    key={s.description}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <span className="text-sm text-foreground">{s.description}</span>
                    <span className="flex items-center gap-1">
                      {s.keys.map((k, i) => (
                        <Fragment key={k}>
                          {i > 0 && <span className="text-[10px] text-fg-subtle">then</span>}
                          <Kbd>{k}</Kbd>
                        </Fragment>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
