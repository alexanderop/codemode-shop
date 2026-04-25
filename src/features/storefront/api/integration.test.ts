// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { UIEvent, UINode } from '#/features/storefront/types/ui-types'
import { runProgram } from '#/features/storefront/testing/run-program'
import { uiStore } from '#/features/storefront/stores/ui-store'

import { program as happyProgram } from '../../../../evals/fixtures/programs/happy-search-recommend'
import { program as comparisonProgram } from '../../../../evals/fixtures/programs/comparison-table'
import { program as priceHistoryProgram } from '../../../../evals/fixtures/programs/price-history'
import { program as outOfStockProgram } from '../../../../evals/fixtures/programs/out-of-stock-fallback'
import { program as errorRecoveryProgram } from '../../../../evals/fixtures/programs/tool-error-recovery'
import { program as placeOrderProgram } from '../../../../evals/fixtures/programs/place-order'

interface Fixture {
  name: string
  program: string
  expectedTools: ReadonlyArray<string>
  expectedTypes: ReadonlyArray<string>
}

const fixtures: ReadonlyArray<Fixture> = [
  {
    name: 'happy-search-recommend',
    program: happyProgram,
    expectedTools: ['searchProducts', 'getProduct'],
    expectedTypes: ['productCard', 'ctaButton'],
  },
  {
    name: 'comparison-table',
    program: comparisonProgram,
    expectedTools: ['searchProducts', 'getProduct'],
    expectedTypes: ['comparisonTable', 'ctaButton'],
  },
  {
    name: 'price-history',
    program: priceHistoryProgram,
    expectedTools: ['searchProducts', 'getProduct', 'getPriceHistory'],
    expectedTypes: ['productCard', 'priceSparkline', 'ctaButton'],
  },
  {
    name: 'out-of-stock-fallback',
    program: outOfStockProgram,
    expectedTools: ['searchProducts', 'getProduct', 'getStockAndShipping'],
    expectedTypes: ['productCard', 'stockPill', 'ctaButton'],
  },
  {
    name: 'tool-error-recovery',
    program: errorRecoveryProgram,
    // The bad-id getProduct throws inside the isolate's try/catch, so it never
    // becomes a successful tool call. We only assert on the recovery path.
    expectedTools: ['searchProducts', 'getProduct'],
    expectedTypes: ['productCard', 'ctaButton'],
  },
  {
    name: 'place-order',
    program: placeOrderProgram,
    expectedTools: ['searchProducts', 'getProduct', 'addToCart', 'placeOrder'],
    expectedTypes: ['productCard', 'ctaButton', 'orderConfirmation'],
  },
]

function reduceTree(events: ReadonlyArray<UIEvent>): Map<string, UINode> {
  uiStore.clear()
  for (const ev of events) uiStore.dispatch(ev)
  return uiStore.get().nodes
}

function uniqueIds(events: ReadonlyArray<UIEvent>): Array<string> {
  return events.flatMap((e) => (e.op === 'add' ? [e.id] : []))
}

describe.each(fixtures)('integration: $name', ({ program, expectedTools, expectedTypes }) => {
  it('produces a renderable storefront tree', async () => {
    const out = await runProgram(program)

    // 1. program executed
    expect(out.success).toBe(true)
    expect(out.error).toBeUndefined()

    // 2. tool-set match (set semantics, not sequence)
    const toolSet = new Set(out.toolCalls)
    for (const expected of expectedTools) {
      expect(toolSet, `missing tool: ${expected}`).toContain(expected)
    }

    // 3. expected UI types appear at least once
    const typeSet = new Set(out.uiEvents.flatMap((e) => (e.op === 'add' ? [e.type] : [])))
    for (const expected of expectedTypes) {
      expect(typeSet, `missing UI type: ${expected}`).toContain(expected)
    }

    // 4. CTA invariant — exactly one event introduces id 'cta'
    const ctaAdds = out.uiEvents.filter((e) => e.op === 'add' && e.id === 'cta')
    expect(ctaAdds, 'CTA invariant: must add id "cta" exactly once').toHaveLength(1)

    // 5. no duplicate add IDs
    const addedIds = uniqueIds(out.uiEvents)
    expect(new Set(addedIds).size).toBe(addedIds.length)

    // 6. parentId integrity — every parentId references an existing node
    const tree = reduceTree(out.uiEvents)
    for (const [id, node] of tree) {
      if (node.parentId) {
        expect(tree.has(node.parentId), `${id}.parentId='${node.parentId}' missing`).toBe(true)
      }
    }
  }, 20_000)
})
