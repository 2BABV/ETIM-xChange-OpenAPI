# API Consistency Review: Product API vs TradeItem API

**Date**: 2026-03-30  
**Scope**: Cross-API endpoint definition consistency

## Summary

The shared infrastructure (pagination, error handling, envelope patterns, parameter definitions) is **excellent**. The inconsistencies are structural and naming-level, but several have real impact on API consumers and code generation.

---

## 🔴 High Impact

### 1. Root endpoint asymmetry

- **Product API**: `GET /{manufacturerIdGln}/{manufacturerProductNumber}` → **ACTIVE** (returns complete product)
- **TradeItem API**: `GET /{supplierIdGln}/{supplierItemNumber}` → **COMMENTED OUT** (file exists at `paths/trade-items.yaml` but not mounted)
- **Impact**: API consumers expecting parallel structure across APIs won't find a single-call "get everything" endpoint for TradeItems. This is the most visible structural inconsistency.
- **Files**: `openapi/apis/product/openapi.yaml:48-49` vs `openapi/apis/tradeitem/openapi.yaml:46-47`

### ~~2. `ProblemDetails` schema registered under different names~~ ✅ Resolved

Renamed `ErrorResponse` → `ProblemDetails` in TradeItem (`openapi.yaml:92`) and NetPrice (`openapi.yaml:30`) APIs. All APIs now use the same `ProblemDetails` component name for the shared RFC 7807 schema.

### ~~3. Security scheme mismatch~~ ✅ Resolved

All APIs now use OAuth 2.0 Client Credentials (`identity.2ba.nl/connect/token`) with consistent scope naming. Removed `bearerAuth` (Product) and `apiKeyAuth` (NetPrice, Stock). Generated bundles regenerated.

---

## 🟡 Medium Impact

### 4. `TradeItemResponse.yaml` breaks the ResponseData wrapper pattern

- **Product API**: `ProductResponse.yaml` → `data: { $ref: ./ProductResponseData.yaml }` ✅ uses named `*ResponseData` wrapper
- **TradeItem API**: `TradeItemResponse.yaml` → `data: { $ref: ../domain/TradeItem.yaml }` ⚠️ directly references domain schema
- **Impact**: The Product API correctly follows the envelope convention (from `.github/copilot-instructions.md`) requiring a `*ResponseData` schema for `data`. The TradeItem API bypasses this — NSwag will generate a `TradeItemResponseData` type vs a `TradeItem` type depending on which pattern is used, affecting client code consistency.
- **Files**: `openapi/apis/tradeitem/schemas/responses/TradeItemResponse.yaml:13` vs `openapi/apis/product/schemas/responses/ProductResponse.yaml:18`

### 5. `Language` parameter not registered in TradeItem API components

- **Product API**: Registers `Language: $ref: ../../shared/parameters/query/language.yaml` in `components/parameters` (line 199-200)
- **TradeItem API**: Uses `language.yaml` via direct `$ref` in path files but **never registers** it in `components/parameters`
- **Impact**: Inconsistent component exposure. Both APIs use the parameter identically in paths (direct `$ref` to shared file), so functionally equivalent. But the Product API has it available for reuse at the component level while TradeItem doesn't.

### 6. Unused `Products` tag in Product API

- **Product API** defines 3 tags: `Products`, `Products single`, `Products bulk` — but `Products` (line 31-33) is never used by any endpoint.
- **TradeItem API** defines 2 tags: `TradeItems single`, `TradeItems bulk` — clean, no unused tags.
- **File**: `openapi/apis/product/openapi.yaml:31-33`

---

## 🟢 Low Impact (Cosmetic / Informational)

### ~~7. Server URL naming pattern mismatch~~ ✅ Resolved

All APIs now use the consolidated `rest.2ba.nl/v1/{resource}` + `rest.accept.2ba.nl/v1/{resource}` ("Acceptance server") pattern. NetPrice and Stock path keys were restructured to move the resource name into the server URL (matching the Product pattern).

### 8. YAML quote style inconsistency

- Product API: unquoted `$ref` paths (`$ref: paths/products.yaml`)
- TradeItem API: single-quoted `$ref` paths (`$ref: './paths/trade-items.yaml'`)
- Functionally identical, but inconsistent style across the repo.

### 9. `x-tagGroups` naming inconsistency

- Product API: group name `"Products"` (line 42)
- TradeItem API: group name `"Trade Items"` (line 39, with space)
- Not wrong per se, but "Products" vs "Trade Items" have different word conventions (single word vs two words).

---

## ✅ Consistent (Well Done)

- **Envelope pattern** (`data` + optional `meta`): identical across both APIs
- **Cursor-based pagination**: identical `CursorPaginationMetadata` usage
- **Error responses**: All 5 HTTP error codes reference same shared files
- **Custom 404 handling**: Both APIs use inline 404 with `ProblemDetails` schema + domain-specific examples on all single endpoints
- **Bulk endpoint parameter ordering**: `cursor → limit → selection-id → entity-filter → mutation-date-time` consistently
- **Shared parameter files**: Both APIs reference the same shared parameter definitions with consistent paths
- **`required` field patterns**: `[data]` for single, `[data, meta]` for bulk
- **Examples**: Comprehensive in all response schemas and path files across both APIs
- **Nested vs flattened strategy**: Single endpoints = nested, Bulk = flattened — consistent

---

## Recommended Actions (priority order)

1. ~~**Rename `ErrorResponse` → `ProblemDetails`**~~ ✅ Done
2. **Decide on root endpoint**: Either activate `GET /{supplierIdGln}/{supplierItemNumber}` in TradeItem or remove `GET /{manufacturerIdGln}/{manufacturerProductNumber}` from Product for consistency
3. **Create `TradeItemResponseData.yaml`** wrapper to match the `*ResponseData` pattern used by ProductResponse
4. **Register `Language`** parameter in TradeItem's `components/parameters` section
5. **Remove unused `Products` tag** from Product API or add an equivalent base tag to TradeItem
6. ~~**Align security schemes**~~ ✅ Done
