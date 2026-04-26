import { createFileRoute } from '@tanstack/react-router'
import Content from '#/features/docs/content/tools.mdx'

export const Route = createFileRoute('/docs/tools')({ component: Content })
