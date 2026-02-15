# ETIM xChange TradeItem OpenAPI 3.1 Generation Prompt

## Objective
Generate a comprehensive OpenAPI 3.1 specification for the **TradeItem** part of the ETIM xChange V2.0 schema, creating bulk services with cursor-based pagination and minimal nesting.

## Context Files
- **Source Schema**: `resources/etim-xchange/ETIM xChange_Schema_V2-0_beta_2025-10-13.json` (TradeItem section starting at line 1690)
- **Project Standards**: `.github/copilot-instructions.md`

## Requirements

### 1. OpenAPI 3.1 / JSON Schema 2020-12 Standards
- Use `type: ["string", "null"]` for nullable fields (NOT `nullable: true`)
- Use `examples` array (plural) in schemas, not `example` (singular)
- Include `format` for type hints: `uri`, `email`, `date`, `uuid`, etc.
- Use `minLength`, `maxLength`, `minimum`, `maximum` for validation
- Set `additionalProperties: false` for strict validation
- Use `anyOf`, `oneOf`, `allOf` for composition patterns
- Prefer `const` over single-value `enum` for literal values
- **Convert ETIM xChange string-based numeric fields to proper `number` type** (see section 2.1)

#### 2.1. Numeric Field Conversion

**CRITICAL**: ETIM xChange schema stores all numeric values as strings with patterns (e.g., `"pattern": "^[0-9]{1,11}[.]{0,1}[0-9]{0,4}$"`). 
The OpenAPI specification MUST convert these to proper `number` type with appropriate constraints.

**Conversion Rules**:

| ETIM xChange Pattern | OpenAPI Type | Constraints | Example Fields |
|---------------------|--------------|-------------|----------------|
| `^[0-9]{1,11}[.]{0,1}[0-9]{0,4}$` | `number` | `minimum: 0`, `multipleOf: 0.0001`, `maximum: 99999999999.9999` | Price, weight, dimensions, quantities |
| `^[0-9]{1,5}[.]{0,1}[0-9]{0,4}$` | `number` | `minimum: 0`, `multipleOf: 0.0001`, `maximum: 99999.9999` | PriceQuantity, factors |
| `^[0-9]{1,12}[.]{0,1}[0-9]{0,4}$` | `number` | `minimum: 0`, `multipleOf: 0.0001`, `maximum: 999999999999.9999` | Large measurements |
| `^[-]{0,1}[0-9]{1,12}[.]{0,1}[0-9]{0,4}$` | `number` | `multipleOf: 0.0001`, `minimum: -999999999999.9999`, `maximum: 999999999999.9999` | Signed values |

**Example Conversions**:

```yaml
# ETIM xChange (string) ❌
NetPrice:
  type: "string"
  pattern: "^[0-9]{1,11}[.]{0,1}[0-9]{0,4}$"

# OpenAPI (number) ✅ CORRECT
netPrice:
  type: number
  format: decimal
  minimum: 0
  multipleOf: 0.0001
  maximum: 99999999999.9999
  description: |
    Net price of the trade item. Supports up to 4 decimal places for precise pricing.
    
    **ETIM xChange**: `NetPrice` (string with pattern)  
    **Path**: `Supplier[].Product[].TradeItem[].Pricing[].NetPrice`
  examples:
    - 12345.67
    - 99.99
    - 0.01

# ETIM xChange (string) ❌
PriceQuantity:
  type: "string"
  pattern: "^[0-9]{1,5}[.]{0,1}[0-9]{0,4}$"

# OpenAPI (number) ✅ CORRECT
priceQuantity:
  type: number
  format: decimal
  minimum: 0
  multipleOf: 0.0001
  maximum: 99999.9999
  description: |
    Quantity for which the price applies.
    
    **ETIM xChange**: `PriceQuantity` (string with pattern)  
    **Path**: `Supplier[].Product[].TradeItem[].Pricing[].PriceQuantity`
  examples:
    - 1
    - 10.5
    - 100

# ETIM xChange (string) ❌
MinimumOrderQuantity:
  type: "string"
  pattern: "^[0-9]{1,11}[.]{0,1}[0-9]{0,4}$"

# OpenAPI (number) ✅ CORRECT
minimumOrderQuantity:
  type: number
  format: decimal
  minimum: 0
  multipleOf: 0.0001
  maximum: 99999999999.9999
  description: |
    Minimum quantity that must be ordered.
    
    **ETIM xChange**: `MinimumOrderQuantity` (string with pattern)  
    **Path**: `Supplier[].Product[].TradeItem[].Ordering.MinimumOrderQuantity`
  examples:
    - 1
    - 10.5
    - 500

# ETIM xChange (string) ❌
BaseItemNetWeight:
  type: "string"
  pattern: "^[0-9]{1,12}[.]{0,1}[0-9]{0,4}$"

# OpenAPI (number) ✅ CORRECT
baseItemNetWeight:
  type: ["number", "null"]
  format: decimal
  minimum: 0
  multipleOf: 0.0001
  maximum: 999999999999.9999
  description: |
    Net weight of the base item in specified unit.
    
    **ETIM xChange**: `BaseItemNetWeight` (string with pattern)  
    **Path**: `Supplier[].Product[].TradeItem[].ItemLogisticDetails[].BaseItemNetWeight`
  examples:
    - 1.5
    - 0.025
    - 1250.75
```

**Fields to Convert** (non-exhaustive list):
- **All pricing fields**: `NetPrice`, `GrossListPrice`, `RecommendedRetailPrice`, `PriceQuantity`, `PriceUnitFactor`
- **All ordering quantities**: `MinimumOrderQuantity`, `OrderStepSize`, `MaximumOrderQuantity`
- **All measurements**: `BaseItemNetLength`, `BaseItemNetWidth`, `BaseItemNetHeight`, `BaseItemNetDiameter`, `BaseItemNetWeight`
- **Packaging dimensions**: `GrossLength`, `GrossWidth`, `GrossHeight`, `GrossDiameter`, `GrossWeight`
- **All factors and multipliers**: `FactorCustomsCommodityCode`, `ContentQuantity`
- **Related item quantities**: `RelatedItemQuantity`, `QuantityInParent`

**Integer-Only Fields**: Keep as `integer` type for true integers (e.g., `ShelfLifePeriod`, `WarrantyConsumer`, `PackagingUnitLevel`)

#### 2.2. Nullable Fields

**CRITICAL**: ETIM xChange schema doesn't explicitly distinguish between nullable and optional fields. For OpenAPI 3.1, use proper nullable types.

**Pattern for Nullable Fields**:
```yaml
# Required field (not nullable)
minimalItemDescription:
  type: string
  minLength: 1
  maxLength: 80
  description: |
    Minimal description of the trade item.
    
    **ETIM xChange**: `MinimalItemDescription`
    **Path**: `Supplier[].Product[].TradeItem[].ItemDetails.ItemDescriptions[].MinimalItemDescription`

# Optional field that can be null
supplierAltItemNumber:
  type: ["string", "null"]
  minLength: 1
  maxLength: 35
  description: |
    Alternative supplier item number. Optional field that may be omitted or explicitly null.
    
    **ETIM xChange**: `SupplierAltItemNumber`
    **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.SupplierAltItemNumber`
  examples:
    - "ALT-SKU-001"
    - null

# Nullable numeric field
baseItemNetWeight:
  type: ["number", "null"]
  format: decimal
  minimum: 0
  multipleOf: 0.0001
  maximum: 999999999999.9999
  description: |
    Net weight of the base item. Can be null if weight is not applicable.
    
    **ETIM xChange**: `BaseItemNetWeight` (string with pattern)
    **Path**: `Supplier[].Product[].TradeItem[].ItemLogisticDetails[].BaseItemNetWeight`
  examples:
    - 1.5
    - 0.025
    - null
```

**Guidelines**:
- Use `type: ["string", "null"]` for optional string fields
- Use `type: ["number", "null"]` for optional numeric fields
- Use `type: ["boolean", "null"]` for optional boolean fields
- Use `type: ["array", "null"]` for optional arrays
- Do NOT add field to `required` array if it can be null/omitted
- Always include `null` in examples when field is nullable

#### 2.3. String Boolean Enums

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
    RoHS (Restriction of Hazardous Substances) compliance indicator.
    - "true": RoHS compliant
    - "false": Not RoHS compliant
    - "exempt": RoHS exempt under specific exemption
    
    **ETIM xChange**: `RohsIndicator`
    **Path**: `Supplier[].Product[].TradeItem[].Legislation.RohsIndicator`
  examples:
    - "true"
    - "exempt"

reachIndicator:
  type: ["string", "null"]
  enum: ["true", "false", "no data", null]
  description: |
    REACH (Registration, Evaluation, Authorisation of Chemicals) indicator.
    - "true": Contains SVHC substances
    - "false": Does not contain SVHC substances
    - "no data": REACH status unknown
    
    **ETIM xChange**: `ReachIndicator`
    **Path**: `Supplier[].Product[].TradeItem[].Legislation.ReachIndicator`
  examples:
    - "false"
    - "no data"
```

