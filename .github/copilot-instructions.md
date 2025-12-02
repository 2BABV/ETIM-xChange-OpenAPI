# GitHub Copilot Instructions for 2BA OpenAPI Specification

## Copilot Behavior Instructions

When working with this repository:

1. **Always follow the established naming conventions**:
   
   **File Naming (for organization)**:
   - **PascalCase** for schema files: `ErrorResponse.yaml`, `Price.yaml`, `NetPriceResponse.yaml`
   - **kebab-case** for parameter/response files: `page-number.yaml`, `400-bad-request.yaml`
   
   **Component Names (for $ref references)**:
   - **PascalCase** for ALL component references: `Price`, `PageNumber`, `BadRequest`, `NotFound`
   - Component keys must match regex: `^[a-zA-Z0-9\.\-_]+$`
   - References always use component names, not filenames
   
   **Schema Properties & Parameters**:
   - **camelCase** for properties: `netPrice`, `errorCode`, `pageNumber`
   - **camelCase** for parameter names: `supplierGln`, `tradeItemId`, `quantity`
   - **camelCase** for operationIds: `getTradeItemNetPrice`, `getProducts`
   
   **API Paths**:
   - **kebab-case** for path segments: `/netprices`, `/trade-items`
   
  **Response Structure for Large Datasets**:
  - Use `data` (plural) for the array of items
  - Use `meta` for cursor pagination information (reuse `CursorPaginationMetadata` with `cursor`, `prevCursor`, `hasNext`, `hasPrev`, `limit`, `estimatedTotal`)
  - Example: `{ data: [...], meta: { cursor, hasNext, hasPrev, limit, estimatedTotal } }`

2. **OpenAPI 3.1 / JSON Schema 2020-12 Requirements**:
   - Use `type: ["string", "null"]` for nullable fields (NOT `nullable: true`)
   - Use `anyOf`, `oneOf`, `allOf` for composition (avoid deprecated patterns)
   - Set `additionalProperties: false` for strict validation when appropriate
   - Use `examples` array (plural) in schemas, not `example` (singular, deprecated)
   - Include `format` for type hints: `uri`, `email`, `date-time`, `uuid`, etc.
   - Use `minLength`, `maxLength`, `minimum`, `maximum` for validation
   - Prefer `const` over single-value `enum` for literal values

3. **Maintain the directory structure** - Place schemas in appropriate domain folders
4. **Use $ref extensively** - Don't repeat schema definitions; create reusable components
5. **Create separate files** for reusable enumerations and shared types
6. **Follow the DTO pattern** - Keep response schemas separate from domain schemas
7. **Include comprehensive examples** - Every schema should have realistic examples
8. **Document business context** - Add descriptions explaining purpose and constraints
9. **Support flexible identifiers** - Use `anyOf`/`oneOf` patterns for GLN/DUNS/alternative IDs
10. **Maintain consistent error responses** - Use RFC 7807 Problem Details format

## Naming Convention Details

### Schema Components (PascalCase)
- File: `ErrorResponse.yaml` → Component: `#/components/schemas/ErrorResponse`
- File: `Price.yaml` → Component: `#/components/schemas/Price`
- File: `NetPriceResponse.yaml` → Component: `#/components/schemas/NetPriceResponse`

### Parameter Components (PascalCase)
- File: `cursor.yaml` → Component: `#/components/parameters/Cursor`
- File: `limit.yaml` → Component: `#/components/parameters/Limit`
- File: `sort-order.yaml` → Component: `#/components/parameters/SortOrder`

### Response Components (PascalCase)
- File: `400-bad-request.yaml` → Component: `#/components/responses/BadRequest`
- File: `404-not-found.yaml` → Component: `#/components/responses/NotFound`
- File: `500-internal-server-error.yaml` → Component: `#/components/responses/InternalServerError`

## JSON Schema Best Practices

### Nullable Fields (OpenAPI 3.1 / JSON Schema 2020-12)
```yaml
# ✅ CORRECT - Use type array
propertyName:
  type: ["string", "null"]
  description: Optional field that can be null

# ❌ INCORRECT - Don't use nullable keyword (OpenAPI 3.0 only)
propertyName:
  type: string
  nullable: true
```

### Examples (OpenAPI 3.1+)

**For Schemas** - Use `examples` array (plural):
```yaml
# ✅ CORRECT - Schema examples array (plural)
type: object
properties:
  name:
    type: string
examples:
  - name: "Example 1"
  - name: "Example 2"

# ❌ DEPRECATED - Avoid example (singular) for schemas
example:
  name: "Example"
```

**For Parameters** - Use `example` (singular) OR `examples` (plural object):
```yaml
# ✅ CORRECT - Parameter example (simple, singular)
name: cursor
in: query
schema:
  type: string
example: "eyJpZCI6MTIzfQ=="

# ✅ ALSO CORRECT - Parameter examples (named examples object)
name: status
in: query
schema:
  type: string
examples:
  active:
    value: "active"
    summary: Active status
  pending:
    value: "pending"
    summary: Pending status
```

### Type Validation
```yaml
# ✅ CORRECT - Include validation constraints
productId:
  type: string
  minLength: 1
  maxLength: 35
  pattern: "^[A-Z0-9-]+$"
  examples:
    - "PROD-12345"

price:
  type: number
  minimum: 0
  multipleOf: 0.01
  examples:
    - 19.99
```

### Strict Object Validation
```yaml
# ✅ CORRECT - Prevent unexpected properties
type: object
additionalProperties: false
required:
  - id
  - name
properties:
  id:
    type: string
  name:
    type: string
```

### Large Dataset Responses (Cursor Pagination)
```yaml
# ✅ CORRECT - Use data and meta
type: object
additionalProperties: false
required:
  - data
  - meta
properties:
  data:
    type: array
    description: Array of items
    items:
      $ref: ../domain/Item.yaml
  meta:
    $ref: ../../../../shared/schemas/common/CursorPaginationMetadata.yaml
examples:
  - data:
      - id: "123"
        name: "Item 1"
    meta:
      cursor: "eyJpZCI6MTIzfQ=="
      hasNext: true
      hasPrev: false
      limit: 100
      estimatedTotal: 245
```

Always prioritize clarity, reusability, and adherence to OpenAPI 3.1+ and JSON Schema 2020-12 standards while respecting the established project patterns and business domain requirements.
