# TradeItem API Domain Model

## Overview

The TradeItem API manages supplier trade items with comprehensive pricing information. Trade items represent the supplier's offering of products with specific pricing, availability, and commercial terms.

The API supports both individual item operations and high-volume bulk operations based on the ETIM xChange V2.0 schema standard.

## Domain Model

```mermaid
erDiagram
    TradeItem {
        string supplierGln PK "Supplier GLN identifier"
        string id PK "Trade item identifier"
    }
    
    Pricing {
        string priceUnit "Unit of measurement"
        string priceUnitFactor "Price unit factor"
        string priceQuantity "Price quantity"
        boolean priceOnRequest "Price on request flag"
        number grossListPrice "Gross list price"
        number netPrice "Customer net price"
        number recommendedRetailPrice "RRP"
        string vat "VAT percentage"
        date priceValidityDate "Price validity start"
        date priceExpiryDate "Price validity end"
    }
    
    AllowanceSurcharge {
        enum allowanceSurchargeIndicator "ALLOWANCE or SURCHARGE"
        string allowanceSurchargeType "Type code"
        date allowanceSurchargeValidityDate "Validity date"
        string allowanceSurchargeAmount "Amount"
        string allowanceSurchargePercentage "Percentage"
        string allowanceSurchargeDescription "Description"
        string allowanceSurchargeMinimumQuantity "Minimum quantity"
    }
    
    TradeItem ||--o{ Pricing : "has"
    Pricing ||--o{ AllowanceSurcharge : "includes"
```

## Entity Details

### TradeItem
- **File**: [`tradeitem-response.yaml`](schemas/responses/tradeitem-response.yaml)
- **Purpose**: Supplier's commercial offering of products
- **Key Properties**:
  - `supplierGln`: GLN identifier for the supplier
  - `id`: Trade item identifier (max 35 chars)
  - `pricings`: Array of pricing information

### Pricing
- **File**: [`pricing.yaml`](schemas/domain/pricing.yaml)
- **Purpose**: Comprehensive pricing and commercial terms
- **Key Features**:
  - Multiple price types (gross, net, RRP)
  - Unit-based pricing with factors
  - VAT calculations
  - Price validity periods
  - Allowances and surcharges

## Price Flow Diagram

```mermaid
graph LR
    GLP[Gross List Price] --> AS[Allowances/Surcharges]
    AS --> NP[Net Price]
    NP --> VAT[+ VAT]
    VAT --> FP[Final Price]
    
    subgraph "Price Modifiers"
        AS1[Discount]
        AS2[Surcharge]
        AS3[Quantity Discount]
    end
    
    AS1 --> AS
    AS2 --> AS
    AS3 --> AS
```

## Allowance/Surcharge Flow

```mermaid
graph TB
    Start[Base Price] --> Check{Allowance or Surcharge?}
    Check -->|ALLOWANCE| Discount[Apply Discount]
    Check -->|SURCHARGE| AddCost[Add Additional Cost]
    Discount --> Final[Final Price]
    AddCost --> Final
    
    subgraph "Allowance Types"
        A1[Volume Discount]
        A2[Early Payment]
        A3[Promotion]
    end
    
    subgraph "Surcharge Types"
        S1[Handling Fee]
        S2[Express Delivery]
        S3[Small Order]
    end
```

## API Operations

### Individual Item Operations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/tradeitems` | GET | List all trade items with pagination |
| `/tradeitems/{supplierGln}/item-number/{supplierItemNumber}` | GET | Get specific trade item by supplier item number |
| `/tradeitems/{supplierGln}/item-gtin/{itemGtin}` | GET | Get specific trade item by GTIN |
| `/pricings` | GET | List pricing information |

### Bulk Operations

The TradeItem API provides specialized bulk endpoints for high-volume data retrieval with cursor-based pagination:

| Endpoint | Method | Description | Use Case |
|----------|--------|-------------|----------|
| `/bulk/trade-items` | GET | Retrieve complete trade items in bulk | Full catalog synchronization |
| `/bulk/item-identifications` | GET | Retrieve item identifiers and GTINs only | Item mapping and cross-referencing |
| `/bulk/item-orderings` | GET | Retrieve ordering information only | Inventory and order management systems |
| `/bulk/item-pricings` | GET | Retrieve pricing information only | Price synchronization and updates |

#### Bulk Operations Features

- **Cursor-based pagination**: Efficient navigation through large datasets (default: 100, max: 1000 items per page)
- **Incremental synchronization**: Filter by `mutationDate` to retrieve only changed items
- **Selection-based filtering**: Use `selectionId` to retrieve predefined subsets
- **Supplier filtering**: Filter by `supplierIdGln` to get items from specific suppliers
- **Optimized payloads**: Specialized endpoints return only the data you need

#### Example: Bulk Trade Items Request

```bash
GET /bulk/trade-items?supplierIdGln=8712423012485&limit=100&mutationDate=2024-10-15
```

#### Example: Incremental Update Pattern

```bash
# Initial full synchronization
GET /bulk/trade-items?supplierIdGln=8712423012485&limit=1000

# Daily incremental updates (only items changed since yesterday)
GET /bulk/trade-items?supplierIdGln=8712423012485&mutationDate=2024-11-01&limit=500
```

See [`openapi-bulk.yaml`](openapi-bulk.yaml) for the complete bulk operations specification.

## Dependencies

```mermaid
graph TB
    TradeItem --> GLN[Shared: GLN Identifier]
    Pricing --> UnitCode[Shared: Unit Codes]
    Pricing --> Price[Shared: Price Schema]
    Pricing --> AllowanceTypes[Shared: Allowance Types]
    Pricing --> CurrencyCode[Shared: Currency Code]
    Pricing --> LanguageCode[Shared: Language Code]
```

## Example Usage

```json
{
  "supplierGln": "4012345000016",
  "id": "TI-MOTOR-001",
  "pricings": [
    {
      "priceUnit": "C62",
      "priceQuantity": "1.0000",
      "grossListPrice": "1299.99",
      "netPrice": "1199.99",
      "vat": "21.00",
      "priceValidityDate": "2025-01-01",
      "priceExpiryDate": "2025-12-31",
      "allowanceSurcharge": [
        {
          "allowanceSurchargeIndicator": "ALLOWANCE",
          "allowanceSurchargeType": "VOLUME_DISCOUNT",
          "allowanceSurchargePercentage": "5.00",
          "allowanceSurchargeMinimumQuantity": "10.0000"
        }
      ]
    }
  ]
}
```

## Price Calculation Example

```mermaid
graph TB
    Start[Gross List Price: €1299.99] --> A1[Volume Discount: -5%]
    A1 --> A2[Net Price: €1234.99]
    A2 --> S1[Small Order Surcharge: +€15]
    S1 --> A3[Final Net: €1249.99]
    A3 --> VAT[VAT 21%: +€262.50]
    VAT --> Total[Total: €1512.49]
```

## Related Documentation

- [Product API Documentation](../product/README.md)
- [NetPrice API Documentation](../netprice/README.md)
- [Best Practices](../../../docs/best-practices.md)