import { createFileRoute } from '@tanstack/react-router'
import Content from '#/features/docs/content/skills.mdx'

export const Route = createFileRoute('/docs/skills')({ component: Content })
