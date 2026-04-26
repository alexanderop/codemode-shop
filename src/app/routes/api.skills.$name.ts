// Raw file-based route today: simple session-scoped DELETE for skill cleanup.
// This one is in-app RPC and could plausibly migrate to `createServerFn` later;
// kept as a REST handler for now because the DELETE-with-path-param shape maps
// cleanly and there is no client-side type pressure. Revisit when a second skill
// mutation appears. See [[brain/architecture/client-server-rpc]].
import { createFileRoute } from '@tanstack/react-router'
import { withSession } from '#/lib/session'
import { sessionContext } from '#/lib/session-context'
import { getSkillStorageForSession } from '#/features/storefront/api/skill-storage'

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
}

export const Route = createFileRoute('/api/skills/$name')({
  server: {
    handlers: {
      DELETE: ({ request, params }) =>
        withSession(request, async () => {
          const { sessionId } = sessionContext.get()
          const storage = getSkillStorageForSession(sessionId)
          const removed = await storage.delete(params.name)
          if (!removed) {
            return jsonResponse({ error: 'not found' }, { status: 404 })
          }
          return jsonResponse({ ok: true })
        }),
    },
  },
})
