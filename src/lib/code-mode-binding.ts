import { z } from 'zod'
import { convertSchemaToJsonSchema } from '@tanstack/ai'
import type { ToolBinding, ToolExecutionContext } from '@tanstack/ai-code-mode'

const okOutputSchema = convertSchemaToJsonSchema(z.object({ ok: z.boolean() }))

export function makeBinding<T extends z.ZodType>(
  name: string,
  description: string,
  schema: T,
  execute: (parsed: z.infer<T>, context?: ToolExecutionContext) => Promise<{ ok: boolean }>,
): ToolBinding {
  return {
    name,
    description,
    inputSchema: convertSchemaToJsonSchema(schema) ?? { type: 'object', properties: {} },
    outputSchema: okOutputSchema,
    execute: async (args: unknown, context?: ToolExecutionContext) => {
      const parsed = schema.parse(args)
      return execute(parsed, context)
    },
  }
}
