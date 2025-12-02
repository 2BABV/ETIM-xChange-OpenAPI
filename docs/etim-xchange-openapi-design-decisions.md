# ETIM xChange OpenAPI 3.1 Design Decisions

**Version**: 1.0  
**Date**: November 6, 2025  
**Source**: ETIM xChange V2.0 Beta Schema (2025-10-13)  
**Target**: OpenAPI 3.1 / JSON Schema 2020-12

## Table of Contents

1. [Core Standards & Type System](#core-standards--type-system)
2. [Naming Conventions](#naming-conventions)
3. [Architecture Patterns](#architecture-patterns)
4. [Schema Flattening Strategy](#schema-flattening-strategy)
5. [Bulk Service Design](#bulk-service-design)
6. [Documentation Requirements](#documentation-requirements)
7. [Shared Component Reuse](#shared-component-reuse)
8. [Validation & Error Handling](#validation--error-handling)

---

## Core Standards & Type System

### OpenAPI 3.1 / JSON Schema 2020-12 Compliance

All schemas must adhere to OpenAPI 3.1 and JSON Schema 2020-12 standards:

- **Nullable Fields**: Use `type: ["string", "null"]` for nullable fields (NOT deprecated `nullable: true` from OpenAPI 3.0)
- **Examples**: Use `examples` (plural array) in schemas, not `example` (singular, deprecated)
- **Format Hints**: Include `format` for type validation: `uri`, `email`, `date`, `date-time`, `uuid`, `decimal`. (The Microsoft documentation shows that some implementations (like ASP.NET Core) use `format: decimal` as a custom format hint for tooling purposes, but it's not part of the official OpenAPI 3.1 standard.)
- **Validation Constraints**: Apply `minLength`, `maxLength`, `minimum`, `maximum`, `multipleOf` for validation
- **Strict Validation**: Set `additionalProperties: false` for strict object validation when appropriate
- **Composition**: Use `anyOf`, `oneOf`, `allOf` for complex type compositions
- **Literal Values**: Prefer `const` over single-value `enum` for literal values

### Critical Type Conversions

#### 1. String-to-Number Conversion

**CRITICAL**: ETIM xChange schema stores all numeric values as strings with regex patterns. The OpenAPI specification MUST convert these to proper `number` type with appropriate constraints.

| ETIM xChange Pattern | OpenAPI Type | Constraints | Example Fields |
|---------------------|--------------|-------------|----------------|
| `^[0-9]{1,11}[.]{0,1}[0-9]{0,4}$` | `number` | `minimum: 0`, `multipleOf: 0.0001`, `maximum: 99999999999.9999` | `factorCustomsCommodityCode`, `relatedItemQuantity` |
| `^[0-9]{1,5}[.]{0,1}[0-9]{0,4}$` | `number` | `minimum: 0`, `multipleOf: 0.0001`, `maximum: 99999.9999` | Small factor values |
| `^[0-9]{1,12}[.]{0,1}[0-9]{0,4}$` | `number` | `minimum: 0`, `multipleOf: 0.0001`, `maximum: 999999999999.9999` | `netWeightHazardousSubstances`, `volumeHazardousSubstances`, `lithiumAmount`, `batteryEnergy` |
| `^[-]{0,1}[0-9]{1,12}[.]{0,1}[0-9]{0,4}$` | `number` | `multipleOf: 0.0001`, `minimum: -999999999999.9999`, `maximum: 999999999999.9999` | Signed LCA values |

**Example Conversion**:

```yaml
# ETIM xChange (string) ❌ INCORRECT
FactorCustomsCommodityCode:
  type: "string"
  pattern: "^[0-9]{1,11}[.]{0,1}[0-9]{0,4}$"

# OpenAPI (number) ✅ CORRECT
factorCustomsCommodityCode:
  type: ["number", "null"]
  format: decimal
  minimum: 0
  multipleOf: 0.0001
  maximum: 99999999999.9999
  description: |
    Factor for customs commodity code calculations. Supports up to 4 decimal places.
  examples:
    - 1.0
    - 0.5
    - null
```

**Fields to Convert** (non-exhaustive):
- **LCA Environmental**: `declaredUnitQuantity`, `lcaReferenceLifetime`, `lithiumAmount`, `batteryEnergy`
- **Legislation**: `netWeightHazardousSubstances`, `volumeHazardousSubstances`
- **Product Identification**: `factorCustomsCommodityCode`
- **Product Relations**: `relatedItemQuantity`
- **ETIM Features**: Numeric feature values with string patterns

**Integer-Only Fields**: Keep as `integer` type for true integers (e.g., `warrantyConsumer`, `warrantyBusiness`, whole-unit reference lifetimes)

#### 2. Nullable Fields Pattern

ETIM xChange schema doesn't explicitly distinguish between nullable and optional fields. For OpenAPI 3.1, use proper nullable types:

```yaml
# Required field (not nullable)
manufacturerName:
  type: string
  minLength: 1
  maxLength: 80

# Optional field that can be null
brandName:
  type: ["string", "null"]
  minLength: 1
  maxLength: 50

# Nullable numeric field
factorCustomsCommodityCode:
  type: ["number", "null"]
  minimum: 0

# Nullable array
productGtins:
  type: ["array", "null"]
  items:
    type: string

# Nullable reference - use anyOf pattern
legislation:
  anyOf:
    - $ref: ./Legislation.yaml
    - type: "null"
```

**Guidelines**:
- Use `type: ["string", "null"]` for optional string fields
- Use `type: ["number", "null"]` for optional numeric fields
- Use `type: ["boolean", "null"]` for optional boolean fields
- Use `type: ["array", "null"]` for optional arrays
- When referencing another schema, wrap with `anyOf` and add `{ "type": "null" }` branch
- Do NOT add field to `required` array if it can be null/omitted
- Always include `null` in examples when field is nullable

#### 3. String Boolean Enums

**ETIM xChange Issue**: Some fields use string enums for boolean-like values (e.g., `"true"`, `"false"`, `"exempt"`).

**ETIM Pattern**:
```json
"RohsIndicator": {
  "type": "string",
  "enum": ["true", "false", "exempt"]
}
```

**OpenAPI 3.1 Pattern - Keep as String Enum**:
```yaml
rohsIndicator:
  type: ["string", "null"]
  enum: ["true", "false", "exempt", null]
  description: |
    RoHS compliance indicator. Can be true, false, or exempt.
  examples:
    - "true"
    - "exempt"
    - null

reachIndicator:
  type: ["string", "null"]
  enum: ["true", "false", null]
```

**Do NOT convert these to boolean** - keep as string enums because they have more than two states or follow ETIM's specific semantics.

#### 4. Date Format Enhancement

**ETIM xChange Pattern**:
```json
"ProductValidityDate": {
  "type": "string",
  "format": "date"
}
```

**OpenAPI 3.1 Enhanced Pattern**:
```yaml
productValidityDate:
  type: ["string", "null"]
  format: date
  description: |
    Date from which product is valid for sale. ISO 8601 date format (YYYY-MM-DD).
    
    **ETIM xChange**: `ProductValidityDate`  
    **Path**: `Supplier[].Product[].ProductIdentification.ProductValidityDate`
  examples:
    - "2024-03-01"
    - "2025-01-15"
    - null
```

**Date Field Guidelines**:
- Always use `format: date` for date-only fields (not datetime)
- Include explicit description: "ISO 8601 date format (YYYY-MM-DD)"
- Provide realistic examples in YYYY-MM-DD format
- Make nullable with `type: ["string", "null"]` if date is optional
- Common date fields: `productValidityDate`, `productObsolescenceDate`, `productAnnouncementDate`, `epdValidityStartDate`, `epdValidityExpiryDate`

---

## Naming Conventions

### File Naming

| Category | Convention | Examples |
|----------|-----------|----------|
| **Schema Files** | PascalCase | `Product.yaml`, `TradeItem.yaml`, `ProductIdentification.yaml`, `EtimClassification.yaml` |
| **Parameter/Response Files** | kebab-case | `supplier-id-gln.yaml`, `mutation-date.yaml`, `400-bad-request.yaml` |

### Component Names (for $ref)

**ALL component references use PascalCase**:
- Component keys must match regex: `^[a-zA-Z0-9\.\-_]+$`
- Examples: `Product`, `TradeItem`, `ProductIdentification`, `SupplierIdGln`, `BadRequest`, `NotFound`

```yaml
# ✅ CORRECT
$ref: '#/components/schemas/Product'
$ref: '#/components/parameters/SupplierIdGln'
$ref: '#/components/responses/BadRequest'

# ❌ INCORRECT
$ref: '#/components/schemas/product'
$ref: '#/components/parameters/supplier-id-gln'
```

### Schema Properties & Parameters

**camelCase for all properties and parameter names**:

```yaml
# Properties (camelCase)
properties:
  manufacturerProductNumber:
    type: string
  supplierItemNumber:
    type: string
  netPrice:
    type: number
  mutationDate:
    type: string

# Parameters (camelCase)
parameters:
  - name: supplierIdGln
    in: path
  - name: mutationDate
    in: query
  - name: selectionId
    in: query

# OperationIds (camelCase)
operationId: getBulkProducts
operationId: getBulkTradeItems
operationId: getTradeItemNetPrice
```

### API Paths

**kebab-case for path segments**:

```yaml
# ✅ CORRECT
/bulk/products
/bulk/product-identifications
/bulk/trade-items
/bulk/item-orderings
/netprices
/trade-items

# ❌ INCORRECT
/bulk/productIdentifications
/bulk/TradeItems
/net_prices
```

---

## Architecture Patterns

### Composite Key Design

Each entity has a primary composite key that uniquely identifies it:

#### Product Entity
- **Primary Key**: `manufacturerIdGln` + `manufacturerProductNumber`
- **Alternative Identifier**: `manufacturerIdDuns` (NOT part of primary key)
- **Always Required**: `manufacturerName`, `manufacturerProductNumber`

#### TradeItem Entity
- **Primary Key**: `supplierIdGln` + `supplierItemNumber`
- **Alternative Identifier**: `supplierIdDuns` (NOT part of primary key)
- **Always Required**: `supplierName`, `supplierItemNumber`

**Critical Rule**: Both composite key fields MUST appear in:
1. The main entity schema
2. Every bulk DTO derived from that entity
3. At the top level (not nested) for easy correlation

This enables consumers to correlate records across different bulk payloads.

### Endpoint Structure

#### Single-Item Endpoints

Pattern: `/{entity}/{key1}/{key2}`

```yaml
# Product
GET /products/{manufacturerIdGln}/{manufacturerProductNumber}
  → Returns: ProductResponse { data: Product }
  → No pagination, no cursor metadata
  → 404 Not Found if composite key unknown

# TradeItem  
GET /trade-items/{supplierIdGln}/{supplierItemNumber}
  → Returns: TradeItemResponse { data: TradeItem }
  → No pagination, no cursor metadata
  → 404 Not Found if composite key unknown
```

**Characteristics**:
- Returns exactly one entity document
- Response has `data` property with single object (not array)
- No `meta` pagination object
- Path parameters are required
- 404 error when entity not found

#### Bulk Endpoints

Pattern: `/bulk/{entity-collection}`

```yaml
# Product Bulk Endpoints
GET /bulk/products
GET /bulk/product-identifications
GET /bulk/product-details
GET /bulk/product-classifications

# TradeItem Bulk Endpoints
GET /bulk/trade-items
GET /bulk/item-identifications
GET /bulk/item-orderings
GET /bulk/item-pricings
```

**Characteristics**:
- Returns array of items in `data` property
- Includes `meta` object with cursor pagination metadata
- All query parameters are optional
- Supports filtering by selection, mutation date, manufacturer/supplier
- Returns 200 with empty array if no results

### Response Envelope Patterns

#### Single-Item Response

```yaml
# ProductResponse.yaml
type: object
additionalProperties: false
required:
  - data
properties:
  data:
    $ref: ../domain/Product.yaml
examples:
  - data:
      manufacturerIdGln: "1234567890123"
      manufacturerProductNumber: "LED-12345-A"
      manufacturerName: "Philips Lighting B.V."
      # ... full product object
```

#### Bulk Response with Cursor Pagination

```yaml
# BulkProductsResponse.yaml
type: object
additionalProperties: false
required:
  - data
  - meta
properties:
  data:
    type: array
    items:
      $ref: ../domain/Product.yaml
  meta:
    $ref: ../../../../shared/schemas/common/CursorPaginationMetadata.yaml
examples:
  - data:
      - manufacturerIdGln: "1234567890123"
        manufacturerProductNumber: "LED-12345-A"
        # ... product object
      - manufacturerIdGln: "1234567890123"
        manufacturerProductNumber: "LED-67890-B"
        # ... product object
    meta:
      cursor: "eyJpZCI6MTIzLCJzb3J0IjoibmFtZSJ9"
      hasNext: true
      hasPrev: false
      limit: 100
      estimatedTotal: 1543
```

---

## Schema Flattening Strategy

### Minimize Nesting

ETIM xChange has deeply nested structures. The OpenAPI specification flattens these for efficient API consumption:

#### Flattening Approach

1. **Extract to Separate Schemas**: Create reusable component schemas for complex nested objects
2. **Flatten Key Fields**: Move essential identification fields to top level of main entity
3. **Create Trimmed DTOs**: Build focused domain DTOs for bulk endpoints (e.g., `ProductIdentification`, `ProductDetails`, `ProductClassification`)
4. **Include Composite Keys**: Every bulk DTO must include composite key fields at top level for correlation

#### Example: Product Flattening

**ETIM xChange Structure** (nested):
```
Supplier[]
  └─ Product[]
      ├─ ProductIdentification
      │   ├─ ManufacturerIdGln
      │   ├─ ManufacturerProductNumber
      │   ├─ ManufacturerName
      │   └─ BrandName
      ├─ ProductDetails
      │   ├─ ProductStatus
      │   └─ ProductDescriptions[]
      └─ EtimClassification[]
```

**OpenAPI Structure** (flattened):
```yaml
# Product.yaml (main entity)
type: object
required:
  - manufacturerIdGln
  - manufacturerProductNumber
  - manufacturerName
  - productDescriptions
properties:
  # Flattened from ProductIdentification (top level)
  manufacturerIdGln:
    type: string
  manufacturerProductNumber:
    type: string
  manufacturerName:
    type: string
  brandName:
    type: ["string", "null"]
  
  # Flattened from ProductDetails (top level)
  productStatus:
    $ref: ../enums/ProductStatus.yaml
  
  # Complex structures kept as references
  productDescriptions:
    type: array
    items:
      $ref: ./ProductDescription.yaml
  etimClassifications:
    type: ["array", "null"]
    items:
      $ref: ./EtimClassification.yaml
```

#### Trimmed Bulk DTOs

For bulk endpoints, create focused DTOs that contain only relevant fields:

**ProductIdentification.yaml** (for `/bulk/product-identifications`):
```yaml
type: object
required:
  - manufacturerIdGln
  - manufacturerProductNumber
  - manufacturerName
properties:
  manufacturerIdGln:
    type: string
  manufacturerProductNumber:
    type: string
  manufacturerName:
    type: string
  brandName:
    type: ["string", "null"]
  productGtins:
    type: ["array", "null"]
  # ... other identification fields only
```

**ProductDetails.yaml** (for `/bulk/product-details`):
```yaml
type: object
required:
  - manufacturerIdGln
  - manufacturerProductNumber
  - productStatus
  - productType
properties:
  manufacturerIdGln:
    type: string
  manufacturerProductNumber:
    type: string
  productStatus:
    $ref: ../enums/ProductStatus.yaml
  productDescriptions:
    type: array
  warrantyConsumer:
    type: ["integer", "null"]
  # ... other detail fields only
```

### Field Mapping Convention

Every flattened field must document its ETIM xChange origin:

```yaml
manufacturerName:
  type: string
  minLength: 1
  maxLength: 80
  description: |
    Full name of the manufacturer.
    
    **ETIM xChange**: `ManufacturerName`  
    **Path**: `Supplier[].Product[].ProductIdentification.ManufacturerName`
  examples:
    - "Philips Lighting B.V."
    - "OSRAM GmbH"
```

**Required Documentation Elements**:
1. Business description of the field's purpose
2. Original ETIM xChange field name (PascalCase)
3. Full JSON path in ETIM schema
4. Realistic examples

---

## Bulk Service Design

### Query Parameters

All bulk endpoints support the following query parameters (all optional):

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `cursor` | string | Pagination cursor token from previous response | `eyJpZCI6MTIzfQ==` |
| `limit` | integer | Page size (default: 100, max: 1000) | `250` |
| `selectionId` | string | Filter by selection identifier | `WINTER-2025` |
| `mutationDate` | string (date) | Filter by mutation date (ISO 8601) | `2025-01-15` |
| Scoping filter | string | Manufacturer/supplier GLN filter | `1234567890123` |

**Example Parameters Definition**:

```yaml
# cursor.yaml
name: cursor
in: query
required: false
schema:
  type: string
  description: |
    Opaque pagination cursor token returned from previous response.
    Pass this value to retrieve the next page of results.
example: "eyJpZCI6MTIzLCJzb3J0IjoibmFtZSJ9"

# limit.yaml
name: limit
in: query
required: false
schema:
  type: integer
  minimum: 1
  maximum: 1000
  default: 100
  description: |
    Maximum number of items to return per page.
example: 250

# mutation-date.yaml
name: mutationDate
in: query
required: false
schema:
  type: string
  format: date
  description: |
    Filter results to items mutated on or after this date. ISO 8601 date format (YYYY-MM-DD).
example: "2025-01-15"
```

### Pagination Strategy

**Cursor-Based Pagination** using `CursorPaginationMetadata`:

```yaml
# CursorPaginationMetadata.yaml
type: object
additionalProperties: false
required:
  - hasNext
  - hasPrev
  - limit
properties:
  cursor:
    type: ["string", "null"]
    description: |
      Opaque cursor token for the current page. Pass this to the next request to retrieve the next page.
  prevCursor:
    type: ["string", "null"]
    description: |
      Opaque cursor token for the previous page. Pass this to retrieve the previous page.
  hasNext:
    type: boolean
    description: Indicates if there are more results available after the current page.
  hasPrev:
    type: boolean
    description: Indicates if there are results available before the current page.
  limit:
    type: integer
    minimum: 1
    maximum: 1000
    description: The page size limit used for this response.
  estimatedTotal:
    type: ["integer", "null"]
    minimum: 0
    description: |
      Estimated total number of items matching the query. May be approximate or null if unavailable.
```

**Why Cursor-Based?**
- No offset/page-number pagination
- More efficient for large datasets
- Prevents issues with data changes during pagination
- Supports forward and backward navigation
- Server controls cursor generation (opaque to client)

### Bulk Endpoint Examples

#### Product Bulk Endpoints

```yaml
# GET /bulk/products
summary: Retrieve all products in bulk with cursor-based pagination
description: |
  Returns a paginated list of all products with comprehensive details.
operationId: getBulkProducts
parameters:
  - $ref: ../../../../shared/parameters/query/cursor.yaml
  - $ref: ../../../../shared/parameters/query/limit.yaml
  - $ref: ../../../../shared/parameters/query/selection-id.yaml
  - $ref: ../../../../shared/parameters/query/manufacturer-id-gln.yaml
  - $ref: ../../../../shared/parameters/query/mutation-date.yaml
responses:
  '200':
    description: Successful response with products
    content:
      application/json:
        schema:
          $ref: ../schemas/responses/BulkProductsResponse.yaml

# GET /bulk/product-identifications
summary: Retrieve product identification information in bulk
description: |
  Returns paginated product identification data (GTINs, manufacturer info, brands).
operationId: getBulkProductIdentifications
# ... similar parameters

# GET /bulk/product-details
summary: Retrieve product detail information in bulk
description: |
  Returns paginated product details (descriptions, status, warranties).
operationId: getBulkProductDetails
# ... similar parameters

# GET /bulk/product-classifications
summary: Retrieve product ETIM and other classifications in bulk
description: |
  Returns paginated product classification data (ETIM classes, features, other standards).
operationId: getBulkProductClassifications
# ... similar parameters
```

#### TradeItem Bulk Endpoints

```yaml
# GET /bulk/trade-items
summary: Retrieve all trade items in bulk with cursor-based pagination
description: |
  Returns a paginated list of all supplier trade items with comprehensive details.
operationId: getBulkTradeItems

# GET /bulk/item-identifications
summary: Retrieve trade item identification information in bulk
operationId: getBulkItemIdentifications

# GET /bulk/item-orderings
summary: Retrieve trade item ordering information in bulk
operationId: getBulkItemOrderings

# GET /bulk/item-pricings
summary: Retrieve trade item pricing information in bulk
operationId: getBulkItemPricings
```

---

## Documentation Requirements

### Every Field Must Include

1. **Business Description**: Explain the purpose and business context
2. **ETIM xChange Field Name**: Original PascalCase field name
3. **Full JSON Path**: Complete path in ETIM xChange schema
4. **Realistic Examples**: At least 2 examples, including null if nullable

### Documentation Template

```yaml
propertyName:
  type: ["string", "null"]
  minLength: 1
  maxLength: 50
  description: |
    [Business description explaining purpose, constraints, and usage]
    
    **ETIM xChange**: `OriginalFieldName`  
    **Path**: `Supplier[].Product[].Section.OriginalFieldName`
  examples:
    - "Example value 1"
    - "Example value 2"
    - null
```

### Real-World Example

```yaml
manufacturerProductNumber:
  type: string
  minLength: 1
  maxLength: 35
  description: |
    Manufacturer's unique product number (MPN). Part of the primary composite key together with manufacturerIdGln.
    This is the manufacturer's internal identifier for the product and must be unique within the manufacturer's catalog.
    
    **ETIM xChange**: `ManufacturerProductNumber`  
    **Path**: `Supplier[].Product[].ProductIdentification.ManufacturerProductNumber`
  examples:
    - "LED-12345-A"
    - "929002376910"
    - "HUE-BULB-E27-10W"

customsCommodityCode:
  type: ["string", "null"]
  minLength: 6
  maxLength: 16
  description: |
    Harmonized System (HS) customs commodity code for international trade.
    Used for customs declarations and trade statistics. May include country-specific extensions.
    
    **ETIM xChange**: `CustomsCommodityCode`  
    **Path**: `Supplier[].Product[].ProductIdentification.CustomsCommodityCode`
  examples:
    - "8539502090"
    - "851310"
    - null

warrantyConsumer:
  type: ["integer", "null"]
  minimum: 0
  exclusiveMaximum: 1000
  description: |
    Consumer warranty period in months. Indicates the standard warranty coverage for consumer purchases.
    
    **ETIM xChange**: `WarrantyConsumer`  
    **Path**: `Supplier[].Product[].ProductDetails.WarrantyConsumer`
  examples:
    - 24
    - 36
    - null
```

### Description Best Practices

- Start with a clear one-sentence summary
- Explain business context and constraints
- Mention relationships to other fields if relevant
- Note validation rules in plain language
- Include usage guidelines for complex fields
- Reference external standards when applicable (ISO, HS codes, etc.)

---

## Shared Component Reuse

### Existing Shared Schemas

Leverage existing shared schemas to maintain consistency:

#### Identifiers
```yaml
# Reference existing identifier schemas
$ref: ../../../../shared/schemas/identifiers/Gln.yaml
$ref: ../../../../shared/schemas/identifiers/Gtin.yaml
$ref: ../../../../shared/schemas/identifiers/Duns.yaml
$ref: ../../../../shared/schemas/identifiers/OrganizationIdentifier.yaml
```

#### Common Types
```yaml
# Price and quantity schemas
$ref: ../../../../shared/schemas/common/Price.yaml
$ref: ../../../../shared/schemas/common/PriceQuantity.yaml

# Standard codes
$ref: ../../../../shared/schemas/common/CurrencyCode.yaml
$ref: ../../../../shared/schemas/common/UnitCodes.yaml
$ref: ../../../../shared/schemas/common/CountryCode.yaml
$ref: ../../../../shared/schemas/common/LanguageCode.yaml

# Enums
$ref: ../../../../shared/schemas/common/AllowanceSurchargeTypes.yaml
```

#### Pagination
```yaml
# Cursor pagination metadata
$ref: ../../../../shared/schemas/common/CursorPaginationMetadata.yaml
```

#### Error Responses
```yaml
# RFC 7807 Problem Details
$ref: ../../../../shared/schemas/common/ProblemDetails.yaml
$ref: ../../../../shared/schemas/common/ValidationProblemDetails.yaml
```

### Shared Parameters

Reference shared parameters to avoid duplication:

```yaml
# Path parameters
$ref: ../../../../shared/parameters/path/supplier-id-gln.yaml
$ref: ../../../../shared/parameters/path/manufacturer-id-gln.yaml
$ref: ../../../../shared/parameters/path/supplier-item-number.yaml
$ref: ../../../../shared/parameters/path/manufacturer-product-number.yaml

# Query parameters
$ref: ../../../../shared/parameters/query/cursor.yaml
$ref: ../../../../shared/parameters/query/limit.yaml
$ref: ../../../../shared/parameters/query/selection-id.yaml
$ref: ../../../../shared/parameters/query/mutation-date.yaml
$ref: ../../../../shared/parameters/query/supplier-id-gln.yaml
$ref: ../../../../shared/parameters/query/manufacturer-id-gln.yaml
$ref: ../../../../shared/parameters/query/sort-order.yaml
```

### Shared Responses

Reference shared error responses:

```yaml
# Standard error responses
responses:
  '400':
    $ref: ../../../../shared/responses/400-bad-request.yaml
  '401':
    $ref: ../../../../shared/responses/401-unauthorized.yaml
  '403':
    $ref: ../../../../shared/responses/403-forbidden.yaml
  '404':
    $ref: ../../../../shared/responses/404-not-found.yaml
  '500':
    $ref: ../../../../shared/responses/500-internal-server-error.yaml
```

---

## Validation & Error Handling

### Validation Constraints

Apply strict validation constraints to all fields:

#### String Patterns

```yaml
# GLN (Global Location Number)
manufacturerIdGln:
  type: string
  pattern: "^[0-9]{13}$"
  examples:
    - "1234567890123"

# GTIN (Global Trade Item Number)
productGtin:
  type: string
  pattern: "^[0-9]{8,14}$"
  examples:
    - "8718699673826"
    - "12345678"

# DUNS (Data Universal Numbering System)
manufacturerIdDuns:
  type: ["string", "null"]
  pattern: "^[0-9]{9}$"
  examples:
    - "123456789"
    - null

# Currency Code (ISO 4217)
currency:
  type: string
  pattern: "^[A-Z]{3}$"
  examples:
    - "EUR"
    - "USD"

# Country Code (ISO 3166-1 alpha-2)
countryOfOrigin:
  type: string
  pattern: "^[A-Z]{2}$"
  examples:
    - "NL"
    - "DE"

# Language Code (ISO 639-1)
language:
  type: string
  pattern: "^[a-z]{2}$"
  examples:
    - "en"
    - "nl"
```

#### Numeric Constraints

```yaml
# Decimal number with precision
netPrice:
  type: number
  format: decimal
  minimum: 0
  multipleOf: 0.01
  examples:
    - 19.99
    - 1234.50

# Integer with range
warrantyConsumer:
  type: ["integer", "null"]
  minimum: 0
  exclusiveMaximum: 1000
  examples:
    - 24
    - null

# Quantity
quantity:
  type: number
  minimum: 0
  multipleOf: 0.0001
  examples:
    - 1.0
    - 100.5
```

#### String Length

```yaml
manufacturerName:
  type: string
  minLength: 1
  maxLength: 80

manufacturerProductNumber:
  type: string
  minLength: 1
  maxLength: 35

brandName:
  type: ["string", "null"]
  minLength: 1
  maxLength: 50
```

#### Array Constraints

```yaml
productGtins:
  type: ["array", "null"]
  uniqueItems: true
  items:
    type: string
    pattern: "^[0-9]{8,14}$"

productDescriptions:
  type: array
  minItems: 1
  items:
    $ref: ./ProductDescription.yaml
```

### Error Handling (RFC 7807)

All error responses follow RFC 7807 Problem Details format:

#### ProblemDetails Schema

```yaml
type: object
additionalProperties: false
required:
  - type
  - title
  - status
properties:
  type:
    type: string
    format: uri
    description: |
      A URI reference that identifies the problem type.
    examples:
      - "https://api.example.com/problems/bad-request"
  title:
    type: string
    description: |
      A short, human-readable summary of the problem type.
    examples:
      - "Bad Request"
  status:
    type: integer
    minimum: 400
    maximum: 599
    description: |
      The HTTP status code.
    examples:
      - 400
  detail:
    type: ["string", "null"]
    description: |
      A human-readable explanation specific to this occurrence of the problem.
    examples:
      - "The manufacturerIdGln field must be exactly 13 digits."
      - null
  instance:
    type: ["string", "null"]
    format: uri
    description: |
      A URI reference that identifies the specific occurrence of the problem.
    examples:
      - "/products/1234567890123/LED-12345-A"
      - null
```

#### Standard Error Responses

```yaml
# 400 Bad Request
description: |
  The request was invalid or cannot be served. The exact error is explained in the response body.
content:
  application/json:
    schema:
      $ref: ../../../../shared/schemas/common/ProblemDetails.yaml
    example:
      type: "https://api.example.com/problems/validation-error"
      title: "Validation Error"
      status: 400
      detail: "The manufacturerIdGln must be exactly 13 digits."
      instance: "/products/invalid-gln/LED-12345-A"

# 401 Unauthorized
description: |
  Authentication credentials were missing or incorrect.

# 403 Forbidden
description: |
  The request is understood, but it has been refused or access is not allowed.

# 404 Not Found
description: |
  The requested resource could not be found.
content:
  application/json:
    schema:
      $ref: ../../../../shared/schemas/common/ProblemDetails.yaml
    example:
      type: "https://api.example.com/problems/not-found"
      title: "Not Found"
      status: 404
      detail: "Product with manufacturerIdGln '1234567890123' and manufacturerProductNumber 'LED-12345-A' not found."
      instance: "/products/1234567890123/LED-12345-A"

# 500 Internal Server Error
description: |
  An unexpected error occurred on the server.
content:
  application/json:
    schema:
      $ref: ../../../../shared/schemas/common/ProblemDetails.yaml
    example:
      type: "https://api.example.com/problems/internal-error"
      title: "Internal Server Error"
      status: 500
      detail: "An unexpected error occurred while processing your request."
      instance: "/bulk/products"
```

#### ValidationProblemDetails (Extended)

For validation errors with field-specific details:

```yaml
allOf:
  - $ref: ./ProblemDetails.yaml
  - type: object
    properties:
      errors:
        type: object
        additionalProperties:
          type: array
          items:
            type: string
        description: |
          Dictionary of field-specific validation errors.
        examples:
          - manufacturerIdGln:
              - "Must be exactly 13 digits"
            manufacturerProductNumber:
              - "Cannot be empty"
              - "Maximum length is 35 characters"
```

---

## Summary

These design decisions establish a consistent, standards-compliant OpenAPI 3.1 specification for the ETIM xChange V2.0 schema, focusing on:

1. **Type Safety**: Proper numeric types, nullable patterns, and strict validation
2. **Consistency**: Uniform naming conventions across files, components, properties, and paths
3. **Efficiency**: Flattened schemas with cursor-based pagination for bulk operations
4. **Traceability**: Complete documentation mapping back to ETIM xChange source
5. **Reusability**: Extensive use of shared components and parameters
6. **Standards Compliance**: OpenAPI 3.1, JSON Schema 2020-12, RFC 7807, ISO standards

These patterns ensure the API is developer-friendly, performant, and maintainable while accurately representing the rich ETIM xChange product data model.
