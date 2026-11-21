#!/usr/bin/env bash
# End-to-end HTTP smoke test: pages, validation, cart → checkout → track-order.
# Usage: BASE_URL=http://127.0.0.1:3000 scripts/smoke.sh   (server must already be running)
#
# NOTE: the session cookie is Secure in production, and curl only returns Secure cookies to
# plain-HTTP hosts on localhost/127.0.0.1 — point BASE_URL at a loopback host (or use https://).
set -euo pipefail

BASE="${BASE_URL:-http://127.0.0.1:3000}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT
failures=0

check() { # check <label> <expected> <actual>
  if [[ "$2" == "$3" ]]; then echo "ok   $1"; else echo "FAIL $1 (expected $2, got $3)"; failures=$((failures + 1)); fi
}
status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
json() { curl -s -H 'Content-Type: application/json' "$@"; }
field() { python3 -c "import sys,json;print(json.load(sys.stdin)$1)"; }

check "home" 200 "$(status "$BASE/")"
check "health" 200 "$(status "$BASE/api/health")"
check "category" 200 "$(status "$BASE/cat/sofas-armchairs-700640")"
check "unknown category" 404 "$(status "$BASE/cat/nope")"
check "hostile listing params fall back" 200 "$(status "$BASE/cat/beds-mattresses-bm001?sort=x&page=-9&min=zz")"
check "search" 200 "$(status "$BASE/search?q=sofa")"
check "content page via redirect" 200 "$(status -L "$BASE/campaigns/christmas/")"

# Session-018 S18-08: the prerequisite assignments below used to abort under set -e with a
# bare python/curl traceback — no FAIL row, no summary line. Each now fails with a labeled
# line so a mid-run outage (dead server, error envelope, seeded-DB loss) reads like any
# other failed check. The check() rows were already failure-tolerant; only these
# assignment-level substitutions needed wrapping.
PRODUCT_JSON="$(curl -s "$BASE/api/search?q=billy")" || { echo "FAIL prerequisite: search API unreachable"; exit 1; }
PRODUCT_ID="$(echo "$PRODUCT_JSON" | field "['products'][0]['id']")" || { echo "FAIL prerequisite: no product id in search response"; exit 1; }
PRODUCT_SLUG="$(echo "$PRODUCT_JSON" | field "['products'][0]['slug']")" || { echo "FAIL prerequisite: no product slug in search response"; exit 1; }
check "product page" 200 "$(status "$BASE/p/$PRODUCT_SLUG")"

check "add to cart" 201 "$(status -c "$JAR" -b "$JAR" -H 'Content-Type: application/json' -d "{\"productId\":$PRODUCT_ID,\"quantity\":2}" "$BASE/api/cart")"
check "quantity clamps at 99" 99 "$(json -b "$JAR" -d "{\"productId\":$PRODUCT_ID,\"quantity\":98}" "$BASE/api/cart" | field "['lines'][0]['quantity']")"
check "invalid body rejected" 422 "$(status -b "$JAR" -H 'Content-Type: application/json' -d '{"productId":"x"}' "$BASE/api/cart")"
check "unknown product rejected" 404 "$(status -b "$JAR" -H 'Content-Type: application/json' -d '{"productId":999999}' "$BASE/api/cart")"
check "foreign origin rejected" 403 "$(status -b "$JAR" -H 'Origin: https://evil.example' -H 'Content-Type: application/json' -d "{\"productId\":$PRODUCT_ID}" "$BASE/api/cart")"
check "invalid checkout rejected" 422 "$(status -b "$JAR" -H 'Content-Type: application/json' -d '{"name":"A","email":"bad","phone":"1","address":"x","postalCode":"12","method":"delivery"}' "$BASE/api/checkout")"
check "non-JSON content type rejected" 415 "$(status -b "$JAR" -H 'Content-Type: text/plain' -d "{\"productId\":$PRODUCT_ID}" "$BASE/api/cart")"
check "oversized body rejected" 413 "$(status -b "$JAR" -H 'Content-Type: application/json' -d "{\"productId\":$PRODUCT_ID,\"junk\":\"$(printf 'x%.0s' {1..20000})\"}" "$BASE/api/cart")"

# Session-015 S15-M1: the quantity stepper (PATCH), the Remove button (cart DELETE) and
# un-favouriting (favourites DELETE) had zero coverage in any tier — a regression in
# setCartQuantity/removeFromCart/removeFavourite would have shipped green through the
# whole gate. All three surfaces are probed here against the session's own line.
# favouriteIds[0] is compared to $PRODUCT_ID itself (the row the POST pinned). The
# cart DELETE empties the line, so the round-trip re-adds it before checkout below.
check "cart quantity set via PATCH" 3 "$(json -X PATCH -b "$JAR" -H 'Content-Type: application/json' -d "{\"productId\":$PRODUCT_ID,\"quantity\":3}" "$BASE/api/cart" | field "['lines'][0]['quantity']")"
check "cart line removed via DELETE" 0 "$(json -X DELETE -b "$JAR" -H 'Content-Type: application/json' -d "{\"productId\":$PRODUCT_ID}" "$BASE/api/cart" | field "['totals']['itemCount']")"
check "favourite added via POST" "$PRODUCT_ID" "$(json -b "$JAR" -H 'Content-Type: application/json' -d "{\"productId\":$PRODUCT_ID}" "$BASE/api/favourites" | field "['favouriteIds'][0]")"
check "favourite removed via DELETE" "[]" "$(json -X DELETE -b "$JAR" -H 'Content-Type: application/json' -d "{\"productId\":$PRODUCT_ID}" "$BASE/api/favourites" | python3 -c "import sys,json;print(json.load(sys.stdin)['favouriteIds'])")"
check "cart re-added after removal" 201 "$(status -b "$JAR" -H 'Content-Type: application/json' -d "{\"productId\":$PRODUCT_ID,\"quantity\":1}" "$BASE/api/cart")"

ORDER="$(json -b "$JAR" -d '{"name":"Smoke Test","email":"Smoke@Example.com","phone":"+65 9123 4567","address":"1 Jurong West Street 21","postalCode":"649423","method":"delivery"}' "$BASE/api/checkout")" || { echo "FAIL prerequisite: checkout API call failed"; exit 1; }
ORDER_NO="$(echo "$ORDER" | field "['orderNo']")" || { echo "FAIL prerequisite: no orderNo in checkout response"; exit 1; }
check "order page for owning session" 200 "$(status -b "$JAR" "$BASE/orders/$ORDER_NO")"
check "order page hidden from other sessions" 404 "$(status "$BASE/orders/$ORDER_NO")"
check "cart emptied by checkout" 0 "$(curl -s -b "$JAR" "$BASE/api/summary" | field "['cartCount']")"
check "track with matching email" 200 "$(status -H 'Content-Type: application/json' -d "{\"orderNo\":\"$ORDER_NO\",\"email\":\"smoke@example.com\"}" "$BASE/api/orders/track")"
check "track with wrong email" 404 "$(status -H 'Content-Type: application/json' -d "{\"orderNo\":\"$ORDER_NO\",\"email\":\"other@example.com\"}" "$BASE/api/orders/track")"

if [[ $failures -gt 0 ]]; then echo "$failures check(s) failed"; exit 1; fi
echo "all smoke checks passed"
