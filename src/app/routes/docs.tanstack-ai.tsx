import { createFileRoute } from '@tanstack/react-router'
import Content from '#/features/docs/content/tanstack-ai.mdx'

export const Route = createFileRoute('/docs/tanstack-ai')({ component: Content })
