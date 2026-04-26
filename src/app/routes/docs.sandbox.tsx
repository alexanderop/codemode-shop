import { createFileRoute } from '@tanstack/react-router'
import Content from '#/features/docs/content/sandbox.mdx'

export const Route = createFileRoute('/docs/sandbox')({ component: Content })