**Do NOT convert these to boolean** - keep as string enums because they have more than two states.

#### 2.4. Date Format Enhancement

**ETIM xChange Pattern**:
```json
"ItemValidityDate": {
  "type": "string",
  "format": "date"
}
```

**OpenAPI 3.1 Enhanced Pattern**:
```yaml
itemValidityDate:
  type: ["string", "null"]
  format: date
  description: |
    Date from which the trade item is valid for ordering. ISO 8601 date format (YYYY-MM-DD).
    
    **ETIM xChange**: `ItemValidityDate`
    **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.ItemValidityDate`
  examples:
    - "2025-01-15"
    - "2024-06-01"

itemObsolescenceDate:
  type: ["string", "null"]
  format: date
  description: |
    Date when the trade item becomes obsolete and is no longer available for ordering.
    ISO 8601 date format (YYYY-MM-DD).
    
    **ETIM xChange**: `ItemObsolescenceDate`
    **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.ItemObsolescenceDate`
  examples:
    - "2026-12-31"
    - null
```

**Date Field Guidelines**:
- Always use `format: date` for date-only fields (not datetime)
- Include explicit description: "ISO 8601 date format (YYYY-MM-DD)"
- Provide realistic examples in YYYY-MM-DD format
- Make nullable with `type: ["string", "null"]` if date is optional
- Common date fields: `itemValidityDate`, `itemObsolescenceDate`, `catalogueValidityStart`, `catalogueValidityEnd`, `generationDate`

### 2. Naming Conventions

#### File Naming
- **PascalCase** for schema files: `TradeItem.yaml`, `ItemIdentification.yaml`, `ItemPricing.yaml`
- **kebab-case** for parameter/response files: `selection-id.yaml`, `mutation-date.yaml`

#### Component Names (for $ref)
- **PascalCase** for ALL component references: `TradeItem`, `ItemIdentification`, `SelectionId`
- Component keys must match regex: `^[a-zA-Z0-9\.\-_]+$`

#### Schema Properties & Parameters
- **camelCase** for properties: `supplierItemNumber`, `itemGtin`, `mutationDateTime`
- **camelCase** for parameter names: `supplierIdGln`, `selectionId`, `mutationDateTime`
- **camelCase** for operationIds: `getBulkTradeItemDetails`, `getTradeItemDetails`

#### API Paths
- **kebab-case** for path segments: `/bulk/trade-item-details`, `/bulk/trade-item-orderings`
- Prefix all bulk endpoints with `/bulk/``

### 3. Architecture & Structure

#### Directory Structure
```
openapi/apis/tradeitem/
├── openapi.yaml                          # Main API spec (includes single + bulk)
├── README.md
├── paths/
│   ├── bulk/                             # Bulk endpoints
│   │   ├── trade-item-details.yaml       # GET /bulk/trade-item-details (consolidates identification + details)
│   │   ├── trade-item-orderings.yaml     # GET /bulk/trade-item-orderings
│   │   └── trade-item-pricings.yaml      # GET /bulk/trade-item-pricings
│   ├── trade-items.yaml                  # GET /{supplierIdGln}/{supplierItemNumber}
│   ├── trade-item-details.yaml           # GET /{key}/details
│   ├── trade-item-orderings.yaml         # GET /{key}/orderings
│   └── trade-item-pricings.yaml          # GET /{key}/pricings
└── schemas/
    ├── domain/                           # Domain models
    │   ├── TradeItemDetails.yaml         # Without key (for nested single-item)
    │   ├── TradeItemDetailsSummary.yaml  # WITH key (for bulk retrieval)
    │   ├── TradeItemOrdering.yaml        # Without key (for nested single-item)
    │   ├── TradeItemOrderingsSummary.yaml # WITH key (for bulk retrieval)
    │   ├── ItemPricing.yaml
    │   ├── TradeItemPricingSummary.yaml  # WITH key (for bulk retrieval, 1 row per price)
    │   ├── ItemLogistics.yaml
    │   ├── ItemRelation.yaml
    │   ├── PackagingUnit.yaml
    │   ├── ItemDescription.yaml
    │   └── ItemCountrySpecificField.yaml
    ├── responses/
    │   ├── TradeItemResponse.yaml              # Single-item nested response
    │   ├── TradeItemDetailsResponse.yaml       # Single-item details subresource
    │   ├── TradeItemOrderingsResponse.yaml     # Single-item orderings subresource
    │   ├── TradeItemPricingsResponse.yaml      # Single-item pricings subresource
    │   ├── TradeItemAllowanceSurchargesResponse.yaml  # Single-item allowance-surcharges subresource
    │   ├── TradeItemAllowanceSurchargeItem.yaml       # Surcharge with pricing join keys
    │   ├── BulkTradeItemDetailsResponse.yaml   # Bulk details
    │   ├── BulkTradeItemOrderingsResponse.yaml # Bulk orderings
    │   ├── BulkTradeItemPricingsResponse.yaml  # Bulk pricings
    │   └── BulkAllowanceSurchargesResponse.yaml # Bulk allowance-surcharges
    └── enums/
        ├── ItemStatus.yaml
        ├── ItemCondition.yaml
        └── RelationType.yaml
```

**Schema Naming Convention** (following Product API pattern):
- `*Details.yaml` / `*Ordering.yaml` → WITHOUT key fields (for nested single-item responses)
- `*Summary.yaml` → WITH key fields embedded (for bulk flat retrieval)

#### Shared Parameters (use existing)
```
openapi/shared/parameters/query/
├── selection-id.yaml                     # EXISTS - reuse
├── mutation-date-time.yaml               # EXISTS - reuse (datetime format, NOT date)
├── cursor.yaml                           # EXISTS - reuse
└── limit.yaml                            # EXISTS - reuse
```

**Note**: All required query parameters already exist. Do NOT create new parameter files.

### 4. Key Identifiers

The **primary composite key** for TradeItem:
- `supplierIdGln` (string, pattern: `^[0-9]{13}$`)
- `supplierItemNumber` (string, minLength: 1, maxLength: 35)

### 4.1. Server URLs

Following the Product API pattern:
```yaml
servers:
  - url: https://rest.2ba.nl/v1/tradeitems
    description: Production server
  - url: https://rest.accept.2ba.nl/v1/tradeitems
    description: Acceptance server
```

### 4.2. Pricing Reference Key (`pricingRef`)

In ETIM xChange, `AllowanceSurcharge[]` is nested inside `Pricing[]`. When the API flattens this into separate endpoints (pricings vs. allowance-surcharges), a correlation key is needed to link surcharges back to their parent pricing entry.

`pricingRef` is a **server-generated opaque reference key** (typed as `TechnicalId`) that uniquely identifies a pricing entry within the scope of a trade item (scoped by `supplierIdGln` + `supplierItemNumber`).

**Key characteristics**:
- **NOT present in the ETIM xChange domain model** — this is a technical addition for the API
- Typed as `TechnicalId` (string, 1-50 chars): `$ref: ../../../../shared/schemas/identifiers/TechnicalId.yaml`
- Opaque to clients — format may vary (human-readable slug or UUID)
- Required field on all pricing and allowance/surcharge schemas
- Used as the join key between `/pricings` and `/allowance-surcharges` endpoints (both single-item and bulk)

**Join pattern**:
- **Single-item**: Use `pricingRef` to correlate entries from `/{key}/pricings` with `/{key}/allowance-surcharges`
- **Bulk**: Use `supplierIdGln` + `supplierItemNumber` + `pricingRef` to join `/bulk/trade-item-pricings` with `/bulk/trade-item-allowance-surcharges`

**Format examples** (opaque — clients must not parse):
```yaml
pricingRef:
  description: |
    Server-generated opaque reference key that uniquely identifies this pricing entry
    within the scope of a trade item (identified by `supplierIdGln` + `supplierItemNumber`).
    
    This is a technical identifier not present in the ETIM xChange domain model.
    Use `pricingRef` to correlate pricing entries with their allowances/surcharges
    from the `/allowance-surcharges` endpoint.
  $ref: ../../../../shared/schemas/identifiers/TechnicalId.yaml
  examples:
    - "price-c62-1-20250101"
    - "f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

