import { createFileRoute } from '@tanstack/react-router'
import Content from '#/features/docs/content/intro.mdx'

export const Route = createFileRoute('/docs/')({ component: Content })
