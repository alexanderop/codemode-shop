import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { storefrontUIPrimitives, storefrontUIPrimitiveTypes } from './ui-registry'
import { storefrontUIRenderers } from '#/features/storefront/components/canvas/render-registry'
import { createStorefrontUIBindings } from './ui-bindings'
import { createStorefrontUIPrompt } from './ui-prompt'
import type { ComponentType } from '#/features/storefront/types/ui-types'

const HANDLER_IDS = ['addToCart'] as const

const FIXTURES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  'evals',
  'fixtures',
  'programs',
)
const INTEGRATION_TEST = join(dirname(fileURLToPath(import.meta.url)), 'integration.test.ts')

describe('coverage: UI primitives', () => {
  const bindings = createStorefrontUIBindings()
  const prompt = createStorefrontUIPrompt({ zipCode: '94107' })

  it('every primitive has a binding, renderer, and prompt declaration', () => {
    for (const primitive of storefrontUIPrimitives) {
      expect(bindings[primitive.functionName], `binding: ${primitive.functionName}`).toBeDefined()
      expect(
        storefrontUIRenderers[primitive.type as ComponentType],
        `renderer: ${primitive.type}`,
      ).toBeDefined()
      expect(prompt, `prompt declaration: ${primitive.functionName}`).toContain(
        `declare function ${primitive.functionName}`,
      )
    }
  })

  it('every renderer has a corresponding registered primitive', () => {
    for (const type of Object.keys(storefrontUIRenderers) as Array<ComponentType>) {
      expect(storefrontUIPrimitiveTypes.has(type), `orphan renderer: ${type}`).toBe(true)
    }
  })
})

describe('coverage: handler ids', () => {
  it('every handlerId referenced by the system prompt has an explicit allowlist entry', () => {
    const prompt = createStorefrontUIPrompt({ zipCode: '94107' })
    for (const id of HANDLER_IDS) {
      expect(prompt, `prompt mentions handlerId '${id}'`).toContain(id)
    }
  })

  it('the CTA prompt rule names every supported handlerId', () => {
    const prompt = createStorefrontUIPrompt({ zipCode: '94107' })
    const declared = HANDLER_IDS.filter((id) => prompt.includes(`"${id}"`))
    expect(declared, 'every supported handlerId is named in the prompt').toEqual([...HANDLER_IDS])
  })
})

describe('coverage: fixture programs', () => {
  it('every fixture program file is referenced from integration.test.ts', () => {
    const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.ts'))
    const integrationSource = readFileSync(INTEGRATION_TEST, 'utf-8')
    const referenced = files.filter((f) => {
      const slug = f.replace(/\.ts$/, '')
      return integrationSource.includes(slug)
    })
    // oxlint-disable-next-line no-array-sort
    const sortedFiles = [...files].sort()
    // oxlint-disable-next-line no-array-sort
    const sortedReferenced = [...referenced].sort()
    expect(sortedReferenced, `unreferenced fixtures: ${sortedFiles.join(', ')}`).toEqual(
      sortedFiles,
    )
  })
})
