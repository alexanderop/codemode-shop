import { z } from 'zod'
import { toolDefinition } from '@tanstack/ai'
import type { ServerTool, ToolExecutionContext } from '@tanstack/ai'
import { classifySkillCode } from '#/features/storefront/api/skill-classifier'
import { getSkillStorageForSession } from '#/features/storefront/api/skill-storage'
import type { SessionId } from '#/lib/session-context'

const registerInputSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/, 'name must be snake_case'),
  description: z.string().min(1),
  code: z.string().min(1),
  inputSchema: z.string().describe('JSON Schema (stringified) of the input'),
  outputSchema: z.string().describe('JSON Schema (stringified) of the return value'),
  usageHints: z.array(z.string()).default([]),
})

const registerOutputSchema = z.object({
  registered: z.boolean(),
  name: z.string().optional(),
  error: z.string().optional(),
})

function parseSchema(raw: string, field: string): Record<string, unknown> {
  const parsed = JSON.parse(raw) as unknown
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${field} must be a JSON object`)
  }
  return parsed as Record<string, unknown>
}

export function createRegisterSkillTool(
  sessionId: SessionId,
): ServerTool<typeof registerInputSchema, typeof registerOutputSchema, 'register_skill'> {
  return toolDefinition({
    name: 'register_skill',
    description:
      'Save the just-completed pattern as a reusable shortcut for THIS shopper so future similar queries can skip execute_typescript. Call ONCE per turn, only after a successful run, only when the pattern is likely to recur. Skills must be read-only — never include cart/checkout calls.',
    inputSchema: registerInputSchema,
    outputSchema: registerOutputSchema,
  }).server(async (input, context?: ToolExecutionContext) => {
    const classification = classifySkillCode(input.code)
    if (classification.kind === 'mutating') {
      return {
        registered: false,
        error: `Skill rejected — references disallowed mutating tokens: ${classification.disallowed.join(', ')}.`,
      }
    }
    let inputSchema: Record<string, unknown>
    let outputSchema: Record<string, unknown>
    try {
      inputSchema = parseSchema(input.inputSchema, 'inputSchema')
      outputSchema = parseSchema(input.outputSchema, 'outputSchema')
    } catch (err) {
      return { registered: false, error: (err as Error).message }
    }

    const storage = getSkillStorageForSession(sessionId)
    const existing = await storage.get(input.name)
    if (existing) {
      return {
        registered: false,
        error: `A skill named '${input.name}' already exists. Pick a different name.`,
      }
    }

    const skill = await storage.save({
      id: input.name,
      name: input.name,
      description: input.description,
      code: input.code,
      inputSchema,
      outputSchema,
      usageHints: input.usageHints ?? [],
      dependsOn: [],
      trustLevel: 'trusted',
      stats: { executions: 0, successRate: 1 },
    })

    context?.emitCustomEvent?.('skill:registered', {
      name: skill.name,
      description: skill.description,
    })

    return { registered: true, name: skill.name }
  })
}
