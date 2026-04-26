import { createFileRoute } from '@tanstack/react-router'
import Content from '#/features/docs/content/ui-vocabulary.mdx'

export const Route = createFileRoute('/docs/ui-vocabulary')({ component: Content })
