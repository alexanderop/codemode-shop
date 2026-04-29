export type ShoeCategory = 'Running' | 'Lifestyle' | 'Trail' | 'Basketball' | 'Training' | 'Racing'

export const WIDTHS = ['narrow', 'standard', 'wide'] as const
export type Width = (typeof WIDTHS)[number]

export interface Product {
  id: string
  name: string
  brand: string
  price: number
  category: ShoeCategory
  color: string
  imageUrl: string
  sizes: Array<string>
  widths: Array<Width>
  rating: number
  reviewCount: number
}

export interface Review {
  productId: string
  rating: number
  commonPraise: Array<string>
  commonComplaints: Array<string>
}

export interface StockRow {
  productId: string
  size: string
  width: Width
  quantity: number
}

export interface PricePoint {
  date: string
  price: number
}

const img = (id: string) => `/products/${id}.jpg`

export const PRODUCTS: Array<Product> = [
  {
    id: 'shoe-01',
    name: 'Air Max 90',
    brand: 'Nike',
    price: 130,
    category: 'Lifestyle',
    color: 'White/Red',
    imageUrl: img('shoe-01'),
    sizes: ['7', '8', '9', '10', '11', '12', '13'],
    widths: ['standard'],
    rating: 4.6,
    reviewCount: 2143,
  },
  {
    id: 'shoe-02',
    name: 'Ultra Boost 22',
    brand: 'Adidas',
    price: 190,
    category: 'Running',
    color: 'Core Black',
    imageUrl: img('shoe-02'),
    sizes: ['7', '8', '9', '10', '11', '12', '13', '14'],
    widths: ['standard', 'wide'],
    rating: 4.5,
    reviewCount: 1820,
  },
  {
    id: 'shoe-03',
    name: 'Gel-Kayano 30',
    brand: 'Asics',
    price: 160,
    category: 'Running',
    color: 'Black/Electric Blue',
    imageUrl: img('shoe-03'),
    sizes: ['8', '9', '10', '11', '12', '13'],
    widths: ['standard', 'wide'],
    rating: 4.7,
    reviewCount: 3021,
  },
  {
    id: 'shoe-04',
    name: 'Fresh Foam X 1080v13',
    brand: 'New Balance',
    price: 165,
    category: 'Running',
    color: 'Navy/Red',
    imageUrl: img('shoe-04'),
    sizes: ['8', '9', '10', '11', '12', '13', '14'],
    widths: ['narrow', 'standard', 'wide'],
    rating: 4.6,
    reviewCount: 1455,
  },
  {
    id: 'shoe-05',
    name: 'Suede Classic XXI',
    brand: 'Puma',
    price: 75,
    category: 'Lifestyle',
    color: 'Peacoat/White',
    imageUrl: img('shoe-05'),
    sizes: ['7', '8', '9', '10', '11', '12'],
    widths: ['standard'],
    rating: 4.4,
    reviewCount: 890,
  },
  {
    id: 'shoe-06',
    name: 'Chuck Taylor All Star',
    brand: 'Converse',
    price: 60,
    category: 'Lifestyle',
    color: 'Optical White',
    imageUrl: img('shoe-06'),
    sizes: ['6', '7', '8', '9', '10', '11', '12', '13'],
    widths: ['standard'],
    rating: 4.5,
    reviewCount: 5421,
  },
  {
    id: 'shoe-07',
    name: 'Old Skool',
    brand: 'Vans',
    price: 70,
    category: 'Lifestyle',
    color: 'Black/White',
    imageUrl: img('shoe-07'),
    sizes: ['6', '7', '8', '9', '10', '11', '12', '13'],
    widths: ['standard'],
    rating: 4.6,
    reviewCount: 4120,
  },
  {
    id: 'shoe-08',
    name: 'Pegasus 41',
    brand: 'Nike',
    price: 140,
    category: 'Running',
    color: 'Volt/Black',
    imageUrl: img('shoe-08'),
    sizes: ['7', '8', '9', '10', '11', '12', '13', '14', '15'],
    widths: ['standard', 'wide'],
    rating: 4.5,
    reviewCount: 2610,
  },
  {
    id: 'shoe-09',
    name: 'Samba OG',
    brand: 'Adidas',
    price: 110,
    category: 'Lifestyle',
    color: 'White/Black/Gum',
    imageUrl: img('shoe-09'),
    sizes: ['7', '8', '9', '10', '11', '12', '13'],
    widths: ['standard'],
    rating: 4.7,
    reviewCount: 3150,
  },
  {
    id: 'shoe-10',
    name: 'GEL-1130',
    brand: 'Asics',
    price: 120,
    category: 'Lifestyle',
    color: 'White/Clay Canyon',
    imageUrl: img('shoe-10'),
    sizes: ['7', '8', '9', '10', '11', '12'],
    widths: ['standard'],
    rating: 4.4,
    reviewCount: 740,
  },
  {
    id: 'shoe-11',
    name: 'Clifton 9',
    brand: 'Hoka',
    price: 145,
    category: 'Running',
    color: 'Black/White',
    imageUrl: img('shoe-11'),
    sizes: ['8', '9', '10', '11', '12', '13', '14'],
    widths: ['standard', 'wide'],
    rating: 4.7,
    reviewCount: 4210,
  },
  {
    id: 'shoe-12',
    name: 'Speedcat OG',
    brand: 'Puma',
    price: 90,
    category: 'Lifestyle',
    color: 'Red/White',
    imageUrl: img('shoe-12'),
    sizes: ['7', '8', '9', '10', '11', '12'],
    widths: ['standard'],
    rating: 4.3,
    reviewCount: 510,
  },
  {
    id: 'shoe-13',
    name: '990v6',
    brand: 'New Balance',
    price: 200,
    category: 'Lifestyle',
    color: 'Grey',
    imageUrl: img('shoe-13'),
    sizes: ['7', '8', '9', '10', '11', '12', '13'],
    widths: ['narrow', 'standard', 'wide'],
    rating: 4.8,
    reviewCount: 1890,
  },
  {
    id: 'shoe-14',
    name: 'Air Jordan 1 Low',
    brand: 'Nike',
    price: 115,
    category: 'Basketball',
    color: 'Chicago',
    imageUrl: img('shoe-14'),
    sizes: ['7', '8', '9', '10', '11', '12', '13'],
    widths: ['standard'],
    rating: 4.7,
    reviewCount: 6320,
  },
  {
    id: 'shoe-15',
    name: 'Bondi 8',
    brand: 'Hoka',
    price: 165,
    category: 'Running',
    color: 'Coastal Sky',
    imageUrl: img('shoe-15'),
    sizes: ['8', '9', '10', '11', '12', '13', '14'],
    widths: ['standard', 'wide'],
    rating: 4.6,
    reviewCount: 2140,
  },
  {
    id: 'shoe-16',
    name: 'Gazelle',
    brand: 'Adidas',
    price: 100,
    category: 'Lifestyle',
    color: 'Collegiate Green',
    imageUrl: img('shoe-16'),
    sizes: ['7', '8', '9', '10', '11', '12', '13'],
    widths: ['standard'],
    rating: 4.5,
    reviewCount: 1310,
  },
  {
    id: 'shoe-17',
    name: 'Ghost 16',
    brand: 'Brooks',
    price: 140,
    category: 'Running',
    color: 'Peacoat/Silver',
    imageUrl: img('shoe-17'),
    sizes: ['8', '9', '10', '11', '12', '13', '14'],
    widths: ['narrow', 'standard', 'wide'],
    rating: 4.6,
    reviewCount: 1960,
  },
  {
    id: 'shoe-18',
    name: 'Cloud 5',
    brand: 'On',
    price: 150,
    category: 'Running',
    color: 'All White',
    imageUrl: img('shoe-18'),
    sizes: ['8', '9', '10', '11', '12', '13'],
    widths: ['standard'],
    rating: 4.3,
    reviewCount: 870,
  },
  {
    id: 'shoe-19',
    name: 'Cloudmonster 2',
    brand: 'On',
    price: 180,
    category: 'Running',
    color: 'Undyed/Frost',
    imageUrl: img('shoe-19'),
    sizes: ['8', '9', '10', '11', '12', '13'],
    widths: ['standard'],
    rating: 4.5,
    reviewCount: 620,
  },
  {
    id: 'shoe-20',
    name: 'Alphafly 3',
    brand: 'Nike',
    price: 260,
    category: 'Racing',
    color: 'Volt/Concord',
    imageUrl: img('shoe-20'),
    sizes: ['7', '8', '9', '10', '11', '12', '13'],
    widths: ['standard'],
    rating: 4.7,
    reviewCount: 410,
  },
  {
    id: 'shoe-21',
    name: 'Endorphin Speed 4',
    brand: 'Saucony',
    price: 170,
    category: 'Racing',
    color: 'Black/Gold',
    imageUrl: img('shoe-21'),
    sizes: ['8', '9', '10', '11', '12', '13'],
    widths: ['standard'],
    rating: 4.6,
    reviewCount: 1180,
  },
  {
    id: 'shoe-22',
    name: 'Triumph 22',
    brand: 'Saucony',
    price: 160,
    category: 'Running',
    color: 'Moonstone/Mint',
    imageUrl: img('shoe-22'),
    sizes: ['8', '9', '10', '11', '12', '13', '14'],
    widths: ['standard', 'wide'],
    rating: 4.5,
    reviewCount: 930,
  },
  {
    id: 'shoe-23',
    name: 'Nano X4',
    brand: 'Reebok',
    price: 140,
    category: 'Training',
    color: 'Core Black',
    imageUrl: img('shoe-23'),
    sizes: ['7', '8', '9', '10', '11', '12', '13'],
    widths: ['standard'],
    rating: 4.4,
    reviewCount: 720,
  },
  {
    id: 'shoe-24',
    name: 'Wave Rider 27',
    brand: 'Mizuno',
    price: 140,
    category: 'Running',
    color: 'Silver/Navy',
    imageUrl: img('shoe-24'),
    sizes: ['8', '9', '10', '11', '12', '13', '14'],
    widths: ['standard', 'wide'],
    rating: 4.5,
    reviewCount: 640,
  },
  {
    id: 'shoe-25',
    name: 'Speedgoat 5',
    brand: 'Hoka',
    price: 155,
    category: 'Trail',
    color: 'Olive/Black',
    imageUrl: img('shoe-25'),
    sizes: ['8', '9', '10', '11', '12', '13', '14'],
    widths: ['standard', 'wide'],
    rating: 4.7,
    reviewCount: 1530,
  },
  {
    id: 'shoe-26',
    name: 'Terrex Swift R3',
    brand: 'Adidas',
    price: 140,
    category: 'Trail',
    color: 'Grey/Green',
    imageUrl: img('shoe-26'),
    sizes: ['8', '9', '10', '11', '12', '13'],
    widths: ['standard'],
    rating: 4.4,
    reviewCount: 820,
  },
  {
    id: 'shoe-27',
    name: 'Fresh Foam Hierro v8',
    brand: 'New Balance',
    price: 140,
    category: 'Trail',
    color: 'Black/Red Dawn',
    imageUrl: img('shoe-27'),
    sizes: ['8', '9', '10', '11', '12', '13', '14'],
    widths: ['standard', 'wide'],
    rating: 4.5,
    reviewCount: 430,
  },
  {
    id: 'shoe-28',
    name: 'KD 17',
    brand: 'Nike',
    price: 150,
    category: 'Basketball',
    color: 'Penny Hardaway',
    imageUrl: img('shoe-28'),
    sizes: ['8', '9', '10', '11', '12', '13', '14', '15'],
    widths: ['standard'],
    rating: 4.6,
    reviewCount: 1120,
  },
  {
    id: 'shoe-29',
    name: 'Metcon 9',
    brand: 'Nike',
    price: 140,
    category: 'Training',
    color: 'Black/White',
    imageUrl: img('shoe-29'),
    sizes: ['7', '8', '9', '10', '11', '12', '13'],
    widths: ['standard'],
    rating: 4.5,
    reviewCount: 2050,
  },
  {
    id: 'shoe-30',
    name: 'Rebel v4',
    brand: 'New Balance',
    price: 140,
    category: 'Racing',
    color: 'White/Sea Salt',
    imageUrl: img('shoe-30'),
    sizes: ['8', '9', '10', '11', '12', '13'],
    widths: ['standard'],
    rating: 4.6,
    reviewCount: 560,
  },
]

