# What Changed — URL Path Structure Refactor

## Server URLs

**Before**: Hardcoded 2BA-specific server URLs per API.

```yaml
servers:
  - url: https://rest.2ba.nl/v1/products
  - url: https://rest.accept.2ba.nl/v1/products
```

**After**: Parameterized server URL with implementer variables.

```yaml
servers:
  - url: https://{host}{basePath}/v1
    variables:
      host:
        default: api.example.com
      basePath:
        default: ''
```

Each implementer substitutes their own `host` and optional `basePath` (e.g. `/api`).

## Path Keys

Resource names moved from `servers.url` into `paths`, making the full URL contract visible in the spec.

| API | Before | After |
|-----|--------|-------|
| Product | `/{gln}/{productNumber}/details` | `/products/{gln}/{productNumber}/details` |
| Trade Item | `/{gln}/{itemNumber}/details` | `/trade-items/{gln}/{itemNumber}/details` |
| Net Price | `/{gln}/item-number/{itemNumber}` | `/netprices/{gln}/item-number/{itemNumber}` |
| Stock | `/{gln}/{itemNumber}` | `/stock/{gln}/{itemNumber}` |

## Bulk Path Naming

Dropped redundant resource prefix from bulk paths and aligned aspect names to match single-item endpoints.

### Product API

| Before | After |
|--------|-------|
| `/bulk/product-details` | `/products/bulk/details` |
| `/bulk/product-descriptions` | `/products/bulk/descriptions` |
| `/bulk/product-etim-classification-features` | `/products/bulk/etim-classifications` |
| `/bulk/product-lca-declarations` | `/products/bulk/lca-environmental` |

### Trade Item API

| Before | After |
|--------|-------|
| `/bulk/trade-item-details` | `/trade-items/bulk/details` |
| `/bulk/trade-item-descriptions` | `/trade-items/bulk/descriptions` |
| `/bulk/trade-item-orderings` | `/trade-items/bulk/orderings` |
| `/bulk/trade-item-pricings` | `/trade-items/bulk/pricings` |
| `/bulk/trade-item-allowance-surcharges` | `/trade-items/bulk/allowance-surcharges` |
| `/bulk/trade-item-relations` | `/trade-items/bulk/relations` |
| `/bulk/trade-item-logistics-details` | `/trade-items/bulk/logistics-details` |

## OAuth Token URL

**Before**: Hardcoded 2BA identity server.

```yaml
tokenUrl: https://identity.2ba.nl/connect/token
```

**After**: Implementer-agnostic placeholder with description.

```yaml
tokenUrl: https://auth.example.com/connect/token
```

Each implementer provides their own OAuth 2.0 authorization server.

## ProblemDetails Examples

**Before**: 2BA-specific type URIs and instance fields.

```yaml
type: "https://api.product.2ba.nl/problems/not-found"
title: "Product Not Found"
status: 404
detail: "No product found with manufacturer GLN '1234567890123' and product number '929002376910'"
instance: "https://api.product.2ba.nl/v1/products/1234567890123/929002376910/details"
```

**After**: RFC 7807 `about:blank` default, no instance field.

```yaml
type: about:blank
title: Not Found
status: 404
detail: "No product found with manufacturer GLN '1234567890123' and product number '929002376910'"
```

## Documentation

- **GOVERNANCE.md**: Fixed `/api/v1/` → `/v1/` versioning example
- **best-practices.md**: Fixed `/api/v1/user-profiles` → `/v1/user-profiles`
- **design-decisions.md**: Updated Server URL Pattern section, bulk path examples, ProblemDetails convention
- **implementer-guide.md**: New file — URL contract, OAuth setup, scope naming, pagination

## Redocly Config

- `no-server-example.com` rule set to `off` (deliberate use of `api.example.com` placeholder)

## Files

54 files changed across 5 API specs, 11 renamed bulk path files, 19 ProblemDetails updates, 18 stale-reference fixes, 4 documentation updates, 1 new implementer guide, and 2 regenerated bundles.
