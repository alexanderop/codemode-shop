import { lastUserText, type Cassette } from './types'

/**
 * A canned reply for "show me a good running shoe under $160".
 *
 * Mirrors the shape of the matching fixture program (evals/fixtures/programs/
 * happy-search-recommend.ts) but expressed as the wire-level SSE chunks the
 * browser would actually receive.
 */
export const cassette: Cassette = {
  name: 'happy-search-recommend',
  route: '/api/storefront-agent',
  match: ({ body }) => /running|run\b|jog|pegasus/i.test(lastUserText(body)),
  chunks: [
    { type: 'text', delta: 'Looking for a match', delayMs: 50 },
    {
      type: 'ui',
      event: {
        op: 'add',
        type: 'productCard',
        id: 'card-shoe-01',
        props: {
          productId: 'shoe-01',
          name: 'Pegasus 41',
          brand: 'Nike',
          price: 139,
          imageUrl: 'https://example.com/pegasus.png',
          rating: 4.6,
          highlight: true,
        },
      },
      delayMs: 80,
    },
    {
      type: 'ui',
      event: {
        op: 'add',
        type: 'ctaButton',
        id: 'cta',
        parentId: 'card-shoe-01',
        props: {
          label: 'Add Pegasus 41 to cart',
          handlerId: 'addToCart',
          payload: { productId: 'shoe-01', size: '10' },
        },
      },
      delayMs: 60,
    },
    { type: 'text', delta: '. Try the Pegasus 41 — best match at $139.', delayMs: 30 },
  ],
}