**Schemas that include `pricingRef`**:
| Schema | Context | Required |
|--------|---------|----------|
| `TradeItemPricing.yaml` | Single-item pricing (without trade item key) | ✅ |
| `TradeItemPricingSummary.yaml` | Bulk pricing (with trade item key) | ✅ |
| `TradeItemAllowanceSurchargeItem.yaml` | Single-item surcharge response | ✅ |
| `AllowanceSurchargeSummary.yaml` | Bulk surcharge (with trade item key) | ✅ |

### 4.3. Selection Identifier (`selectionId`) and `TechnicalId`

The `selectionId` query parameter allows filtering bulk endpoint results by a predefined selection/subset (e.g., seasonal catalogs, quarterly selections).

**`TechnicalId` schema** (`openapi/shared/schemas/identifiers/TechnicalId.yaml`):
```yaml
type: string
description: >-
  Generic technical identifier that can hold an integer, string, or GUID/UUID value.
  Used for opaque system-generated identifiers such as selection IDs, internal references,
  and other technical keys where the format is not prescribed.
minLength: 1
maxLength: 50
examples:
  - 'SELECTION-2024-Q1'
  - '123456'
  - 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
```

`TechnicalId` is the shared schema type used for:
- `selectionId` query parameter (via `$ref` in `selection-id.yaml`)
- `pricingRef` property in pricing and allowance/surcharge schemas

The `selectionId` parameter definition (`openapi/shared/parameters/query/selection-id.yaml`) references `TechnicalId` via `$ref`:
```yaml
name: selectionId
in: query
description: Filter results by selection identifier. Used to retrieve a specific subset
  of items based on a predefined selection.
required: false
schema:
  $ref: ../../schemas/identifiers/TechnicalId.yaml
example: "SELECTION-2024-Q1"
```

In `openapi.yaml`, register both as named components:
```yaml
schemas:
  TechnicalId:
    $ref: ../../shared/schemas/identifiers/TechnicalId.yaml
parameters:
  SelectionId:
    $ref: ../../shared/parameters/query/selection-id.yaml
```

### 5. TradeItem Service Design

#### Regular TradeItem Endpoints

**GET /{supplierIdGln}/{supplierItemNumber}**
- **Description**: Retrieve the complete trade item information for a single supplier item combination
- **Path Parameters**:
  - `supplierIdGln` (required): Supplier GLN. Must match `^[0-9]{13}$`
  - `supplierItemNumber` (required): Supplier item number (1-35 characters)
- **Response**: `TradeItemResponse` with nested structure (key at root, components nested)
- **Behavior**: Returns exactly one trade item document. No pagination, no cursor metadata. Respond with `404 Not Found` when the composite key is unknown.

**Subresource Endpoints** (following product API pattern):

**GET /{supplierIdGln}/{supplierItemNumber}/details**
- **Description**: Retrieve item identification and details for a specific trade item
- **Response**: `TradeItemDetailsResponse` with key at root + nested `details` object

**GET /{supplierIdGln}/{supplierItemNumber}/orderings**
- **Description**: Retrieve ordering information for a specific trade item
- **Response**: `TradeItemOrderingsResponse` with key at root + nested `orderings` object

**GET /{supplierIdGln}/{supplierItemNumber}/pricings**
- **Description**: Retrieve pricing information for a specific trade item
- **Response**: `TradeItemPricingsResponse` with key at root + nested `pricings` array
- **Allowances/Surcharges**: Available via separate `/{supplierIdGln}/{supplierItemNumber}/allowance-surcharges` endpoint

**GET /{supplierIdGln}/{supplierItemNumber}/allowance-surcharges**
- **Description**: Retrieve allowances and surcharges for a specific trade item
- **Response**: `TradeItemAllowanceSurchargesResponse` with key at root + nested `allowanceSurcharges` array
- **Correlation**: Each entry includes `pricingRef` to correlate with the corresponding pricing entry from the `/pricings` endpoint

### 6. Bulk Service Design

#### Bulk Endpoint Consolidation

The bulk API consolidates ETIM xChange's separate `ItemIdentification` and `ItemDetails` sections into a single endpoint:

| Endpoint | Consolidates | Schema |
|----------|--------------|--------|
| `/bulk/trade-item-details` | `ItemIdentification` + `ItemDetails` | `TradeItemDetailsSummary` |
| `/bulk/trade-item-orderings` | `Ordering` | `TradeItemOrderingsSummary` |
| `/bulk/trade-item-pricings` | `Pricing[]` | `TradeItemPricingSummary` (1 row per price) |

**Note**: There is no separate `/bulk/trade-items` or `/bulk/item-identifications` endpoint. 
The `/bulk/trade-item-details` endpoint provides all identification fields (GTINs, manufacturer numbers, 
discount/bonus groups, validity dates) combined with item details (status, condition, descriptions).

#### Bulk Flattening Strategy

**Design Philosophy**: Maximize flattening for predictable pagination and ETL compatibility.

| Endpoint | Rows per Item | Flattening Pattern |
|----------|---------------|-------------------|
| `/bulk/trade-item-details` | 1 | Fully flat (all fields inline) |
| `/bulk/trade-item-orderings` | 1 | Fully flat (all fields inline) |
| `/bulk/trade-item-descriptions` | n (per language) | Flat per language row |
| `/bulk/trade-item-pricings` | n (per price tier) | **Flat per price entry** |
| `/bulk/trade-item-allowance-surcharges` | n (per surcharge) | **Flat per surcharge entry** |

**Pricing Flattening** (consistent with `ProductEtimClassificationFeature` pattern):
- Each row = 1 price entry with embedded composite key
- Trade items with quantity tiers generate multiple rows
- Allows predictable payload sizes and efficient cursor pagination

**Allowance/Surcharge Separation** (star schema pattern):
- Moved from nested array within pricing to separate `/bulk/trade-item-allowance-surcharges` endpoint
- Each row = 1 surcharge entry with `pricingRef` linking to the parent pricing entry
- Enables clean dimensional modeling: pricing fact table + surcharges fact table
- Join via: `supplierIdGln` + `supplierItemNumber` + `pricingRef`

**Nested structures retained**:
- Simple string arrays (`itemGtins[]`) - minimal impact on row predictability

#### Bulk Endpoints to Create

**GET /bulk/trade-item-details**
- **Description**: Retrieve trade item identification AND details (status, descriptions) in bulk with cursor-based pagination. This endpoint consolidates what would have been separate trade-items and item-identifications endpoints.
- **Query Parameters**:
  - `cursor` (optional): Pagination cursor
  - `limit` (optional): Number of items per page (default: 100, max: 1000)
  - `selectionId` (optional): Filter by selection identifier
  - `supplierIdGln` (optional): Filter by supplier GLN
  - `mutationDateTime` (optional): Filter by mutation timestamp (RFC 3339 / ISO 8601 UTC format with 'Z' suffix)
- **Response**: `BulkTradeItemDetailsResponse` using `TradeItemDetailsSummary` schema

**GET /bulk/trade-item-orderings**
- **Description**: Retrieve trade item ordering information (units, quantities, step sizes) in bulk with cursor-based pagination
- **Query Parameters**:
  - `cursor` (optional): Pagination cursor
  - `limit` (optional): Number of items per page (default: 100, max: 1000)
  - `selectionId` (optional): Filter by selection identifier
  - `supplierIdGln` (optional): Filter by supplier GLN
  - `mutationDateTime` (optional): Filter by mutation timestamp (RFC 3339 / ISO 8601 UTC format with 'Z' suffix)
- **Response**: `BulkTradeItemOrderingsResponse` using `TradeItemOrderingsSummary` schema

**GET /bulk/trade-item-pricings**
- **Description**: Retrieve trade item pricing information (prices, currencies, allowances) in bulk with cursor-based pagination. **Flattened structure**: 1 row per price entry (not grouped by item)
- **Query Parameters**:
  - `cursor` (optional): Pagination cursor
  - `limit` (optional): Number of items per page (default: 100, max: 1000)
  - `selectionId` (optional): Filter by selection identifier
  - `supplierIdGln` (optional): Filter by supplier GLN
  - `mutationDateTime` (optional): Filter by mutation timestamp (RFC 3339 / ISO 8601 UTC format with 'Z' suffix)
