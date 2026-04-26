import { createFileRoute } from '@tanstack/react-router'
import Content from '#/features/docs/content/code-mode.mdx'

export const Route = createFileRoute('/docs/code-mode')({ component: Content })
