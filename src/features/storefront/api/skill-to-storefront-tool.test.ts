// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createNodeIsolateDriver } from '@tanstack/ai-isolate-node'
import { createMemorySkillStorage } from '@tanstack/ai-code-mode-skills/storage'
import type { Skill } from '@tanstack/ai-code-mode-skills'
import { sessionContext, type SessionId } from '#/lib/session-context'
import { buildStorefrontSkillTool } from './skill-to-storefront-tool'
import { mkContext } from '#/features/storefront/testing/mk-context'

const TIMEOUT_MS = 15_000

function makeSkill(overrides: Partial<Skill>): Skill {
  return {
    id: 'sk-1',
    name: 'demo',
    description: 'demo',
    code: 'return 1',
    inputSchema: { type: 'object', properties: {} },
    outputSchema: { type: 'object', properties: { ok: { type: 'boolean' } } },
    usageHints: [],
    dependsOn: [],
    trustLevel: 'trusted',
    stats: { executions: 0, successRate: 1 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('buildStorefrontSkillTool', () => {
  it('emits storefront:ui events when the skill calls ui_addProductCard', async () => {
    const driver = createNodeIsolateDriver({ timeout: TIMEOUT_MS, memoryLimit: 64 })
    const storage = createMemorySkillStorage()
    const skill = makeSkill({
      name: 'render_card',
      code: `
        await ui_addProductCard({
          id: 'p1',
          productId: 'sku-1',
          name: 'Runner X',
          brand: 'Acme',
          price: 129,
          imageUrl: 'https://x/y.png',
        })
        return { ok: true }
      `,
    })
    const tool = buildStorefrontSkillTool({ skill, driver, storage, timeout: TIMEOUT_MS })

    const { events, ctx } = mkContext()
    await sessionContext.run({ sessionId: 'test' as SessionId }, () => tool.execute!({}, ctx))

    const uiEvents = events.filter((e) => e.name === 'storefront:ui')
    expect(uiEvents).toHaveLength(1)
    expect(uiEvents[0]?.value).toMatchObject({
      op: 'add',
      type: 'productCard',
      id: 'p1',
    })
  })

  it('exposes read-only catalog tools as external_*', async () => {
    const driver = createNodeIsolateDriver({ timeout: TIMEOUT_MS, memoryLimit: 64 })
    const storage = createMemorySkillStorage()
    const skill = makeSkill({
      name: 'do_search',
      code: `
        const result = await external_searchProducts({ category: 'Running', limit: 1 })
        return { count: result.totalMatches }
      `,
    })
    const tool = buildStorefrontSkillTool({ skill, driver, storage, timeout: TIMEOUT_MS })

    const { ctx } = mkContext()
    const out = (await sessionContext.run({ sessionId: 'test' as SessionId }, () =>
      tool.execute!({}, ctx),
    )) as { count: number }

    expect(typeof out.count).toBe('number')
    expect(out.count).toBeGreaterThan(0)
  })

  it('does NOT inject cart/order bindings — calling external_addToCart from a skill throws', async () => {
    const driver = createNodeIsolateDriver({ timeout: TIMEOUT_MS, memoryLimit: 64 })
    const storage = createMemorySkillStorage()
    const skill = makeSkill({
      name: 'no_cart',
      code: `
        try {
          await external_addToCart({ productId: 'sku-1', size: '10', width: 'standard', quantity: 1 })
          return { ok: true }
        } catch (err) {
          return { ok: false, error: String(err) }
        }
      `,
    })
    const tool = buildStorefrontSkillTool({ skill, driver, storage, timeout: TIMEOUT_MS })

    const { ctx } = mkContext()
    const out = (await sessionContext.run({ sessionId: 'test' as SessionId }, () =>
      tool.execute!({}, ctx),
    )) as { ok: boolean; error?: string }

    expect(out.ok).toBe(false)
    // external_addToCart should not be a defined function in the isolate
    expect(out.error).toMatch(/external_addToCart/)
  })
})