- **Response**: `BulkTradeItemPricingsResponse` using `TradeItemPricingSummary` schema
- **Note**: A trade item with multiple price tiers will generate multiple rows with the same key but different pricing data. This follows the same pattern as `/bulk/product-etim-classifications`
- **Allowances/Surcharges**: Available via separate `/bulk/trade-item-allowance-surcharges` endpoint (not embedded)

**GET /bulk/trade-item-allowance-surcharges**
- **Description**: Retrieve trade item allowances and surcharges in bulk with cursor-based pagination. **Flattened structure**: 1 row per surcharge entry
- **Query Parameters**:
  - `cursor` (optional): Pagination cursor
  - `limit` (optional): Number of items per page (default: 100, max: 1000)
  - `selectionId` (optional): Filter by selection identifier
  - `supplierIdGln` (optional): Filter by supplier GLN
  - `mutationDateTime` (optional): Filter by mutation timestamp (RFC 3339 / ISO 8601 UTC format with 'Z' suffix)
- **Response**: `BulkAllowanceSurchargesResponse` using `AllowanceSurchargeSummary` schema
- **Correlation**: Each entry includes `pricingRef` to correlate with the corresponding pricing entry. Join via: `supplierIdGln` + `supplierItemNumber` + `pricingRef`

#### Response Structure (Cursor-Based Pagination)

All bulk endpoints return paginated responses using this structure pattern:

```yaml
type: object
additionalProperties: false
required:
  - data
  - meta
properties:
  data:
    type: array
    description: Array of trade item summaries (specific to each endpoint)
    items:
      $ref: ../domain/TradeItemDetailsSummary.yaml  # Or *OrderingsSummary, *PricingsSummary
  meta:
    $ref: ../../../../shared/schemas/common/CursorPaginationMetadata.yaml
examples:
  - data:
      - supplierIdGln: "1234567890123"
        supplierItemNumber: "SKU-12345"
        itemStatus: "ACTIVE"
        itemCondition: "NEW"
        minimalItemDescription: "LED Lamp 10W E27"
    meta:
      cursor: "eyJpZCI6MTIzfQ=="
      hasNext: true
      hasPrev: false
      limit: 100
      estimatedTotal: 15420
```

### 7. Response Structures

#### Single Trade Item Response (Nested Structure)

Following the Product API pattern, single-item responses use a **nested structure** with key at root:

Use `TradeItemResponse.yaml` for the main `GET /{supplierIdGln}/{supplierItemNumber}` endpoint:

```yaml
type: object
description: |
  Response containing a single trade item with all its components.
  
  The trade item key (`supplierIdGln` + `supplierItemNumber`) is at the root level,
  with nested objects for each component:
  - `details`: Item identification, status, conditions, descriptions
  - `orderings`: Ordering units, quantities, step sizes
  - `pricings`: Array of pricing information
  - `logistics`: Array of logistic details
  - `packagingUnits`: Array of packaging unit information
  - `itemRelations`: Array of related items
additionalProperties: false
required:
  - data
properties:
  data:
    type: object
    additionalProperties: false
    required:
      - supplierIdGln
      - supplierItemNumber
      - details
    properties:
      supplierIdGln:
        type: string
        pattern: "^[0-9]{13}$"
        description: Global Location Number (GLN) uniquely identifying the supplier
      supplierItemNumber:
        type: string
        minLength: 1
        maxLength: 35
        description: Supplier's unique item number/code
      details:
        $ref: ../domain/TradeItemDetails.yaml
        description: Item identification, status, and details
      orderings:
        $ref: ../domain/TradeItemOrdering.yaml
        description: Ordering information (units, quantities)
      pricings:
        type: ["array", "null"]
        items:
          $ref: ../domain/ItemPricing.yaml
        description: Array of pricing information
      logistics:
        type: ["array", "null"]
        items:
          $ref: ../domain/ItemLogistics.yaml
        description: Array of logistic details
      packagingUnits:
        type: ["array", "null"]
        items:
          $ref: ../domain/PackagingUnit.yaml
      itemRelations:
        type: ["array", "null"]
        items:
          $ref: ../domain/ItemRelation.yaml
examples:
  - data:
      supplierIdGln: "1234567890123"
      supplierItemNumber: "SKU-12345"
      details:
        itemStatus: "ACTIVE"
        itemCondition: "NEW"
        minimalItemDescription: "LED Lamp 10W E27"
      orderings:
        orderUnit: "PCE"
        minimumOrderQuantity: 1
        orderStepSize: 1
      pricings:
        - pricingRef: "price-c62-1-20250101"
          priceUnit: "PCE"
          priceQuantity: 1
          netPrice: 9.99
          currencyCode: "EUR"
          priceValidityDate: "2025-01-01"
```

#### *Summary Schema Pattern for Bulk Retrieval

For bulk responses, use `*Summary` schemas that include the composite key fields:

- `TradeItemDetails.yaml` → For nested single-item (without key)
- `TradeItemDetailsSummary.yaml` → For bulk retrieval (WITH key fields embedded)

### 8. Schema Flattening Strategy

**Minimize nesting** by extracting nested ETIM structures into separate, reusable schemas:

#### From ETIM xChange Schema:
```json
"TradeItem": {
  "ItemIdentification": { ... },
  "ItemDetails": { ... },
  "ItemRelations": [ ... ],
  "ItemLogisticDetails": [ ... ],
  "Ordering": { ... },
  "Pricing": [ ... ],
  "PackagingUnit": [ ... ]
}
```

#### To Flattened OpenAPI:
```yaml
# TradeItem.yaml (main entity)
type: object
required:
  - supplierIdGln
  - supplierItemNumber
properties:
  # Key fields
  supplierIdGln: { $ref: Gln.yaml }
  supplierItemNumber: { type: string }
  
  # Flatten first-level nested objects with ETIM xChange references
  supplierAltItemNumber: 
    type: ["string", "null"]
    description: |
      Alternative supplier item number for the same trade item.
      **ETIM xChange**: `SupplierAltItemNumber`
      **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.SupplierAltItemNumber`
  
  manufacturerItemNumber: 
    type: ["string", "null"]
    description: |
      Manufacturer's item number.
      **ETIM xChange**: `ManufacturerItemNumber`
      **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.ManufacturerItemNumber`
  
  itemGtins: 
    type: ["array", "null"]
    description: |
      Array of Global Trade Item Numbers.
      **ETIM xChange**: `ItemGtin`
      **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.ItemGtin[]`
  
  buyerItemNumber: 
    type: ["string", "null"]
    description: |
      Buyer-specific item number.
      **ETIM xChange**: `BuyerItemNumber`
      **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.BuyerItemNumber`
  
  discountGroupId: 
    type: ["string", "null"]
    description: |
      Identifier for the discount group.
      **ETIM xChange**: `DiscountGroupId`
      **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.DiscountGroupId`
  
  bonusGroupId: 
    type: ["string", "null"]
    description: |
      Identifier for the bonus group.
      **ETIM xChange**: `BonusGroupId`
      **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.BonusGroupId`
  
  itemValidityDate: 
    type: ["string", "null"]
    format: date
    description: |
      Date from which the trade item is valid.
      **ETIM xChange**: `ItemValidityDate`
      **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.ItemValidityDate`
  
  itemObsolescenceDate: 
    type: ["string", "null"]
    format: date
    description: |
      Date when the trade item becomes obsolete.
      **ETIM xChange**: `ItemObsolescenceDate`
      **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.ItemObsolescenceDate`
  
  # Item details (flatten into main object)
  itemStatus: 
    $ref: ../enums/ItemStatus.yaml
    description: |
      Lifecycle status of the trade item.
      **ETIM xChange**: `ItemStatus`
      **Path**: `Supplier[].Product[].TradeItem[].ItemDetails.ItemStatus`
  
  itemCondition: 
    $ref: ../enums/ItemCondition.yaml
    description: |
      Condition of the trade item.
      **ETIM xChange**: `ItemCondition`
      **Path**: `Supplier[].Product[].TradeItem[].ItemDetails.ItemCondition`
  
  stockItem: 
    type: ["boolean", "null"]
    description: |
      Indicates if this is a stock item.
      **ETIM xChange**: `StockItem`
      **Path**: `Supplier[].Product[].TradeItem[].ItemDetails.StockItem`
  
  shelfLifePeriod: 
    type: ["integer", "null"]
    description: |
      Shelf life period in days.
      **ETIM xChange**: `ShelfLifePeriod`
      **Path**: `Supplier[].Product[].TradeItem[].ItemDetails.ShelfLifePeriod`
  
  minimalItemDescription: 
    type: string
    description: |
      Minimal description of the trade item (80 characters max).
      **ETIM xChange**: `MinimalItemDescription`
      **Path**: `Supplier[].Product[].TradeItem[].ItemDetails.ItemDescriptions[].MinimalItemDescription`
  
  # References to complex sub-structures (when needed) - converted to number
  orderUnit: 
    type: string
    description: |
      Unit of measure for ordering.
      **ETIM xChange**: `OrderUnit`
      **Path**: `Supplier[].Product[].TradeItem[].Ordering.OrderUnit`
  
  minimumOrderQuantity: 
    type: number
    minimum: 0
    multipleOf: 0.0001
    description: |
      Minimum quantity that must be ordered (converted from ETIM string to number).
      **ETIM xChange**: `MinimumOrderQuantity` (string with pattern)
      **Path**: `Supplier[].Product[].TradeItem[].Ordering.MinimumOrderQuantity`
  
  orderStepSize: 
    type: number
    minimum: 0
    multipleOf: 0.0001
    description: |
      Increment in which quantities can be ordered (converted from ETIM string to number).
      **ETIM xChange**: `OrderStepSize` (string with pattern)
      **Path**: `Supplier[].Product[].TradeItem[].Ordering.OrderStepSize`
  
  # Arrays for relations
  itemRelations: 
    type: ["array", "null"]
    items: { $ref: ./ItemRelation.yaml }
  
  pricings:
    type: array
    description: |
      Array of pricing information (all numeric fields converted from ETIM strings).
      **ETIM xChange**: `Pricing`
      **Path**: `Supplier[].Product[].TradeItem[].Pricing[]`
    items: { $ref: ./ItemPricing.yaml }
  
  packagingUnits:
    type: ["array", "null"]
    items: { $ref: ./PackagingUnit.yaml }
```

