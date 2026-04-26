import { Link } from '@tanstack/react-router'

const sections: ReadonlyArray<{
  title: string
  items: ReadonlyArray<{ title: string; to: string }>
}> = [
  {
    title: 'Overview',
    items: [{ title: 'Introduction', to: '/docs' }],
  },
  {
    title: 'Background',
    items: [
      { title: 'TanStack AI primer', to: '/docs/tanstack-ai' },
      { title: 'Tools & type stubs', to: '/docs/tools' },
      { title: 'Sandbox & events', to: '/docs/sandbox' },
    ],
  },
  {
    title: 'Concepts',
    items: [
      { title: 'Code mode', to: '/docs/code-mode' },
      { title: 'UI vocabulary', to: '/docs/ui-vocabulary' },
      { title: 'Skills', to: '/docs/skills' },
    ],
  },
  {
    title: 'Reference',
    items: [{ title: 'Architecture', to: '/docs/architecture' }],
  },
]

export function DocsSidebar() {
  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <nav className="sticky top-24 flex flex-col gap-6">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-1.5">
            <div className="eyebrow eyebrow-accent px-3">{section.title}</div>
            <ul className="flex flex-col gap-px">
              {section.items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    activeOptions={{ exact: true }}
                    className="text-tag block rounded-md px-3 py-1.5 font-medium text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                    activeProps={{
                      className:
                        'text-tag block rounded-md px-3 py-1.5 font-medium bg-surface-2 text-foreground',
                    }}
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
