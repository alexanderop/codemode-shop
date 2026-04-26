import { lastUserText, type Cassette } from './types'

/**
 * Worst-case streaming pattern: a loading skeleton that lingers, then resolves
 * after several text deltas. Used to verify the canvas clears the skeleton in
 * the right order and never leaves a stuck state.
 */
export const cassette: Cassette = {
  name: 'slow-streaming',
  route: '/api/storefront-agent',
  match: ({ body }) => /slow|wait|loading/i.test(lastUserText(body)),
  chunks: [
    {
      type: 'ui',
      event: { op: 'add', type: 'loading', id: 'l1', props: { label: 'Searching…' } },
      delayMs: 50,
    },
    { type: 'text', delta: 'Hmm', delayMs: 250 },
    { type: 'text', delta: ', let me think', delayMs: 250 },
    { type: 'text', delta: '…', delayMs: 250 },
    {
      type: 'ui',
      event: {
        op: 'add',
        type: 'productCard',
        id: 'card-shoe-02',
        props: {
          productId: 'shoe-02',
          name: 'Bondi 9',
          brand: 'Hoka',
          price: 165,
          imageUrl: 'https://example.com/bondi.png',
        },
      },
      delayMs: 200,
    },
    { type: 'ui', event: { op: 'remove', id: 'l1' }, delayMs: 50 },
    {
      type: 'ui',
      event: {
        op: 'add',
        type: 'ctaButton',
        id: 'cta',
        parentId: 'card-shoe-02',
        props: {
          label: 'Add Bondi to cart',
          handlerId: 'addToCart',
          payload: { productId: 'shoe-02', size: '10' },
        },
      },
      delayMs: 80,
    },
    { type: 'text', delta: ' Bondi at $165 should fit.', delayMs: 50 },
  ],
}