### 9. ETIM xChange Field Mapping

Map ETIM xChange TradeItem fields to OpenAPI schemas with full documentation:

#### ItemIdentification
| ETIM xChange Field | JSON Path | OpenAPI Property | OpenAPI Type | Required |
|-------------------|-----------|------------------|--------------|----------|
| `SupplierItemNumber` | `Supplier[].Product[].TradeItem[].ItemIdentification.SupplierItemNumber` | `supplierItemNumber` | `string` | ✅ |
| `SupplierAltItemNumber` | `Supplier[].Product[].TradeItem[].ItemIdentification.SupplierAltItemNumber` | `supplierAltItemNumber` | `["string", "null"]` | ❌ |
| `ManufacturerItemNumber` | `Supplier[].Product[].TradeItem[].ItemIdentification.ManufacturerItemNumber` | `manufacturerItemNumber` | `["string", "null"]` | ❌ |
| `ItemGtin` | `Supplier[].Product[].TradeItem[].ItemIdentification.ItemGtin[]` | `itemGtins` | `["array", "null"]` | ❌ |
| `BuyerItemNumber` | `Supplier[].Product[].TradeItem[].ItemIdentification.BuyerItemNumber` | `buyerItemNumber` | `["string", "null"]` | ❌ |
| `DiscountGroupId` | `Supplier[].Product[].TradeItem[].ItemIdentification.DiscountGroupId` | `discountGroupId` | `["string", "null"]` | ❌ |
| `DiscountGroupDescription` | `Supplier[].Product[].TradeItem[].ItemIdentification.DiscountGroupDescription[].DiscountGroupDescription` | `discountGroupDescription` | `["string", "null"]` | ❌ |
| `BonusGroupId` | `Supplier[].Product[].TradeItem[].ItemIdentification.BonusGroupId` | `bonusGroupId` | `["string", "null"]` | ❌ |
| `BonusGroupDescription` | `Supplier[].Product[].TradeItem[].ItemIdentification.BonusGroupDescription[].BonusGroupDescription` | `bonusGroupDescription` | `["string", "null"]` | ❌ |
| `ItemValidityDate` | `Supplier[].Product[].TradeItem[].ItemIdentification.ItemValidityDate` | `itemValidityDate` | `["string", "null"]` (format: date) | ❌ |
| `ItemObsolescenceDate` | `Supplier[].Product[].TradeItem[].ItemIdentification.ItemObsolescenceDate` | `itemObsolescenceDate` | `["string", "null"]` (format: date) | ❌ |

#### ItemDetails
| ETIM xChange Field | JSON Path | OpenAPI Property | OpenAPI Type | Required |
|-------------------|-----------|------------------|--------------|----------|
| `ItemStatus` | `Supplier[].Product[].TradeItem[].ItemDetails.ItemStatus` | `itemStatus` | `["string", "null"]` (enum) | ❌ |
| `ItemCondition` | `Supplier[].Product[].TradeItem[].ItemDetails.ItemCondition` | `itemCondition` | `["string", "null"]` (enum) | ❌ |
| `StockItem` | `Supplier[].Product[].TradeItem[].ItemDetails.StockItem` | `stockItem` | `["boolean", "null"]` | ❌ |
| `ShelfLifePeriod` | `Supplier[].Product[].TradeItem[].ItemDetails.ShelfLifePeriod` | `shelfLifePeriod` | `["integer", "null"]` (0-999) | ❌ |
| `ItemDescriptions.MinimalItemDescription` | `Supplier[].Product[].TradeItem[].ItemDetails.ItemDescriptions[].MinimalItemDescription` | `minimalItemDescription` | `string` | ✅ |

**ItemStatus Enum Values**: `PRE-LAUNCH`, `ACTIVE`, `ON HOLD`, `PLANNED WITHDRAWAL`, `OBSOLETE`, `null`  
**ItemCondition Enum Values**: `NEW`, `USED`, `REFURBISHED`, `null`

**Note**: For nullable enums, include `null` in the enum array itself (following Product API pattern).

#### ItemRelations
| ETIM xChange Field | ETIM Type | JSON Path | OpenAPI Property | OpenAPI Type | Required |
|-------------------|-----------|-----------|------------------|--------------|----------|
| `RelatedSupplierItemNumber` | string(1-35) | `Supplier[].Product[].TradeItem[].ItemRelations[].RelatedSupplierItemNumber` | `relatedSupplierItemNumber` | `string` | ✅ |
| `RelatedManufacturerItemNumber` | string(1-35) | `Supplier[].Product[].TradeItem[].ItemRelations[].RelatedManufacturerItemNumber` | `relatedManufacturerItemNumber` | `["string", "null"]` | ❌ |
| `RelatedItemGtin` | array[string] | `Supplier[].Product[].TradeItem[].ItemRelations[].RelatedItemGtin[]` | `relatedItemGtins` | `["array", "null"]` | ❌ |
| `RelationType` | string(enum) | `Supplier[].Product[].TradeItem[].ItemRelations[].RelationType` | `relationType` | `string` (enum) | ✅ |
| `RelatedItemQuantity` | string(pattern) | `Supplier[].Product[].TradeItem[].ItemRelations[].RelatedItemQuantity` | `relatedItemQuantity` | `number` | ✅ |

**RelationType Enum Values**: `ACCESSORY`, `CONSISTS_OF`, `CONSUMABLES`, `MANDATORY`, `SPAREPART`, `SUCCESSOR`, `OTHER`

**Convert `relatedItemQuantity` from string to `number` type**.

#### ItemLogisticDetails
| ETIM xChange Field | ETIM Type | JSON Path | OpenAPI Property | OpenAPI Type | Required |
|-------------------|-----------|-----------|------------------|--------------|----------|
| `BaseItemNetLength` | string(pattern) | `Supplier[].Product[].TradeItem[].ItemLogisticDetails[].BaseItemNetLength` | `baseItemNetLength` | `["number", "null"]` | ❌ |
| `BaseItemNetWidth` | string(pattern) | `Supplier[].Product[].TradeItem[].ItemLogisticDetails[].BaseItemNetWidth` | `baseItemNetWidth` | `["number", "null"]` | ❌ |
| `BaseItemNetHeight` | string(pattern) | `Supplier[].Product[].TradeItem[].ItemLogisticDetails[].BaseItemNetHeight` | `baseItemNetHeight` | `["number", "null"]` | ❌ |
| `BaseItemNetDiameter` | string(pattern) | `Supplier[].Product[].TradeItem[].ItemLogisticDetails[].BaseItemNetDiameter` | `baseItemNetDiameter` | `["number", "null"]` | ❌ |
| `NetDimensionUnit` | string(3) | `Supplier[].Product[].TradeItem[].ItemLogisticDetails[].NetDimensionUnit` | `netDimensionUnit` | `["string", "null"]` (enum) | ❌ |
| `BaseItemNetWeight` | string(pattern) | `Supplier[].Product[].TradeItem[].ItemLogisticDetails[].BaseItemNetWeight` | `baseItemNetWeight` | `["number", "null"]` | ❌ |
| `NetWeightUnit` | string(3) | `Supplier[].Product[].TradeItem[].ItemLogisticDetails[].NetWeightUnit` | `netWeightUnit` | `["string", "null"]` (enum) | ❌ |

