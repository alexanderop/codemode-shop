# Agent prompt rules worth preserving

From `api.storefront-agent.ts`:

- The primary CTA **must** use `id: 'cta'` (the handler targets that exact id with `ui_update`).
- The LLM is instructed to do everything in one `execute_typescript` call — don't change that without also adjusting `agentLoopStrategy` / handler timing. See [[architecture/tanstack-ai/agent-loop-strategies]] for the strategies these prompts assume.
