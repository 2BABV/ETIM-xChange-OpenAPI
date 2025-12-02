# Products API Domain Model

## Overview

The Products API manages manufacturer product specifications with ETIM classification data based on ETIM xChange V2.0. Products represent the manufacturer's perspective of items with comprehensive technical specifications, standardized classifications, legislation compliance, and lifecycle assessment data.

This API provides both individual product operations and bulk data retrieval with cursor-based pagination for high-volume synchronization scenarios.



## Products Design decisions

### Key Identification Fields

Products are uniquely identified by the composite key:
- `manufacturerIdGln` (GLN - 13 digits) + `manufacturerProductNumber` (max 35 chars)

[Decision details](docs/product-key.md)

### ETIM classifications

An ETIM product classification is uniquely identified by the composite key:
- `etimClassCode` + `etimClassVersion` 

[Decision details](docs/etim-classifications.md)



## Products TODO
- ProductIdentification is missing BrandDetails. This is an overly complicated structure for a productIndentification. Check how to handle this.