const PRAISE_POOL = [
  'plush midsole',
  'true to size',
  'great arch support',
  'roomy toe box',
  'responsive ride',
  'breathable upper',
  'premium materials',
  'no break-in needed',
  'durable outsole',
  'light on foot',
]

const COMPLAINT_POOL = [
  'runs narrow',
  'laces fray early',
  'heel slips',
  'pricey',
  'hot in summer',
  'not for wide feet',
  'ugly color options',
  'tongue bunches',
  'slippery on wet',
  'tight in the midfoot',
]

function deterministicPick<T>(seed: string, arr: Array<T>, n: number): Array<T> {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const picked: Array<T> = []
  const used = new Set<number>()
  while (picked.length < n && used.size < arr.length) {
    h = (h * 1103515245 + 12345) >>> 0
    const i = h % arr.length
    if (!used.has(i)) {
      used.add(i)
      picked.push(arr[i]!)
    }
  }
  return picked
}

export const REVIEWS: Record<string, Review> = Object.fromEntries(
  PRODUCTS.map((p) => [
    p.id,
    {
      productId: p.id,
      rating: p.rating,
      commonPraise: deterministicPick(p.id + ':praise', PRAISE_POOL, 3),
      commonComplaints: deterministicPick(p.id + ':comp', COMPLAINT_POOL, 2),
    },
  ]),
)

