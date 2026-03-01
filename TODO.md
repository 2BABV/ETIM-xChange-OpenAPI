# OpenAPI Review: Product & Trade Item APIs — TODO

## Summary

**Overall quality: Very High.** Redocly lint passes cleanly across all 5 API specs. Both APIs consistently follow OAS 3.1 / JSON Schema 2020-12, use correct nullable patterns, `examples` (plural) on schemas, `additionalProperties: false` on all objects, and named `$ref` envelope pattern for response `data` properties.

---

## 🔴 High Severity

### ~~H1 — Align `limit` param maximum with `CursorPaginationMetadata.limit` maximum~~ ✅
- **Files:** `openapi/shared/parameters/query/limit.yaml`, `openapi/shared/schemas/common/CursorPaginationMetadata.yaml`
- **Resolution:** Lowered parameter `maximum` from `1000000` to `1000` to match `CursorPaginationMetadata.limit`.

---

## 🟡 Medium Severity

### ~~M1 — Add missing `403` response to `trade-items.yaml`~~ ✅
- **File:** `openapi/apis/tradeitem/paths/trade-items.yaml`
- **Resolution:** Added `403` response ref matching all other single-item trade item paths.

### ~~M2 — Remove duplicate `example`/`examples` in `etim-release-version.yaml`~~ ✅
- **File:** `openapi/shared/parameters/query/etim-release-version.yaml`
- **Resolution:** Removed singular `example` — plural `examples` array on schema retained.

### ~~M3 — Clean up `Pricing.yaml`: add description, remove commented code, align nullable pattern~~ ✅
- **File:** `openapi/apis/tradeitem/schemas/domain/Pricing.yaml`
- **Resolution:** Added top-level description with ETIM xChange path, removed commented-out `allowanceSurcharges`, converted `priceUnitFactor` and `vat` from `anyOf` nullable to `type: ["number", "null"]`.

### M4 — Evaluate `format: decimal` usage
- **Files:** `openapi/apis/tradeitem/schemas/domain/Pricing.yaml`, `openapi/shared/schemas/common/Price.yaml`, `openapi/shared/schemas/common/PriceQuantity.yaml`
- **Issue:** `format: decimal` is not a standard JSON Schema / OAS format. May cause issues with some validators/generators. Decide whether to document as custom extension, replace with `double`, or keep as-is.

### ~~M5 — Add descriptions to `PriceQuantity.yaml` and `Supplier.yaml`~~ ✅
- **Files:** `openapi/shared/schemas/common/PriceQuantity.yaml`, `openapi/apis/tradeitem/schemas/domain/Supplier.yaml`
- **Resolution:** Added top-level descriptions to both schemas.

### ~~M6 — Add missing `examples` to enum/param schemas~~ ✅
- **Files:** `openapi/shared/schemas/common/AllowanceSurchargeTypes.yaml`, `openapi/shared/schemas/common/UnitCodes.yaml`, `openapi/apis/tradeitem/schemas/domain/Supplier.yaml`, `openapi/shared/parameters/query/limit.yaml`
- **Resolution:** Added `examples` arrays to all four schemas.

---

## 🟢 Low Severity

### L1 — Standardize 404 responses to use `examples` (plural) across all paths
- **Files:** All 11 single-item path files (5 product + 6 tradeitem)
- **Issue:** 404 responses use `example` (singular) while 200 responses use `examples` (plural named map). Technically valid for media type examples but inconsistent.

### L2 — Standardize `$ref` quoting in tradeitem bulk paths
- **Files:** `openapi/apis/tradeitem/paths/bulk/trade-item-allowance-surcharges.yaml`, `trade-item-orderings.yaml`, `trade-item-pricings.yaml`
- **Issue:** Unquoted `$ref` values while other bulk files use quoted strings.

### L3 — Add `minLength`/`maxLength` to pattern-validated strings; `format: uuid` to `scipNumber`
- **Files:** `openapi/shared/schemas/common/LanguageCode.yaml`, `openapi/shared/schemas/identifiers/Gtin.yaml`, `openapi/shared/parameters/query/cursor.yaml`, `openapi/apis/product/schemas/domain/Legislation.yaml`
- **Issue:** Pattern covers length but explicit `minLength`/`maxLength` constraints improve tooling & documentation. `scipNumber` has length 36 constraints but no `format: uuid`.

### L4 — Review duplicate `KGM`/`KG` in UnitCodes
- **File:** `openapi/shared/schemas/common/UnitCodes.yaml`
- **Issue:** Both `KGM` (Kilogram) and `KG` (Kilogram alternative) present — may confuse consumers.

---

## ✅ No Action Needed

- **Zero `nullable: true`** — all nullable fields correctly use `type: ["T", "null"]`
- **Zero deprecated `example` on schemas** — all schemas use `examples` (plural)
- **`additionalProperties: false`** on all objects (except `ProblemDetails` which correctly uses `true`)
- **Named `$ref` for all envelope `data` properties** — no inline anonymous objects
- **Consistent naming**: camelCase properties, PascalCase schemas, kebab-case paths/files
- **Comprehensive validation constraints** throughout
- **Excellent descriptions** with ETIM xChange mapping paths
- **RFC 7807 Problem Details** for all error responses
- ETIM-driven enum values (spaces in `ItemStatus`, mixed separators in `RelationType`) are intentional — no change needed
