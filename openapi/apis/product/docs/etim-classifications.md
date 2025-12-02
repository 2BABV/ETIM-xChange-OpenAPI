# ETIM Classifications

**Version**: 1.0  
**Date**: November 6, 2025  
**Source**: ETIM xChange V2.0 Beta Schema (2025-10-13)  
**Target**: OpenAPI 3.1 / JSON Schema 2020-12

## Table of Contents

- [Overview](#overview)
- [Structural Changes from File Format to API](#structural-changes-from-file-format-to-api)
  - [1. Removal of OtherClassifications](#1-removal-of-otherclassifications)
  - [2. Single Classification Structure](#2-single-classification-structure)
  - [3. Key Field Changes](#3-key-field-changes)
  - [4. ETIM Release Version Array](#4-etim-release-version-array)
  - [5. Release Version Filtering](#5-release-version-filtering)
- [API Model Structure](#api-model-structure)

---

## Overview

This document describes the transformation of the ETIM Classification structure from the ETIM xChange V2.0 file format to the ETIM xChange API format. The API model has been optimized for REST services and includes several key improvements to address data redundancy and support better filtering capabilities.

---

## Structural Changes from File Format to API

### 1. Removal of OtherClassifications

**ETIM xChange File Format**:
- Contains two separate classification structures:
  - `EtimClassification[]` - Array for ETIM standard classifications
  - `OtherClassifications[]` - Array for non-ETIM classification systems

**ETIM xChange API Format**:
- Contains only `etimClassifications[]` - Array for ETIM standard classifications
- `OtherClassifications` structure has been removed

**Rationale**: 
REST services inherently support extensibility through versioning and optional fields. The placeholder for `OtherClassifications` is no longer necessary in the API model. Organizations requiring non-ETIM classifications can implement custom extensions through separate endpoints or API versions.

---

### 2. Single Classification Structure

**ETIM xChange API Product Model**:
```yaml
Product:
  properties:
    etimClassifications:
      type: array
      items:
        $ref: '#/components/schemas/EtimClassification'
```

**Bulk Endpoint**:
- `/bulk/product-etim-classifications` - Dedicated bulk service for retrieving ETIM classifications

The API provides a focused, standardized approach with only ETIM classifications available inside the `Product` schema.

---

### 3. Key Field Changes

#### File Format Key Fields (ETIM xChange)
```json
{
  "EtimClassification": [
    {
      "EtimReleaseVersion": "9.0",    // Required - Part of composite key
      "EtimClassCode": "EC002745",     // Required - Part of composite key
      "EtimClassVersion": 1            // Optional
    }
  ]
}
```

**Composite Key**: `EtimReleaseVersion` + `EtimClassCode`

**Problem**: An ETIM class with the same `EtimClassVersion` can exist in multiple ETIM releases. Using `EtimReleaseVersion` + `EtimClassCode` as the key results in redundant `EtimClassVersion` entries across releases.

#### API Format Key Fields
```yaml
EtimClassification:
  required:
    - etimClassCode
    - etimClassVersion
  properties:
    etimClassCode:
      type: string
      pattern: "^EC[0-9]{6}$"
    etimClassVersion:
      type: integer
      minimum: 1
    etimReleaseVersions:
      type: ["array", "null"]
      items:
        type: string
        pattern: "^[0-9]{1,2}[.]{1}[0-9]{1}|DYNAMIC$"
```

**Composite Key**: `etimClassCode` + `etimClassVersion`

**Improvements**:
1. **Eliminates Redundancy**: Each unique class version appears once, with an array of applicable release versions
2. **Better Normalization**: Single source of truth for each class version
3. **Required Version**: `etimClassVersion` is now required (was optional in file format). This also aligns with ETIM Modelling Classes, which have only one release ("DYNAMIC") with multiple versions, where the version was already required.
4. **Multi-Release Support**: `etimReleaseVersions` array captures all releases where the classification is valid

---

### 4. ETIM Release Version Array

#### File Format
```json
{
  "EtimReleaseVersion": "9.0"  // Single required string
}
```

Each classification entry represents one class in one release. If the same class version exists in releases 9.0, 10.0, and 11.0, it requires three separate entries.

#### API Format
```yaml
etimReleaseVersions:
  type: ["array", "null"]
  uniqueItems: true
  items:
    type: string
    pattern: "^[0-9]{1,2}[.]{1}[0-9]{1}|DYNAMIC$"
  examples:
    - ["9.0", "10.0", "11.0"]
    - ["DYNAMIC"]
    - null
```

**Benefits**:
- **Single Entry**: One classification entry represents the class across all applicable releases
- **Explicit Release Coverage**: Clear visibility of which releases support this class version
- **Nullable**: Supports cases where release information may not be tracked or is irrelevant
- **Unique Items**: Prevents duplicate release versions in the array

**Example Comparison**:

File Format (3 entries for the same class version):
```json
[
  {
    "EtimReleaseVersion": "9.0",
    "EtimClassCode": "EC002745",
    "EtimClassVersion": 1
  },
  {
    "EtimReleaseVersion": "10.0",
    "EtimClassCode": "EC002745",
    "EtimClassVersion": 1
  },
  {
    "EtimReleaseVersion": "11.0",
    "EtimClassCode": "EC002745",
    "EtimClassVersion": 1
  }
]
```

API Format (1 entry):
```json
{
  "etimClassCode": "EC002745",
  "etimClassVersion": 1,
  "etimReleaseVersions": ["9.0", "10.0", "11.0"]
}
```

---

### 5. Release Version Filtering

Both the generic product service and the bulk ETIM classifications endpoint support filtering by ETIM release version:

#### Query Parameter
```yaml
name: etimReleaseCode
in: query
schema:
  type: string
  pattern: "^[0-9]{1,2}[.]{1}[0-9]{1}|DYNAMIC$"
description: |
  Filter classifications by ETIM release version.
  Only return products/classifications valid for the specified release.
examples:
  - "9.0"
  - "10.0"
  - "11.0"
  - "DYNAMIC"
```

#### Endpoints Supporting Release Filtering
1. **`GET /products`** - Generic product service
   - Filter: Products with classifications valid for specified release
   
2. **`GET /bulk/product-etim-classifications`** - Bulk classifications service
   - Filter: Classifications valid for specified release
   - Use for ETIM classification synchronization

**Filter Behavior**:
- Returns only classifications where `etimReleaseVersions` contains the specified release
- If `etimReleaseVersions` is `null`, the classification is included regardless of filter
- Supports "DYNAMIC" for dynamic ETIM classes

---

## API Model Structure

The complete ETIM Classification model in the API includes:

```yaml
EtimClassification:
  type: object
  required:
    - etimClassCode
    - etimClassVersion
  properties:
    etimClassCode:
      type: string
      pattern: "^EC[0-9]{6}$"
      description: ETIM class code (EC + 6 digits)
      
    etimClassVersion:
      type: integer
      minimum: 1
      description: Version of the ETIM class (required in API, optional in file)
      
    etimReleaseVersions:
      type: ["array", "null"]
      uniqueItems: true
      items:
        type: string
      description: Array of ETIM releases where classification is valid
      
    etimDynamicReleaseDate:
      type: ["string", "null"]
      format: date
      description: Release date for dynamic ETIM classes
      
    etimFeatures:
      type: ["array", "null"]
      description: ETIM feature values characterizing the product
      
    etimModellingClassCode:
      type: ["string", "null"]
      pattern: "^MC[0-9]{6}$"
      description: ETIM modelling class code (MC + 6 digits)
      
    etimModellingClassVersion:
      type: ["integer", "null"]
      description: Version of the ETIM modelling class
```

---

## Summary of Deviations

| Aspect | ETIM xChange File Format | ETIM xChange API Format |
|--------|-------------------------|------------------------|
| **Classification Structures** | `EtimClassification[]` + `OtherClassifications[]` | `etimClassifications[]` only |
| **Composite Key** | `EtimReleaseVersion` + `EtimClassCode` | `etimClassCode` + `etimClassVersion` |
| **Release Version** | Single required string | Optional array of strings |
| **Class Version** | Optional | Required |
| **Redundancy** | Same class version duplicated per release | Single entry with release array |
| **Release Filtering** | Not applicable | Supported via `etimReleaseCode` query parameter |
| **Bulk Endpoint** | Not applicable | `/bulk/product-etim-classifications` |

These changes optimize the API for efficient data retrieval, reduce redundancy, and provide better filtering capabilities while maintaining full compatibility with ETIM classification standards.

