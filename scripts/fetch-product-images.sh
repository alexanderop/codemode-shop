#!/usr/bin/env bash
# Downloads sneaker photos from Unsplash (free under the Unsplash License) into
# public/products/<id>.jpg. Re-run to refresh; existing files are overwritten.
set -euo pipefail

OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/public/products"
mkdir -p "$OUT_DIR"

# id -> Unsplash image URL (without query). One sneaker photo per product.
URLS=(
  "shoe-01|https://images.unsplash.com/photo-1542291026-7eec264c27ff"
  "shoe-02|https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa"
  "shoe-03|https://images.unsplash.com/photo-1562183241-b937e95585b6"
  "shoe-04|https://images.unsplash.com/photo-1597892657493-6847b9640bac"
  "shoe-05|https://images.unsplash.com/photo-1543508282-6319a3e2621f"
  "shoe-06|https://images.unsplash.com/photo-1491553895911-0055eca6402d"
  "shoe-07|https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77"
  "shoe-08|https://images.unsplash.com/photo-1571008887538-b36bb32f4571"
  "shoe-09|https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111"
  "shoe-10|https://images.unsplash.com/photo-1571601035754-5c927f2d7edc"
  "shoe-11|https://images.unsplash.com/photo-1460353581641-37baddab0fa2"
  "shoe-12|https://images.unsplash.com/photo-1560769629-975ec94e6a86"
  "shoe-13|https://images.unsplash.com/photo-1562424995-2efe650421dd"
  "shoe-14|https://images.unsplash.com/photo-1556906781-9a412961c28c"
  "shoe-15|https://images.unsplash.com/photo-1585944672394-4c58a015c1fb"
  "shoe-16|https://images.unsplash.com/photo-1588361861040-ac9b1018f6d5"
  "shoe-17|https://images.unsplash.com/photo-1469395446868-fb6a048d5ca3"
  "shoe-18|https://images.unsplash.com/photo-1709258228137-19a8c193be39"
  "shoe-19|https://images.unsplash.com/photo-1602190420103-683df5093e86"
  "shoe-20|https://images.unsplash.com/photo-1639843093167-ed40b985c01e"
  "shoe-21|https://images.unsplash.com/photo-1587587448924-b5a1db520d29"
  "shoe-22|https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a"
  "shoe-23|https://images.unsplash.com/photo-1618677831708-0e7fda3148b4"
  "shoe-24|https://images.unsplash.com/photo-1603787081207-362bcef7c144"
  "shoe-25|https://images.unsplash.com/photo-1600185365483-26d7a4cc7519"
  "shoe-26|https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2"
  "shoe-27|https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62"
  "shoe-28|https://images.unsplash.com/photo-1605348532760-6753d2c43329"
  "shoe-29|https://images.unsplash.com/photo-1552346154-21d32810aba3"
  "shoe-30|https://images.unsplash.com/photo-1633464129147-777bdcc97c1d"
)

for entry in "${URLS[@]}"; do
  id="${entry%%|*}"
  url="${entry#*|}"
  out="$OUT_DIR/$id.jpg"
  echo "→ $id"
  curl -sSL --fail "${url}?w=800&h=800&fit=crop&q=80&auto=format" -o "$out"
done

echo "✓ Downloaded ${#URLS[@]} images to $OUT_DIR"
