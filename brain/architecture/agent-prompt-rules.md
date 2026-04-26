# Agent prompt rules worth preserving

From `STOREFRONT_PROMPT` (`src/app/routes/api.storefront-agent.ts`):

- The primary CTA **must** use `id: 'cta'`. The hard-coded handler at `/api/storefront-handler` targets that exact id with `ui_update` after a successful add. See [[architecture/request-flow]].
- The model is instructed to do everything in one `execute_typescript` call — don't change that without also adjusting the agent loop strategy. See [[architecture/tanstack-ai/agent-loop-strategies]].