**Convert all dimension and weight string fields to `number` type** with appropriate constraints.

#### Ordering
| ETIM xChange Field | ETIM Type | JSON Path | OpenAPI Property | OpenAPI Type | Required |
|-------------------|-----------|-----------|------------------|--------------|----------|
| `OrderUnit` | string(enum) | `Supplier[].Product[].TradeItem[].Ordering.OrderUnit` | `orderUnit` | `string` (enum) | ✅ |
| `MinimumOrderQuantity` | string(pattern) | `Supplier[].Product[].TradeItem[].Ordering.MinimumOrderQuantity` | `minimumOrderQuantity` | `number` | ✅ |
| `OrderStepSize` | string(pattern) | `Supplier[].Product[].TradeItem[].Ordering.OrderStepSize` | `orderStepSize` | `number` | ✅ |
| `MaximumOrderQuantity` | string(pattern) | `Supplier[].Product[].TradeItem[].Ordering.MaximumOrderQuantity` | `maximumOrderQuantity` | `["number", "null"]` | ❌ |

Reference existing `UnitCodes.yaml` for order unit values. Convert all quantity strings to `number` type.

#### Pricing
| ETIM xChange Field | ETIM Type | JSON Path | OpenAPI Property | OpenAPI Type | Required |
|-------------------|-----------|-----------|------------------|--------------|----------|
| _(none — server-generated)_ | — | — | `pricingRef` | `TechnicalId` (`$ref`) | ✅ |
| `PriceUnit` | string(enum) | `Supplier[].Product[].TradeItem[].Pricing[].PriceUnit` | `priceUnit` | `string` (enum) | ✅ |
| `PriceUnitFactor` | string(pattern) | `Supplier[].Product[].TradeItem[].Pricing[].PriceUnitFactor` | `priceUnitFactor` | `["number", "null"]` | ❌ |
| `PriceQuantity` | string(pattern) | `Supplier[].Product[].TradeItem[].Pricing[].PriceQuantity` | `priceQuantity` | `number` | ✅ |
| `NetPrice` | string(pattern) | `Supplier[].Product[].TradeItem[].Pricing[].NetPrice` | `netPrice` | `number` | ✅ |
| `GrossListPrice` | string(pattern) | `Supplier[].Product[].TradeItem[].Pricing[].GrossListPrice` | `grossListPrice` | `["number", "null"]` | ❌ |
| `RecommendedRetailPrice` | string(pattern) | `Supplier[].Product[].TradeItem[].Pricing[].RecommendedRetailPrice` | `recommendedRetailPrice` | `["number", "null"]` | ❌ |

Create `TradeItemPricing.yaml` schema (API-facing pricing, includes `pricingRef`, excludes nested `allowanceSurcharges`).
Create `TradeItemPricingSummary.yaml` for bulk retrieval (includes `pricingRef` + trade item key fields).
**Convert all price/quantity string fields to `number` type** with `multipleOf: 0.0001`.

**Note**: `pricingRef` is a server-generated technical identifier (typed as `TechnicalId`) not present in the ETIM xChange domain model. It is required on all pricing schemas and used to correlate with allowance/surcharge entries.

#### PackagingUnit
| ETIM xChange Field | ETIM Type | JSON Path | OpenAPI Property | OpenAPI Type | Required |
|-------------------|-----------|-----------|------------------|--------------|----------|
| `PackagingUnitLevel` | integer | `Supplier[].Product[].TradeItem[].PackagingUnit[].PackagingUnitLevel` | `packagingUnitLevel` | `integer` | ✅ |
| `QuantityInParent` | string(pattern) | `Supplier[].Product[].TradeItem[].PackagingUnit[].QuantityInParent` | `quantityInParent` | `["number", "null"]` | ❌ |
| `PackagingGtin` | string(8-14) | `Supplier[].Product[].TradeItem[].PackagingUnit[].PackagingGtin` | `packagingGtin` | `["string", "null"]` | ❌ |
| `GrossLength` | string(pattern) | `Supplier[].Product[].TradeItem[].PackagingUnit[].GrossLength` | `grossLength` | `["number", "null"]` | ❌ |
| `GrossWidth` | string(pattern) | `Supplier[].Product[].TradeItem[].PackagingUnit[].GrossWidth` | `grossWidth` | `["number", "null"]` | ❌ |
| `GrossHeight` | string(pattern) | `Supplier[].Product[].TradeItem[].PackagingUnit[].GrossHeight` | `grossHeight` | `["number", "null"]` | ❌ |
| `GrossWeight` | string(pattern) | `Supplier[].Product[].TradeItem[].PackagingUnit[].GrossWeight` | `grossWeight` | `["number", "null"]` | ❌ |

Create `PackagingUnit.yaml` schema. **Convert all dimension, weight, and quantity string fields to `number` type**.

### 10. Shared Components to Use

Reuse existing shared schemas:
- `Gln.yaml` (supplier identifiers)
- `Gtin.yaml` (item identifiers)
- `TechnicalId.yaml` (opaque system identifiers — used for `selectionId` parameter and `pricingRef` property)
- `Price.yaml` (pricing structures)
- `CurrencyCode.yaml`
- `UnitCodes.yaml`
- `CountryCode.yaml`
- `LanguageCode.yaml`
- `CursorPaginationMetadata.yaml`
- `ProblemDetails.yaml` (error responses)

### 11. Query Parameters

Reuse existing shared query parameters (DO NOT create new files):

#### selection-id.yaml (EXISTS)
```yaml
name: selectionId
in: query
description: Filter results by selection identifier. Used to retrieve a specific subset
  of items based on a predefined selection.
required: false
schema:
  $ref: ../../schemas/identifiers/TechnicalId.yaml
example: "SELECTION-2024-Q1"
```

**Note**: The `selectionId` schema uses `$ref` to `TechnicalId.yaml` (generic opaque identifier, string 1-50 chars). Do NOT inline the type definition.

#### mutation-date-time.yaml (EXISTS)
```yaml
name: mutationDateTime
in: query
description: |
  Filter results by mutation timestamp (RFC 3339 / ISO 8601 UTC format).
  Returns items created or modified on or after this timestamp.
  Must use UTC timezone with 'Z' suffix.
required: false
schema:
  type: string
  format: date-time
example: "2024-10-15T00:00:00Z"
```

**Important**: Use `mutationDateTime` (datetime with UTC 'Z' suffix), NOT `mutationDate` (date only).

### 12. Example Bulk Response

Bulk responses use `*Summary` schemas that include the composite key fields:

```yaml
# BulkTradeItemDetailsResponse.yaml
type: object
additionalProperties: false
required:
  - data
  - meta
properties:
  data:
    type: array
    description: Array of trade item details summaries
    items:
      $ref: ../domain/TradeItemDetailsSummary.yaml
  meta:
    $ref: ../../../../shared/schemas/common/CursorPaginationMetadata.yaml
    description: Cursor-based pagination metadata
examples:
  - data:
      - supplierIdGln: "8712423012485"
        supplierItemNumber: "SKU-LAMP-001"
        supplierAltItemNumber: "ALT-SKU-001"
        manufacturerItemNumber: "MFR-12345"
        itemGtins:
          - "08712423012485"
          - "12345678901234"
        buyerItemNumber: null
        discountGroupId: "DG-LIGHTING"
        itemValidityDate: "2024-01-01"
        itemObsolescenceDate: null
        itemStatus: "ACTIVE"
        itemCondition: "NEW"
        stockItem: true
        shelfLifePeriod: null
        minimalItemDescription: "LED Lamp 10W E27"
    meta:
      cursor: "eyJzdXBwbGllcklkR2xuIjoiODcxMjQyMzAxMjQ4NSIsInN1cHBsaWVySXRlbU51bWJlciI6IlNLVS1MQU1QLTA0MSJ9"
      hasNext: true
      hasPrev: false
      limit: 100
      estimatedTotal: 15420
```

