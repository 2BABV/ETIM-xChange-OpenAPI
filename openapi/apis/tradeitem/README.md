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

### TradeItem Details

TradeItem details (`TradeItemDetails`) combines identification and operational information into a single schema:
- **Identification**: alternative item numbers, manufacturer references, GTINs, buyer item numbers
- **Commercial**: discount/bonus group assignments, validity/obsolescence dates
- **Operational**: item status, condition, stock indicator, shelf life
- **Descriptions**: multilingual item descriptions

This merged approach simplifies the API surface compared to the ETIM xChange source structure which separates `ItemIdentification` and `ItemDetails`.

### Bulk Endpoint Consolidation

The bulk API consolidates ETIM xChange sections for efficient data retrieval:

| Endpoint | ETIM xChange Sections | Schema |
|----------|----------------------|--------|
| `/bulk/trade-item-details` | `ItemIdentification` + `ItemDetails` | `TradeItemDetailsSummary` |
| `/bulk/trade-item-orderings` | `Ordering` | `TradeItemOrderingsSummary` |
| `/bulk/trade-item-pricings` | `Pricing[]` | `TradeItemPricingsSummary` |

**Note**: There is no separate `/bulk/trade-items` or `/bulk/item-identifications` endpoint. The `/bulk/trade-item-details` endpoint provides all identification fields combined with item details.



## TradeItem TODO

### High Priority

**Missing Single-Item Endpoints** (bulk schemas exist, single endpoints not implemented)
- `/{supplierIdGln}/{supplierItemNumber}/orderings` - Order units, quantities, step sizes
- `/{supplierIdGln}/{supplierItemNumber}/pricings` - Pricing information array

**Missing Bulk Domain Schemas** (endpoints exist, schemas need implementation)
- `TradeItemOrderingsSummary.yaml` - WITH key fields for bulk orderings
- `TradeItemPricingsSummary.yaml` - WITH key fields for bulk pricings
- `TradeItemOrdering.yaml` - Without key for nested single-item orderings
- `ItemPricing.yaml` - Pricing details per price record

**Missing Response Schemas**
- `TradeItemOrderingsResponse.yaml` - Single-item orderings subresource
- `TradeItemPricingsResponse.yaml` - Single-item pricings subresource
- `BulkTradeItemOrderingsResponse.yaml` - Bulk orderings with pagination
- `BulkTradeItemPricingsResponse.yaml` - Bulk pricings with pagination

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

**Allowances & Surcharges** (Pricing)
- `AllowanceSurcharge[]` array within pricing
- Type, calculation method, percentage/amount values

**Legislation Fields** (if applicable at trade item level)
- RoHS, REACH indicators (string enums: "true"/"false"/"exempt")
- Hazardous materials data

### Not Planned

**Full TradeItem Composite Endpoint** - The `/bulk/trade-item-details` consolidation means we don't need a separate endpoint returning everything. Clients can join details/orderings/pricings as needed.