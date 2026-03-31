# Bulk Path Naming Consolidation

## Problem

Two issues with bulk endpoint path naming across the Product and TradeItem APIs:

### Issue 1: Redundant resource prefix in bulk paths
All bulk paths repeat the resource name that is already in the API base path:
- TradeItem API (base `/trade-items/`): `/bulk/trade-item-details`, `/bulk/trade-item-pricings`, etc.
- Product API (base `/products/`): `/bulk/product-details`, `/bulk/product-descriptions`, etc.

The single-item counterparts already use the short form: `/{id}/details`, `/{id}/pricings`. The `trade-item-` / `product-` prefix in bulk paths is redundant.

### Issue 2: Name mismatches between single and bulk (Product API only)

Two product endpoints use different aspect names in single vs bulk:

| Single path | Bulk path | Mismatch |
|---|---|---|
| `/{id}/etim-classifications` | `/bulk/product-etim-classification-features` | `etim-classifications` vs `etim-classification-features` |
| `/{id}/lca-environmental` | `/bulk/product-lca-declarations` | `lca-environmental` vs `lca-declarations` |

## Reasoning

### Why the short names are correct

The single-item paths already use short names (`/details`, `/descriptions`, etc.) and the resource context is provided by the API base path (`/products/` or `/trade-items/`). Repeating the resource in bulk paths serves no purpose — `/trade-items/bulk/trade-item-details` is tautological.

### Why align to the single-item aspect names (not the bulk names)

**`etim-classifications`** (not `etim-classification-features`):
- The ETIM xChange schema uses `EtimClassification` as the top-level property name
- `EtimFeatures` is a nested array *within* each `EtimClassification` object
- The single-item endpoint `/etim-classifications` already returns classifications with their nested features
- The bulk endpoint returns a flattened view of the same data (one row per feature), but the *conceptual resource* is still "ETIM classifications"
- The `single` vs `bulk` context already signals the different data shape — there is no need for the path name to encode it

**`lca-environmental`** (not `lca-declarations`):
- The ETIM xChange schema uses `LcaEnvironmental` as the top-level property name
- `LcaDeclaration` is a nested array *within* `LcaEnvironmental`
- The single-item endpoint `/lca-environmental` returns the full LCA envelope (EPD metadata + declarations)
- The bulk endpoint returns only the declaration rows (lifecycle stage indicators), which is a subset
- Again, the path name should reflect the *resource concept*, not the internal data shape of the response

### What does NOT change
- **operationIds** stay as-is (`getBulkProductEtimClassificationFeatures`, `getBulkProductLcaDeclarations`, etc.) — these drive code generation and are a separate concern
- **Response schema file names** stay as-is (`BulkProductEtimClassificationFeaturesResponse.yaml`, etc.)
- **Component registrations**, tags, `x-tagGroups`, redocly config — all unchanged
- **Internal `$ref` chains** inside path files — unchanged (they reference schemas, not paths)

### ⚠️ Breaking change
This changes the URL contract. Existing consumers calling the old URLs would get 404s. This is acceptable because the API is not yet in production.

## Scope

### Phase 1: File renames (11 bulk path files)

**Product API** — `openapi/apis/product/paths/bulk/`:
| Old file | New file | Reason |
|----------|----------|--------|
| `product-details.yaml` | `details.yaml` | Remove redundant prefix |
| `product-descriptions.yaml` | `descriptions.yaml` | Remove redundant prefix |
| `product-etim-classification-features.yaml` | `etim-classifications.yaml` | Remove prefix + align aspect name to single |
| `product-lca-declarations.yaml` | `lca-environmental.yaml` | Remove prefix + align aspect name to single |

**TradeItem API** — `openapi/apis/tradeitem/paths/bulk/`:
| Old file | New file | Reason |
|----------|----------|--------|
| `trade-item-details.yaml` | `details.yaml` | Remove redundant prefix |
| `trade-item-descriptions.yaml` | `descriptions.yaml` | Remove redundant prefix |
| `trade-item-orderings.yaml` | `orderings.yaml` | Remove redundant prefix |
| `trade-item-pricings.yaml` | `pricings.yaml` | Remove redundant prefix |
| `trade-item-allowance-surcharges.yaml` | `allowance-surcharges.yaml` | Remove redundant prefix |
| `trade-item-relations.yaml` | `relations.yaml` | Remove redundant prefix |
| `trade-item-logistics-details.yaml` | `logistics-details.yaml` | Remove redundant prefix |

### Phase 2: Update openapi.yaml path keys and $refs
- `openapi/apis/product/openapi.yaml` — 4 path key + 4 $ref updates; also remove commented-out `product-etim-classifications` line
- `openapi/apis/tradeitem/openapi.yaml` — 7 path key + 7 $ref updates; update comment on line 71

### Phase 3: Update documentation
- `docs/plan-csv.md` — ~40+ references to old bulk paths
- `docs/etim-xchange-openapi-design-decisions.md` — multiple references
- `openapi/apis/product/README.md` — bulk endpoint references
- `openapi/apis/tradeitem/README.md` — bulk endpoint references
- `openapi/apis/tradeitem/etim-tradeitem-openapi-generation-prompt.md` — design doc references

### Phase 4: Validate and regenerate
- Run `npx @redocly/cli lint --config openapi\redocly.yaml product@v1 tradeitem@v1`
- Regenerate bundles:
  - `npx @redocly/cli bundle --config openapi\redocly.yaml product@v1 -o openapi/apis/product/generated/product-api.yaml`
  - `npx @redocly/cli bundle --config openapi\redocly.yaml tradeitem@v1 -o openapi/apis/tradeitem/generated/tradeitem-api.yaml`

## Result: Before → After

### Product API paths
| Before | After |
|--------|-------|
| `/{id}/details` | `/{id}/details` *(unchanged)* |
| `/{id}/descriptions` | `/{id}/descriptions` *(unchanged)* |
| `/{id}/etim-classifications` | `/{id}/etim-classifications` *(unchanged)* |
| `/{id}/lca-environmental` | `/{id}/lca-environmental` *(unchanged)* |
| `/bulk/product-details` | `/bulk/details` |
| `/bulk/product-descriptions` | `/bulk/descriptions` |
| `/bulk/product-etim-classification-features` | `/bulk/etim-classifications` |
| `/bulk/product-lca-declarations` | `/bulk/lca-environmental` |

### TradeItem API paths
| Before | After |
|--------|-------|
| `/{id}/details` | `/{id}/details` *(unchanged)* |
| `/{id}/descriptions` | `/{id}/descriptions` *(unchanged)* |
| `/{id}/orderings` | `/{id}/orderings` *(unchanged)* |
| `/{id}/pricings` | `/{id}/pricings` *(unchanged)* |
| `/{id}/allowance-surcharges` | `/{id}/allowance-surcharges` *(unchanged)* |
| `/{id}/relations` | `/{id}/relations` *(unchanged)* |
| `/{id}/logistics-details` | `/{id}/logistics-details` *(unchanged)* |
| `/bulk/trade-item-details` | `/bulk/details` |
| `/bulk/trade-item-descriptions` | `/bulk/descriptions` |
| `/bulk/trade-item-orderings` | `/bulk/orderings` |
| `/bulk/trade-item-pricings` | `/bulk/pricings` |
| `/bulk/trade-item-allowance-surcharges` | `/bulk/allowance-surcharges` |
| `/bulk/trade-item-relations` | `/bulk/relations` |
| `/bulk/trade-item-logistics-details` | `/bulk/logistics-details` |
