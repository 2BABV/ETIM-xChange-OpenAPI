# OpenAPI Initial Setup Guide

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Design Principles](#design-principles)
- [Getting Started](#getting-started)
- [Reference Links](#reference-links)
- [Best Practices Applied](#best-practices-applied)
- [Additional Documentation](#additional-documentation)
- [Contributing](#contributing)
- [Support](#support)

## Overview

This document describes the initial OpenAPI structure created for the 2BA OpenApi project. The structure supports multiple API domains (etim, product, tradeitem, netprice) with shared components and Redocly integration.

**Created on:** October 2, 2025  
**Last updated:** December 2, 2025

---

## Directory Structure

```plaintext
openapi/
├── redocly.yaml                          # Redocly configuration for all APIs
├── apis/
│   ├── product/
│   │   ├── openapi.yaml                  # Root spec for Product API
│   │   ├── openapi-bulk.yaml             # Bulk operations spec
│   │   ├── generated/                    # Git-tracked bundled specs (regenerate after changes)
│   │   ├── README.md                     # API documentation
│   │   ├── paths/                        # API endpoint definitions
│   │   └── schemas/
│   │       ├── domain/                   # Domain models
│   │       ├── enums/                    # Domain-specific enumerations
│   │       ├── requests/                 # Request DTOs
│   │       └── responses/                # Response DTOs
│   │
│   ├── tradeitem/
│   │   ├── openapi.yaml                  # Root spec for Trade Item API
│   │   ├── openapi-bulk.yaml             # Bulk operations spec
│   │   ├── openapi-domain.yaml           # Domain models spec
│   │   ├── README.md                     # API documentation
│   │   ├── paths/                        # API endpoint definitions
│   │   └── schemas/
│   │       ├── domain/                   # Domain models
│   │       ├── enums/                    # Domain-specific enumerations
│   │       ├── requests/                 # Request DTOs
│   │       └── responses/                # Response DTOs
│   │
│   ├── netprice/
│   │   ├── openapi.yaml                  # Root spec for Net Price API
│   │   ├── README.md                     # API documentation
│   │   ├── paths/                        # API endpoint definitions
│   │   └── schemas/
│   │       ├── domain/                   # Domain models
│   │       ├── requests/                 # Request DTOs
│   │       └── responses/                # Response DTOs
│   │
│   └── stock/
│       ├── openapi.yaml                  # Root spec for Stock API
│       ├── README.md                     # API documentation
│       ├── paths/                        # API endpoint definitions
│       └── schemas/
│           ├── domain/                   # Domain models
│           ├── requests/                 # Request DTOs
│           └── responses/                # Response DTOs
│
└── shared/
    ├── schemas/
    │   ├── common/
    │   │   ├── AllowanceSurchargeTypes.yaml
    │   │   ├── CountryCode.yaml
    │   │   ├── CurrencyCode.yaml
    │   │   ├── CursorPaginationMetadata.yaml
    │   │   ├── LanguageCode.yaml
    │   │   ├── Price.yaml
    │   │   ├── PriceQuantity.yaml
    │   │   ├── ProblemDetails.yaml
    │   │   ├── UnitCodes.yaml
    │   │   └── ValidationProblemDetails.yaml
    │   └── identifiers/
    │       ├── Duns.yaml
    │       ├── Gln.yaml
    │       ├── Gtin.yaml
    │       └── OrganizationIdentifier.yaml
    ├── parameters/
    │   ├── query/
    │   │   ├── cursor.yaml
    │   │   ├── etim-release-version.yaml
    │   │   ├── limit.yaml
    │   │   ├── manufacturer-id-gln.yaml
    │   │   ├── mutation-date.yaml
    │   │   ├── selection-id.yaml
    │   │   ├── sort-order.yaml
    │   │   └── supplier-id-gln.yaml
    │   └── path/
    │       ├── manufacturer-id-gln.yaml
    │       ├── manufacturer-product-number.yaml
    │       ├── supplier-id-gln.yaml
    │       └── supplier-item-number.yaml
    ├── responses/
    │   ├── 400-bad-request.yaml
    │   ├── 401-unauthorized.yaml
    │   ├── 403-forbidden.yaml
    │   ├── 404-not-found.yaml
    │   └── 500-internal-server-error.yaml
    └── examples/
```

---

## Design Principles

### 1. **Multi-Domain Architecture**
- Each business domain (product, tradeitem, netprice) has its own OpenAPI specification
- Enables independent versioning and documentation per domain
- Supports team autonomy and parallel development

### 2. **Shared Components**
- Common schemas, parameters, and responses in `/shared` folder
- Reduces duplication and ensures consistency
- Centralized management of cross-cutting concerns

### 3. **DTO Pattern**
- Separation of concerns with `requests/`, `responses/`, and `domain/` folders
- Request DTOs for input validation
- Response DTOs for API contracts
- Domain models for business logic (not directly exposed)

### 4. **Naming Conventions**
Following the established best practices:
- **PascalCase** for schema file names: `Price.yaml`, `ProblemDetails.yaml`
- **PascalCase** for component names: `Price`, `PageNumber`, `BadRequest`
- **camelCase** for property names: `firstName`, `createdAt`
- **kebab-case** for parameter/response files: `cursor.yaml`, `400-bad-request.yaml`
- **kebab-case** for API path segments: `/netprices`, `/trade-items`
- **camelCase** for operationIds: `getTradeItemNetPrice`, `getProducts`

### 5. **Redocly Integration**
- Central `redocly.yaml` configuration file
- Multi-API support with versioning (`product@v1`, `tradeitem@v1`, etc.)
- Consistent linting rules across all APIs
- Documentation generation capabilities

---

## Getting Started

### Prerequisites
```powershell
# Install Redocly CLI (local/develop)
npm install -D @redocly/cli
```

### Validate APIs
```powershell
# Lint all APIs
npx redocly lint

# Lint specific API
npx redocly lint product@v1
npx redocly lint tradeitem@v1
npx redocly lint tradeitem-domain@v1
npx redocly lint netprice@v1
npx redocly lint stock@v1
```

### Bundle API Specifications

**Distribution bundles** (for external sharing — output to `dist/`, gitignored):
```powershell
npx redocly bundle product@v1 -o dist/product-api.yaml
npx redocly bundle tradeitem@v1 -o dist/tradeitem-api.yaml
npx redocly bundle tradeitem-domain@v1 -o dist/tradeitem-domain-api.yaml
npx redocly bundle netprice@v1 -o dist/netprice-api.yaml
npx redocly bundle stock@v1 -o dist/stock-api.yaml
```

**Generated bundles** (git-tracked, for tooling consumption — output to `generated/`):
```powershell
npx @redocly/cli bundle --config openapi/redocly.yaml product@v1 -o openapi/apis/product/generated/product-api.yaml
npx @redocly/cli bundle --config openapi/redocly.yaml tradeitem@v1 -o openapi/apis/tradeitem/generated/tradeitem-api.yaml
```

> **When to regenerate:** Regenerate the `generated/*.yaml` bundle for an API after ANY change to that API's source specs (openapi.yaml, paths, schemas, or shared files it references). Always commit regenerated bundles alongside the source changes.

### Generate Documentation
```powershell
# Generate HTML documentation for specific API
npx redocly build-docs product@v1 -o dist/docs/product.html
npx redocly build-docs tradeitem@v1 -o dist/docs/tradeitem.html
npx redocly build-docs tradeitem-domain@v1 -o dist/docs/tradeitem-domain.html
npx redocly build-docs netprice@v1 -o dist/docs/netprice.html
npx redocly build-docs stock@v1 -o dist/docs/stock.html

# Preview documentation locally
npx redocly preview-docs product@v1
```

---

## Reference Links

### Redocly Configuration
The `redocly.yaml` file defines:
- **API Registry**: All domains with their root specifications
- **Linting Rules**: Consistent validation across all APIs
- **Documentation Theme**: Code sample generation and UI configuration

### Shared Components Created

**Common Schemas:**
- `ProblemDetails.yaml` - RFC 7807 Problem Details error structure
- `ValidationProblemDetails.yaml` - Validation error details
- `CursorPaginationMetadata.yaml` - Cursor-based pagination metadata
- `Price.yaml` - Price structure with currency
- `PriceQuantity.yaml` - Price with quantity information
- `AllowanceSurchargeTypes.yaml` - Allowance/surcharge type codes
- `UnitCodes.yaml` - Unit of measure codes
- `CountryCode.yaml` - ISO 3166-1 alpha-2 country codes
- `CurrencyCode.yaml` - ISO 4217 currency codes
- `LanguageCode.yaml` - ISO 639-1 language codes

**Identifiers:**
- `Gln.yaml` - Global Location Number (13 digits)
- `Duns.yaml` - Data Universal Numbering System (9 digits)
- `Gtin.yaml` - Global Trade Item Number
- `OrganizationIdentifier.yaml` - Flexible GLN/DUNS union

**Query Parameters:**
- `cursor.yaml` - Cursor for pagination
- `limit.yaml` - Number of items per page
- `sort-order.yaml` - Ascending/descending sort
- `supplier-id-gln.yaml` - Supplier GLN filter
- `manufacturer-id-gln.yaml` - Manufacturer GLN filter
- `mutation-date.yaml` - Filter by mutation date
- `selection-id.yaml` - Selection identifier
- `etim-release-version.yaml` - ETIM release filter

**Path Parameters:**
- `supplier-id-gln.yaml` - Supplier GLN path parameter
- `supplier-item-number.yaml` - Supplier item number
- `manufacturer-id-gln.yaml` - Manufacturer GLN path parameter
- `manufacturer-product-number.yaml` - Manufacturer product number

**Standard Responses:**
- `400-bad-request.yaml`
- `401-unauthorized.yaml`
- `403-forbidden.yaml`
- `404-not-found.yaml`
- `500-internal-server-error.yaml`

---

## Best Practices Applied

1. ✅ **OpenAPI 3.1** specification format
2. ✅ **$ref extensively** for reusability
3. ✅ **Separate enum files** for reusable enumerations
4. ✅ **DTO pattern** for request/response separation
5. ✅ **Consistent naming conventions** across all schemas
6. ✅ **Comprehensive examples** in shared components
7. ✅ **Business context documentation** in descriptions
8. ✅ **Flexible identifier patterns** using oneOf
9. ✅ **Standard error response patterns**
10. ✅ **Multi-domain support** with Redocly

---

## Additional Documentation

For more information, see:
- [Best Practices](./best-practices.md) - Naming conventions and patterns
- [Multiple Domains](./multiple_domains.md) - Multi-API repository structure
- [Redocly Documentation](https://redocly.com/docs/cli/) - Official Redocly CLI guide

---

## Contributing

When adding new schemas or endpoints:

1. Follow the established directory structure
2. Use the documented naming conventions
3. Reference shared components where applicable
4. Add comprehensive descriptions and examples
5. Run `redocly lint` before committing
6. Update this documentation as needed

---

## Support

For questions or issues with the OpenAPI specification:
- Review the [best-practices.md](./best-practices.md) guide
- Check the [multiple_domains.md](./multiple_domains.md) documentation
- Contact the API architecture team

---

*This structure was created following OpenAPI 3.1 standards and Redocly best practices for multi-domain API management.*
