# Products API Domain Model

## Overview

The Products API manages manufacturer product specifications with ETIM classification data based on ETIM xChange V2.0. Products represent the manufacturer's perspective of items with comprehensive technical specifications, standardized classifications, legislation compliance, and lifecycle assessment data.

This API provides both individual product operations and bulk data retrieval with cursor-based pagination for high-volume synchronization scenarios.



## Products Design decisions

### Key Identification Fields

Products are uniquely identified by the composite key:
- `manufacturerIdGln` (GLN - 13 digits) + `manufacturerProductNumber` (max 35 chars)

[Decision details](docs/product-key.md)

### Product details

Product details (`ProductDetails`) combines identification and operational information into a single schema:
- **Identification**: manufacturer info (name, DUNS), GTINs, brand, lifecycle dates, customs data
- **Operational**: status, type, warranties, product groups

This merged approach simplifies the API surface compared to the ETIM xChange source structure which separates `ProductIdentification` and `ProductDetails`.

Product descriptions (multilingual texts, marketing content, keywords) are intentionally excluded from the product details endpoint. Instead, descriptions are available through a dedicated `/bulk/product-descriptions` endpoint with:
- Flattened structure (one row per language per product)
- Language filtering support
- Optimized payload sizes for ETL/data warehouse ingestion

### ETIM classifications

An ETIM product classification is uniquely identified by the composite key:
- `etimClassCode` + `etimReleaseVersion` 
- removed: other classifications
- TODO: modelling classes

[Decision details](docs/etim-classifications.md)



## Products TODO
- ProductDetails is missing BrandDetails (nested structure with BrandSeries and BrandSeriesVariation). Check how to handle this complex multilingual structure.
- TODO: modelling classes