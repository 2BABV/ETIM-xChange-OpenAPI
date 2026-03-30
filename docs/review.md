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

### ~~4. `TradeItemResponse.yaml` breaks the ResponseData wrapper pattern~~ ✅ Resolved

Created `TradeItemResponseData.yaml` wrapper with composite keys + domain sub-schema refs. `TradeItemResponse.yaml` now references `./TradeItemResponseData.yaml` instead of `../domain/TradeItem.yaml`, matching the pattern used by all other responses.

### ~~5. `Language` parameter not registered in TradeItem API components~~ ✅ Resolved

Registered `Language: $ref: ../../shared/parameters/query/language.yaml` in TradeItem API `components/parameters`, matching the Product API pattern.

### ~~6. Unused `Products` tag in Product API~~ ✅ Resolved

Removed the unused `Products` tag definition (lines 31-33). Only `Products single` and `Products bulk` remain, matching the TradeItem API pattern.

---

## 🟢 Low Impact (Cosmetic / Informational)

### ~~7. Server URL naming pattern mismatch~~ ✅ Resolved

All APIs now use the consolidated `rest.2ba.nl/v1/{resource}` + `rest.accept.2ba.nl/v1/{resource}` ("Acceptance server") pattern. NetPrice and Stock path keys were restructured to move the resource name into the server URL (matching the Product pattern).

### ~~8. YAML quote style inconsistency~~ ✅ Resolved

Standardized all 166 `$ref` values to unquoted style across 24 source files (shared, tradeitem, netprice, stock). Matches OpenAPI 3.1.0 spec examples, YAML 1.2.2 plain scalar convention, and the Product API's existing style.

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
3. ~~**Create `TradeItemResponseData.yaml`**~~ ✅ Done
4. ~~**Register `Language`**~~ ✅ Done
5. ~~**Remove unused `Products` tag**~~ ✅ Done
6. ~~**Align security schemes**~~ ✅ Done
