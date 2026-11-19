#!/usr/bin/env python3
"""One-off capture of catalog sample data from the public IKEA SG category pages.

Writes src/content/catalog.json. Re-run only when the sample catalog needs a refresh:
    python3 scripts/capture-catalog.py
Polite by design: sequential requests, 1.5s apart, descriptive User-Agent.
"""
import html
import json
import re
import sys
import time
import urllib.request

BASE = "https://www.ikea.com/sg/en"
UA = "Mozilla/5.0 (compatible; catalog-capture/1.0; educational-clone)"
PER_CATEGORY = 12

CATEGORIES = [
    ("storage-organisation-st001", "st001"),
    ("small-storage-organisers-st007", "st007"),
    ("sofas-armchairs-700640", "700640"),
    ("beds-mattresses-bm001", "bm001"),
    ("baby-children-bc001", "bc001"),
    ("chairs-stools-benches-fu002", "fu002"),
    ("tables-desks-fu004", "fu004"),
    ("kitchen-cabinets-appliances-ka001", "ka001"),
    ("kitchenware-tableware-kt001", "kt001"),
    ("outdoor-products-od001", "od001"),
    ("bathroom-storage-accessories-ba001", "ba001"),
    ("textiles-tl001", "tl001"),
    ("curtains-blinds-tl002", "tl002"),
    ("decoration-de001", "de001"),
    ("plants-pots-planters-pp001", "pp001"),
    ("lighting-lamps-shades-li001", "li001"),
    ("home-electronics-he001", "he001"),
    ("laundry-cleaning-accessories-lc001", "lc001"),
    ("home-improvement-hi001", "hi001"),
    ("food-beverages-fb001", "fb001"),
    ("christmas-decoration-wt001", "wt001"),
    ("lowest-price", "lowest-price"),
    ("recycled-materials-700324", "recycled-materials-700324"),
]


def fetch(slug: str) -> str:
    req = urllib.request.Request(f"{BASE}/cat/{slug}/", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=40) as resp:
        return resp.read().decode("utf-8", "replace")


def parse(page: str, category: str) -> list[dict]:
    products: dict[str, dict] = {}
    for chunk in page.split('data-product-number="')[1:]:
        number = chunk[: chunk.find('"')]
        if number in products:
            continue
        price = re.search(r'data-price="([\d.]+)"', chunk[:400])
        name = re.search(r'data-product-name="([^"]+)"', chunk[:600])
        link = re.search(r'href="https://www\.ikea\.com/sg/en/p/([a-z0-9-]+)/"', chunk)
        img = re.search(r'<img alt="([^"]+)" src="(https://www\.ikea\.com/sg/en/images/products/[^"?]+)', chunk)
        if not (price and name and link and img):
            continue
        product_name = html.unescape(name.group(1))
        desc = re.search(r'listing-price-module__description"><span aria-hidden="true">([^<]+)', chunk)
        if not desc:
            continue
        type_desc = html.unescape(desc.group(1)).strip()
        count = re.search(r'rating-label-count">\((\d+)\)', chunk[:12000])
        rating = re.search(r"Review: ([\d.]+) out of 5 stars", chunk[:12000])
        products[number] = {
            "articleNo": number,
            "slug": link.group(1),
            "name": product_name,
            "typeDesc": type_desc,
            "priceCents": round(float(price.group(1)) * 100),
            "image": img.group(2),
            "rating": float(rating.group(1)) if rating else None,
            "reviewCount": int(count.group(1)) if count else 0,
            "category": category,
        }
        if len(products) >= PER_CATEGORY:
            break
    return list(products.values())


def main() -> int:
    catalog: dict[str, dict] = {}
    for slug, code in CATEGORIES:
        try:
            items = parse(fetch(slug), slug)
        except Exception as exc:  # network/parse failure must be visible, not silent
            print(f"FAILED {slug}: {exc}", file=sys.stderr)
            return 1
        print(f"{slug}: {len(items)} products")
        for item in items:
            # A product can appear in several listings; keep first, record every collection.
            entry = catalog.setdefault(item["articleNo"], {**item, "collections": []})
            if slug not in entry["collections"]:
                entry["collections"].append(slug)
        time.sleep(1.5)
    with open("src/content/catalog.json", "w", encoding="utf-8") as fh:
        json.dump(list(catalog.values()), fh, ensure_ascii=False, indent=1)
    print(f"total unique products: {len(catalog)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
