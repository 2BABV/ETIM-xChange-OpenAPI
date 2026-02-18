# TradeItem API Domain Model

## Overview

The TradeItem API manages supplier trade item information based on ETIM xChange V2.0. Trade items represent the supplier's perspective of products they sell, including pricing, ordering conditions, logistics, and packaging information.

This API provides both individual trade item operations and bulk data retrieval with cursor-based pagination for high-volume synchronization scenarios.



## TradeItem Design Decisions

### Key Identification Fields

Trade items are uniquely identified by the composite key:
- `supplierIdGln` (GLN - 13 digits) + `supplierItemNumber` (max 35 chars)

Each trade item links to its parent product via required reference fields:
- `manufacturerIdGln` + `manufacturerProductNumber`

This enables joining trade item data with product specifications from the Product API.

Each trade item also carries a server-generated `tradeItemRef` (internal reference ID) for correlating nested subcomponents across bulk endpoints. Nested entities carry their own refs:
- `ItemDescription` → `descriptionRef`
- `TradeItemPricing` → `pricingRef`
- `AllowanceSurcharge` → `allowanceSurchargeRef`
- `ItemRelation` → `relationRef`
- `ItemAttachment` → `attachmentRef`
- `ItemLogistics` → `logisticsRef`

Child bulk schemas use `tradeItemRef` only (no composite keys). Root bulk schemas (`TradeItemDetailsSummary`) include both composite keys and `tradeItemRef`. The 1:1 `ordering` relationship does not require a separate ref.

### TradeItem Details

TradeItem details (`TradeItemDetails`) combines identification and operational information into a single schema:
- **Identification**: alternative item numbers, manufacturer references, GTINs, buyer item numbers
- **Commercial**: discount/bonus group assignments, validity/obsolescence dates
- **Operational**: item status, condition, stock indicator, shelf life

This merged approach simplifies the API surface compared to the ETIM xChange source structure which separates `ItemIdentification` and `ItemDetails`.

### TradeItem Descriptions

Item descriptions are available via dedicated endpoints:
- `/{supplierIdGln}/{supplierItemNumber}/descriptions` - Single item descriptions (nested array)
- `/bulk/trade-item-descriptions` - Bulk descriptions (flattened, one row per language)

This separation allows:
- Independent retrieval of descriptions without loading full trade item details
- Language filtering at the API level
- Efficient bulk synchronization of multilingual content

### Bulk Endpoint Consolidation

The bulk API consolidates ETIM xChange sections for efficient data retrieval:

| Endpoint | ETIM xChange Sections | Schema |
|----------|----------------------|--------|
| `/bulk/trade-item-details` | `ItemIdentification` + `ItemDetails` (excl. descriptions) | `TradeItemDetailsSummary` |
| `/bulk/trade-item-descriptions` | `ItemDetails.ItemDescriptions[]` | `ItemDescriptionsSummary` |
| `/bulk/trade-item-orderings` | `Ordering` | `TradeItemOrderingsSummary` |
| `/bulk/trade-item-pricings` | `Pricing[]` (excl. allowances/surcharges) | `TradeItemPricingSummary` |
| `/bulk/trade-item-allowance-surcharges` | `Pricing[].AllowanceSurcharge[]` | `AllowanceSurchargeSummary` |

**Note**: There is no separate `/bulk/trade-items` or `/bulk/item-identifications` endpoint. The `/bulk/trade-item-details` endpoint provides all identification fields combined with item details.

### Single-Item Endpoints

| Endpoint | Description | Schema |
|----------|-------------|--------|
| `/{supplierIdGln}/{supplierItemNumber}` | Core trade item info | `TradeItemResponse` |
| `/{supplierIdGln}/{supplierItemNumber}/details` | Item details | `TradeItemDetailsResponse` |
| `/{supplierIdGln}/{supplierItemNumber}/descriptions` | Multilingual descriptions | `TradeItemDescriptionsResponse` |
| `/{supplierIdGln}/{supplierItemNumber}/orderings` | Ordering conditions | `TradeItemOrderingsResponse` |
| `/{supplierIdGln}/{supplierItemNumber}/pricings` | Pricing information | `TradeItemPricingsResponse` |
| `/{supplierIdGln}/{supplierItemNumber}/allowance-surcharges` | Allowances/surcharges | `TradeItemAllowanceSurchargesResponse` |

### Bulk Flattening Strategy

**Design Philosophy**: Maximize flattening for predictable pagination and ETL compatibility.

| Endpoint | Rows per Item | Flattening Pattern |
|----------|---------------|-------------------|
| `/bulk/trade-item-details` | 1 | Fully flat (all fields inline) |
| `/bulk/trade-item-orderings` | 1 | Fully flat (all fields inline) |
| `/bulk/trade-item-descriptions` | n (per language) | Flat per language row |
| `/bulk/trade-item-pricings` | n (per price tier) | **Flat per price entry** |
| `/bulk/trade-item-allowance-surcharges` | n (per surcharge) | **Flat per surcharge entry** |

**Pricing Flattening** (consistent with Product API's `ProductEtimClassificationFeature` pattern):
- Each row = 1 price entry with embedded composite key (`supplierIdGln` + `supplierItemNumber`)
- Trade items with quantity tiers or validity periods generate multiple rows
- Enables predictable payload sizes and efficient cursor pagination
- Optimized for ETL/data warehouse ingestion

**Allowance/Surcharge Separation** (star schema pattern):
- Moved from nested array within pricing to separate `/bulk/trade-item-allowance-surcharges` endpoint
- Each row = 1 surcharge entry with pricing join keys (`priceUnit` + `priceQuantity` + `priceValidityDate`)
- Enables clean dimensional modeling: pricing fact table + surcharges fact table
- Join via: `supplierIdGln` + `supplierItemNumber` + `priceUnit` + `priceQuantity`

**Nested structures retained**:
- Simple string arrays (`itemGtins[]`) - minimal impact on row predictability



## TradeItem TODO

### Medium Priority

**ItemLogistics** (ItemLogisticDetails)
- Base item dimensions: length, width, height, diameter, weight
- Dimension/weight units
- Consider: single endpoint or include in details?

**PackagingUnit** (PackagingUnit[])
- Multi-level packaging hierarchy support
- Packaging GTINs, dimensions, weights
- `QuantityInParent` relationships

**ItemRelations** (ItemRelations[])
- Related items: accessories, spareparts, consumables, successors
- Relation types: `ACCESSORY`, `CONSISTS_OF`, `CONSUMABLES`, `MANDATORY`, `SPAREPART`, `SUCCESSOR`, `OTHER`

**Country-Specific Fields**
- `ItemCountrySpecificFields[]` with typed values
- Decision needed: simplified model vs full type support (same as Product API)

### Low Priority

**Legislation Fields** (if applicable at trade item level)
- RoHS, REACH indicators (string enums: "true"/"false"/"exempt")
- Hazardous materials data

### Not Planned

**Full TradeItem Composite Endpoint** - The `/bulk/trade-item-details` consolidation means we don't need a separate endpoint returning everything. Clients can join details/orderings/pricings as needed.