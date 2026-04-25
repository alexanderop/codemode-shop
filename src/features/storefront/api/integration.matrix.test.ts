// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { UIEvent } from '#/features/storefront/types/ui-types'
import { runProgram } from '#/features/storefront/testing/run-program'
import { uiStore } from '#/features/storefront/stores/ui-store'

import { program as happyProgram } from '../../../../evals/fixtures/programs/happy-search-recommend'
import { program as comparisonProgram } from '../../../../evals/fixtures/programs/comparison-table'
import { program as priceHistoryProgram } from '../../../../evals/fixtures/programs/price-history'
import { program as outOfStockProgram } from '../../../../evals/fixtures/programs/out-of-stock-fallback'
import { program as errorRecoveryProgram } from '../../../../evals/fixtures/programs/tool-error-recovery'
import { program as placeOrderProgram } from '../../../../evals/fixtures/programs/place-order'

const SUPPORTED_HANDLER_IDS = new Set(['addToCart'])

const fixtures = [
  { name: 'happy-search-recommend', program: happyProgram },
  { name: 'comparison-table', program: comparisonProgram },
  { name: 'price-history', program: priceHistoryProgram },
  { name: 'out-of-stock-fallback', program: outOfStockProgram },
  { name: 'tool-error-recovery', program: errorRecoveryProgram },
  { name: 'place-order', program: placeOrderProgram },
] as const

function ctaAddEvents(events: ReadonlyArray<UIEvent>): Array<Extract<UIEvent, { op: 'add' }>> {
  return events.filter(
    (e): e is Extract<UIEvent, { op: 'add' }> => e.op === 'add' && e.type === 'ctaButton',
  )
}

describe('matrix: handlerId integrity', () => {
  it.each(fixtures)(
    '$name CTAs only use known handlerIds',
    async ({ program }) => {
      const out = await runProgram(program)
      expect(out.success).toBe(true)
      const ctas = ctaAddEvents(out.uiEvents)
      expect(ctas.length).toBeGreaterThan(0)
      for (const cta of ctas) {
        const props = cta.props as { handlerId?: string }
        expect(
          SUPPORTED_HANDLER_IDS.has(props.handlerId ?? ''),
          `unknown handlerId '${props.handlerId}' on CTA ${cta.id}`,
        ).toBe(true)
      }
    },
    20_000,
  )
})

describe('matrix: no orphan parents at dispatch time', () => {
  it.each(fixtures)(
    '$name every add.parentId resolves to a node already present',
    async ({ program }) => {
      const out = await runProgram(program)
      expect(out.success).toBe(true)
      const seen = new Set<string>()
      for (const ev of out.uiEvents) {
        if (ev.op === 'add') {
          if (ev.parentId) {
            expect(seen.has(ev.parentId), `orphan parent: ${ev.id} -> ${ev.parentId}`).toBe(true)
          }
          seen.add(ev.id)
        }
      }
    },
    20_000,
  )
})

function eventShape(events: ReadonlyArray<UIEvent>): Array<string> {
  return events.filter((e) => e.op === 'add').map((e) => `${(e as { type: string }).type}#${e.id}`)
}

describe('matrix: idempotent execution', () => {
  it('happy-search-recommend produces the same shape across two runs', async () => {
    const a = await runProgram(happyProgram)
    const b = await runProgram(happyProgram)

    expect(a.success).toBe(true)
    expect(b.success).toBe(true)

    expect(eventShape(b.uiEvents)).toEqual(eventShape(a.uiEvents))
  }, 30_000)
})

describe('matrix: partial-stream coherence', () => {
  it.each(fixtures)(
    '$name every prefix of the event stream reduces without throwing',
    async ({ program }) => {
      const out = await runProgram(program)
      expect(out.success).toBe(true)

      for (let i = 0; i <= out.uiEvents.length; i++) {
        uiStore.clear()
        const prefix = out.uiEvents.slice(0, i)
        for (const ev of prefix) uiStore.dispatch(ev)
        const tree = uiStore.get().nodes
        for (const [id, node] of tree) {
          if (node.parentId) {
            expect(tree.has(node.parentId), `prefix=${i}: orphan ${id} -> ${node.parentId}`).toBe(
              true,
            )
          }
        }
      }
    },
    20_000,
  )
})