function buildStock(): Array<StockRow> {
  const rows: Array<StockRow> = []
  for (const p of PRODUCTS) {
    for (const size of p.sizes) {
      for (const width of p.widths) {
        let seed = 0
        for (const ch of `${p.id}:${size}:${width}`) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
        const rnd = (seed % 100) / 100
        const quantity = rnd < 0.12 ? 0 : Math.floor(1 + rnd * 15)
        rows.push({ productId: p.id, size, width, quantity })
      }
    }
  }
  return rows
}

export const STOCK: Array<StockRow> = buildStock()

export const PRODUCT_BY_ID: ReadonlyMap<string, Product> = new Map(PRODUCTS.map((p) => [p.id, p]))

const STOCK_BY_KEY: ReadonlyMap<string, StockRow> = new Map(
  STOCK.map((s) => [`${s.productId}|${s.size}|${s.width}`, s]),
)

export const SEARCH_HAYSTACK: ReadonlyMap<string, string> = new Map(
  PRODUCTS.map((p) => [p.id, `${p.name} ${p.brand} ${p.category} ${p.color}`.toLowerCase()]),
)

export function findStock(productId: string, size: string, width: Width): StockRow | undefined {
  return STOCK_BY_KEY.get(`${productId}|${size}|${width}`)
}

export function buildPriceHistory(productId: string, days = 30): Array<PricePoint> {
  const product = PRODUCT_BY_ID.get(productId)
  if (!product) return []
  const today = new Date()
  const out: Array<PricePoint> = []
  let seed = 0
  for (const ch of productId) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
  for (let i = days - 1; i >= 0; i--) {
    seed = (seed * 1103515245 + 12345) >>> 0
    const noise = ((seed % 1000) / 1000 - 0.5) * 0.08
    const drift = Math.sin(i / 4) * 0.05
    const price = Math.max(
      Math.round(product.price * (1 - noise - drift)),
      Math.round(product.price * 0.7),
    )
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    out.push({ date: d.toISOString().slice(0, 10), price })
  }
  out[out.length - 1] = { date: out[out.length - 1]!.date, price: product.price }
  return out
}

export function shippingEtaDays(zipCode: string): number {
  if (!/^\d{5}$/.test(zipCode)) return 5
  const first = Number(zipCode[0])
  if (first <= 2) return 5
  if (first <= 5) return 3
  if (first <= 7) return 2
  return 4
}