**Key Difference from Single-Item Response**:
- **Bulk**: Uses `TradeItemDetailsSummary` which INCLUDES `supplierIdGln` and `supplierItemNumber` in each item
- **Single**: Uses `TradeItemDetails` which does NOT include key fields (key is at response root level)

### 13. Operations IDs

Use descriptive, camelCase operation IDs:

**Single-item endpoints**:
- `getTradeItem` - Main trade item
- `getTradeItemDetails` - Details subresource
- `getTradeItemOrderings` - Orderings subresource
- `getTradeItemPricings` - Pricings subresource

**Bulk endpoints**:
- `getBulkTradeItemDetails`
- `getBulkTradeItemOrderings`
- `getBulkTradeItemPricings`

### 14. Tags

Following the Product API pattern, use readable tag names with spaces:
```yaml
tags:
  - name: TradeItems
    description: Trade item operations
    x-displayName: Trade Items
  - name: TradeItems single
    description: Single trade item operations
    x-displayName: Single Trade Item
  - name: TradeItems bulk
    description: Bulk data retrieval operations for trade items with cursor-based pagination
    x-displayName: Bulk Trade Items

x-tagGroups:
  - name: Trade Items
    tags:
      - TradeItems single
      - TradeItems bulk
```

### 15. ETIM xChange Field Documentation

**CRITICAL**: Every field in the OpenAPI schemas MUST include in its description:
1. The original ETIM xChange field name (PascalCase)
2. The full JSON path in the ETIM schema
3. A business description of the field's purpose

**Format Pattern**:
```yaml
propertyName:
  type: string
  description: |
    [Business description of the field]
    
    **ETIM xChange**: `FieldName`  
    **Path**: `Supplier[].Product[].TradeItem[].Section.FieldName`
```

**Example**:
```yaml
supplierItemNumber:
  type: string
  minLength: 1
  maxLength: 35
  description: |
    Unique identifier for the trade item as assigned by the supplier. This is the primary 
    key for identifying items in the supplier's catalog system.
    
    **ETIM xChange**: `SupplierItemNumber`  
    **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.SupplierItemNumber`
  examples:
    - "SKU-12345"
    - "ITEM-ABC-789"

itemStatus:
  type: ["string", "null"]
  enum: ["PRE-LAUNCH", "ACTIVE", "ON HOLD", "PLANNED WITHDRAWAL", "OBSOLETE", null]
  description: |
    Current lifecycle status of the trade item in the supplier's catalog.
    
    - `PRE-LAUNCH`: Item announced but not yet available
    - `ACTIVE`: Item is currently available
    - `ON HOLD`: Item temporarily unavailable
    - `PLANNED WITHDRAWAL`: Item scheduled for discontinuation
    - `OBSOLETE`: Item no longer available
    
    **ETIM xChange**: `ItemStatus`  
    **Path**: `Supplier[].Product[].TradeItem[].ItemDetails.ItemStatus`
  examples:
    - "ACTIVE"
    - "PRE-LAUNCH"
    - null

itemGtins:
  type: ["array", "null"]
  items:
    type: string
    pattern: "^[0-9]{8,14}$"
  description: |
    Array of Global Trade Item Numbers (GTIN-8, GTIN-12, GTIN-13, or GTIN-14) assigned 
    to this trade item. Multiple GTINs may exist for different packaging levels.
    
    **ETIM xChange**: `ItemGtin`  
    **Path**: `Supplier[].Product[].TradeItem[].ItemIdentification.ItemGtin[]`
  examples:
    - ["08712423012485", "12345678901234"]

orderUnit:
  type: string
  description: |
    Unit of measure in which the trade item can be ordered (e.g., piece, box, meter).
    References UN/CEFACT unit codes.
    
    **ETIM xChange**: `OrderUnit`  
    **Path**: `Supplier[].Product[].TradeItem[].Ordering.OrderUnit`
  examples:
    - "PCE"
    - "MTR"

minimumOrderQuantity:
  type: number
  format: decimal
  minimum: 0
  multipleOf: 0.0001
  maximum: 99999999999.9999
  description: |
    Minimum quantity that must be ordered for this trade item, expressed in the order unit.
    Converted from ETIM xChange string to number type.
    
    **ETIM xChange**: `MinimumOrderQuantity` (string with pattern)  
    **Path**: `Supplier[].Product[].TradeItem[].Ordering.MinimumOrderQuantity`
  examples:
    - 1
    - 10.5
    - 500
```

### 16. Error Responses

Use existing shared error responses:
- `400 Bad Request` → `#/components/responses/BadRequest`
- `401 Unauthorized` → `#/components/responses/Unauthorized`
- `403 Forbidden` → `#/components/responses/Forbidden`
- `404 Not Found` → `#/components/responses/NotFound`
- `500 Internal Server Error` → `#/components/responses/InternalServerError`

### 17. Validation Rules

Apply strict validation from ETIM xChange schema:
- `supplierIdGln`: pattern `^[0-9]{13}$`
- `supplierItemNumber`: minLength 1, maxLength 35
- `itemGtins`: pattern `^[0-9]{8,14}$` per item
- **Numeric fields**: type `number`, minimum 0, multipleOf 0.0001, appropriate maximum based on ETIM pattern
  - Convert ETIM `^[0-9]{1,11}[.]{0,1}[0-9]{0,4}$` → `number` with `maximum: 99999999999.9999`
  - Convert ETIM `^[0-9]{1,5}[.]{0,1}[0-9]{0,4}$` → `number` with `maximum: 99999.9999`
  - Convert ETIM `^[0-9]{1,12}[.]{0,1}[0-9]{0,4}$` → `number` with `maximum: 999999999999.9999`
- Date fields: format `date` (YYYY-MM-DD)
- Currency codes: pattern `^[A-Z]{3}$`
- Unit codes: Use enum from `UnitCodes.yaml`

### 18. Documentation Requirements

Each schema file must include:
- Clear `description` explaining business purpose
- **ETIM xChange field name** in description (e.g., `**ETIM xChange**: \`SupplierItemNumber\`")`
- **Full JSON path** in description (e.g., `**Path**: \`Supplier[].Product[].TradeItem[].ItemIdentification.SupplierItemNumber\`")`
- **Indicate ETIM type conversion** when applicable (e.g., "(string with pattern)" for numeric conversions)
- Realistic `examples` with actual ETIM-like data
  - Numeric fields: Use actual numbers (not strings)
  - Nullable fields: Include `null` in examples array
  - Date fields: Use ISO 8601 format (YYYY-MM-DD)
  - String enums: Show multiple valid enum values
- Validation constraints (`minLength`, `maxLength`, `pattern`, `minimum`, `maximum`, `multipleOf`)
- **For date fields**: Explicitly state "ISO 8601 date format (YYYY-MM-DD)"
- **For nullable fields**: Explain when/why field might be null
- Field-level descriptions explaining ETIM xChange business context

### 19. Implementation Steps

1. **Create enum schemas**: `ItemStatus.yaml`, `ItemCondition.yaml`, `RelationType.yaml`
   - Include `null` in enum arrays for nullable enums
2. **Create domain schemas** (following *Summary naming pattern):
   - `TradeItemDetails.yaml` (without key, for nested single-item)
   - `TradeItemDetailsSummary.yaml` (WITH key, for bulk)
   - `TradeItemOrdering.yaml`, `TradeItemOrderingsSummary.yaml`
   - `ItemPricing.yaml`, `TradeItemPricingSummary.yaml` (1 row per price for bulk)
   - `ItemLogistics.yaml`, `ItemRelation.yaml`, `PackagingUnit.yaml`, `ItemDescription.yaml`
   - Include ETIM xChange field names and paths in all descriptions
3. **Create single-item response schemas** (nested structure with key at root):
   - `TradeItemResponse.yaml` - Full trade item with all components
   - `TradeItemDetailsResponse.yaml` - Details subresource
   - `TradeItemOrderingsResponse.yaml` - Orderings subresource
   - `TradeItemPricingsResponse.yaml` - Pricings subresource
4. **Create bulk response schemas** (using *Summary schemas):
   - `BulkTradeItemDetailsResponse.yaml`
   - `BulkTradeItemOrderingsResponse.yaml`
   - `BulkTradeItemPricingsResponse.yaml`
5. **Author single-item path definitions**:
   - `trade-items.yaml` - GET /{supplierIdGln}/{supplierItemNumber}
   - `trade-item-details.yaml` - GET /{key}/details
   - `trade-item-orderings.yaml` - GET /{key}/orderings
   - `trade-item-pricings.yaml` - GET /{key}/pricings
6. **Author bulk path definitions**:
   - `bulk/trade-item-details.yaml`
   - `bulk/trade-item-orderings.yaml`, `bulk/trade-item-pricings.yaml`
7. **Author main OpenAPI spec**: Populate `openapi.yaml` with all paths, servers, tags, and shared components
8. **Validate**: Ensure all schemas pass OpenAPI 3.1 validation
9. **Review**: Verify all ETIM xChange references are accurate and complete

### 20. Special Considerations

- **Keep product reference**: TradeItem is nested under Product in ETIM, but flatten for API
- **ETIM xChange documentation**: Every field must document its ETIM source with name and path
- **Language handling**: Support multilingual descriptions where present (e.g., `DiscountGroupDescription[]`)
- **Attachment handling**: Reference URIs for documents/images
- **Country-specific fields**: Design extensible pattern for custom fields
- **Pricing complexity**: Handle multiple pricing scenarios, allowances, surcharges
- **Packaging hierarchy**: Support nested packaging units
- **Path notation**: Use `[]` to indicate arrays in ETIM paths (e.g., `Supplier[].Product[].TradeItem[]`)

### 21. Success Criteria

✅ All schemas validate against OpenAPI 3.1 / JSON Schema 2020-12  
✅ Naming conventions strictly followed (PascalCase components, camelCase properties)  
✅ **Every field includes ETIM xChange field name and full JSON path in description**  
✅ **All ETIM xChange string-based numeric fields converted to proper `number` type**  
✅ Numeric fields use `multipleOf: 0.0001` for 4 decimal place precision  
✅ **Nullable fields use `type: ["type", "null"]` pattern (not in required array)**  
✅ **Enum schemas include `null` in enum array when nullable**  
✅ **String boolean enums preserved as-is (e.g., `rohsIndicator`, `reachIndicator`)**  
✅ **Date fields include format and ISO 8601 description with examples**  
✅ Bulk endpoints use cursor-based pagination  
✅ Minimal nesting (max 2-3 levels deep)  
✅ Filtering by `selectionId` and `mutationDateTime` implemented  
✅ All bulk paths prefixed with `/bulk/`  
✅ Composite key (`supplierIdGln` + `supplierItemNumber`) consistently used  
✅ Single trade item endpoint (`GET /{supplierIdGln}/{supplierItemNumber}`) returns nested structure with key at root  
✅ Subresource endpoints (`/details`, `/orderings`, `/pricings`) follow Product API pattern  
✅ `*Summary` schemas used for bulk retrieval (WITH embedded keys)  
✅ Domain schemas used for nested single-item (WITHOUT keys)  
✅ Comprehensive examples provided with numeric values (not strings)  
✅ Examples include `null` values for nullable fields  
✅ Reuse existing shared components (parameters, responses)  
✅ Error responses follow RFC 7807 Problem Details  
✅ ETIM xChange traceability complete for all mapped fields  
✅ `TechnicalId` schema used for `selectionId` parameter and `pricingRef` property  
✅ `pricingRef` used as join key between pricings and allowance/surcharges (replaces composite natural key)  
✅ `pricingRef` documented as server-generated, not present in ETIM xChange domain model  

## Output Files Expected

Generate the following files:

### New Files
1. `openapi/apis/tradeitem/openapi.yaml`
2. `openapi/apis/tradeitem/README.md`

**Single-item path definitions**:
3. `openapi/apis/tradeitem/paths/trade-items.yaml`
4. `openapi/apis/tradeitem/paths/trade-item-details.yaml`
5. `openapi/apis/tradeitem/paths/trade-item-orderings.yaml`
6. `openapi/apis/tradeitem/paths/trade-item-pricings.yaml`
7. `openapi/apis/tradeitem/paths/trade-item-allowance-surcharges.yaml`

**Bulk path definitions**:
8. `openapi/apis/tradeitem/paths/bulk/trade-item-details.yaml`
9. `openapi/apis/tradeitem/paths/bulk/trade-item-orderings.yaml`
10. `openapi/apis/tradeitem/paths/bulk/trade-item-pricings.yaml`
11. `openapi/apis/tradeitem/paths/bulk/trade-item-allowance-surcharges.yaml`

**Domain schemas (without keys - for nested single-item)**:
12. `openapi/apis/tradeitem/schemas/domain/TradeItemDetails.yaml`
13. `openapi/apis/tradeitem/schemas/domain/TradeItemOrdering.yaml`
14. `openapi/apis/tradeitem/schemas/domain/TradeItemPricing.yaml` (includes `pricingRef`, excludes nested allowance/surcharges)
15. `openapi/apis/tradeitem/schemas/domain/ItemLogistics.yaml`
16. `openapi/apis/tradeitem/schemas/domain/ItemRelation.yaml`
17. `openapi/apis/tradeitem/schemas/domain/PackagingUnit.yaml`
18. `openapi/apis/tradeitem/schemas/domain/ItemDescription.yaml`
19. `openapi/apis/tradeitem/schemas/domain/ItemCountrySpecificField.yaml`

**Domain schemas (WITH keys - for bulk retrieval)**:
20. `openapi/apis/tradeitem/schemas/domain/TradeItemDetailsSummary.yaml`
21. `openapi/apis/tradeitem/schemas/domain/TradeItemOrderingsSummary.yaml`
22. `openapi/apis/tradeitem/schemas/domain/TradeItemPricingSummary.yaml` (flattened - 1 row per price, includes `pricingRef`)
23. `openapi/apis/tradeitem/schemas/domain/AllowanceSurchargeSummary.yaml` (flattened - 1 row per surcharge, join via `pricingRef`)

**Single-item response schemas**:
24. `openapi/apis/tradeitem/schemas/responses/TradeItemResponse.yaml`
25. `openapi/apis/tradeitem/schemas/responses/TradeItemDetailsResponse.yaml`
26. `openapi/apis/tradeitem/schemas/responses/TradeItemOrderingsResponse.yaml`
27. `openapi/apis/tradeitem/schemas/responses/TradeItemPricingsResponse.yaml`
28. `openapi/apis/tradeitem/schemas/responses/TradeItemAllowanceSurchargesResponse.yaml`
29. `openapi/apis/tradeitem/schemas/responses/TradeItemAllowanceSurchargeItem.yaml` (includes `pricingRef` for correlation)

**Bulk response schemas**:
30. `openapi/apis/tradeitem/schemas/responses/BulkTradeItemDetailsResponse.yaml`
31. `openapi/apis/tradeitem/schemas/responses/BulkTradeItemOrderingsResponse.yaml`
32. `openapi/apis/tradeitem/schemas/responses/BulkTradeItemPricingsResponse.yaml`
33. `openapi/apis/tradeitem/schemas/responses/BulkAllowanceSurchargesResponse.yaml`

**Enum schemas**:
34. `openapi/apis/tradeitem/schemas/enums/ItemStatus.yaml`
35. `openapi/apis/tradeitem/schemas/enums/ItemCondition.yaml`
36. `openapi/apis/tradeitem/schemas/enums/RelationType.yaml`

### Existing Files to Reuse (DO NOT CREATE)
- `openapi/shared/parameters/query/selection-id.yaml`
- `openapi/shared/parameters/query/mutation-date-time.yaml`
- `openapi/shared/parameters/query/cursor.yaml`
- `openapi/shared/parameters/query/limit.yaml`
- `openapi/shared/responses/400-bad-request.yaml`
- `openapi/shared/responses/401-unauthorized.yaml`
- `openapi/shared/responses/403-forbidden.yaml`
- `openapi/shared/responses/404-not-found.yaml`
- `openapi/shared/responses/500-internal-server-error.yaml`
- `openapi/shared/schemas/common/CursorPaginationMetadata.yaml`
- `openapi/shared/schemas/common/ProblemDetails.yaml`
- `openapi/shared/schemas/identifiers/TechnicalId.yaml`

## Notes
- Follow the ETIM xChange V2.0 schema structure but adapt for REST API best practices
- Prioritize developer experience with clear, flat structures
- Design for high-volume data exchange scenarios
- Consider implementing rate limiting headers in responses
