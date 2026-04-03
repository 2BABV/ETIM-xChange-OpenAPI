# URL Path Structure — Design Decision

## Context

The ETIM xChange OpenAPI specification is implemented by **multiple independent parties** (both server and client side). Each implementer hosts the API at their own domain and may use different URL prefixes. We need to define what part of the URL is **fixed** (mandated by the standard) and what is **variable** (implementer's choice).

### Known implementer base URLs

| Implementer | Base URL |
|---|---|
| Artikelbeheer (Select) | `https://selectprerelease.artikelbeheer.nl/api/v1` |
| ETIM International (Etimix) | `https://acceptation-service-api-dsgo.etimix.com/v1` |
| 2BA | `https://rest.accept.2ba.nl/api/v1` |

### Current spec

The current OpenAPI specs hardcode 2BA-specific server URLs and embed both the version and the resource name in `servers.url`:

```yaml
servers:
  - url: https://rest.2ba.nl/v1/products
  - url: https://rest.accept.2ba.nl/v1/products
```

Paths start at the identifier level (e.g. `/{manufacturerIdGln}/{manufacturerProductNumber}`), meaning the resource name (`/products`) is part of the server URL, not the path.

---

## Candidate URL Patterns

| # | Pattern | Example |
|---|---------|---------|
| A | `https://domain/api/v1/products/...` | Common in enterprise APIs |
| B | `https://domain/v1/products/...` | Microsoft Graph, Stripe, current spec |
| C | `https://domain/products/v1/...` | Per-resource versioning (rare) |

---

## What Authoritative Sources Say

### Microsoft Azure REST API Guidelines (2025)

> ⛔ **DO NOT** include a version number segment in any operation path.
> ✅ **DO** use a required query parameter named `api-version` on every operation.

Azure uses **date-based** versions as query params (`?api-version=2021-06-04`), NOT path segments. This approach does not fit the ETIM xChange model, where the spec is a shared standard (not a single vendor service), and path-based versioning is simpler for multi-implementer adoption.

### Microsoft Graph API (2025)

URL structure: `{scheme}://{host}/{version}/{category}/[{pathSegment}]`

Example: `https://graph.microsoft.com/v1.0/users/{id}`

- Version **IS** in the URL path (`/v1.0/` or `/beta/`)
- Version comes **BEFORE** the resource collection
- This is **Pattern B**

### Microsoft Architecture Best Practices (learn.microsoft.com)

Lists four versioning strategies (URI, query string, header, media type). URI versioning example uses Pattern B:

```
https://api.contoso.com/v2/customers/3
```

### Industry consensus

- **Stripe**: `https://api.stripe.com/v1/customers`
- **Twilio**: `https://api.twilio.com/2010-04-01/Accounts`
- **GitHub**: `https://api.github.com/...` (header versioning)

---

## Pattern-by-Pattern Analysis

### Pattern A: `https://domain/api/v1/products`

| Aspect | Assessment |
|---|---|
| Who uses it | Many enterprise APIs, ASP.NET / Spring Boot defaults |
| Pros | `/api/` cleanly separates API from UI on shared domains |
| Cons | `/api/` is redundant on API-dedicated domains (e.g. `api.example.com/api/...`) |
| Verdict | ✅ Good when domain serves both UI and API traffic |

### Pattern B: `https://domain/v1/products`

| Aspect | Assessment |
|---|---|
| Who uses it | Microsoft Graph, Stripe, current ETIM xChange spec |
| Pros | Clean, minimal URL; matches proven industry patterns |
| Cons | Requires dedicated API domain (no coexistence with UI) |
| Verdict | ✅ Best for dedicated API domains — industry standard |

### Pattern C: `https://domain/products/v1`

| Aspect | Assessment |
|---|---|
| Who uses it | Very rare |
| Pros | Allows per-resource independent versioning |
| Cons | Against all Microsoft guidelines; breaks discoverability; complicates SDK generation; no major API provider uses this |
| Verdict | ❌ Anti-pattern for uniform APIs |

---

## Multi-Model AI Review (Opus 4.6, GPT-5.4, Haiku 4.5)

Three AI models independently reviewed the specs. Key consensus:

| Finding | Opus 4.6 | GPT-5.4 | Haiku 4.5 |
|---|:---:|:---:|:---:|
| Hardcoded 2BA server URLs must go | 🔴 | 🔴 | 🔴 |
| Hardcoded OAuth `tokenUrl` must go | 🔴 | 🔴 | 🔴 |
| Resource in `servers` vs `paths` | Move to paths | Move to paths | Keep in servers |
| Docs contradict each other on `/api/` | — | 🟡 Found | — |

GPT-5.4 uniquely discovered that the repo's own documentation is inconsistent:
- `GOVERNANCE.md` → `/api/v1/` and `/api/v2/`
- `best-practices.md` → `/api/v1/user-profiles`
- `design-decisions.md` → `rest.2ba.nl/v1/{resource}` (no `/api/`)

---

## Recommendation

### URL Contract for Implementers

For a multi-implementer standard, separate what is **fixed** from what is **variable**:

| URL Part | Fixed or Variable? | Rationale |
|---|---|---|
| Domain / host | **Variable** | Each implementer has their own domain |
| `/api/` prefix | **Variable (optional)** | Depends on implementer infrastructure |
| `/v1/` version | **Fixed** | All v1 implementers MUST use `/v1/` |
| Resource path | **Fixed** | `/products/...`, `/trade-items/...` must be identical |
| Path parameters | **Fixed** | Per spec definition |

The effective contract becomes:

```
https://{implementer-domain}[/optional-prefix]/v1/{resource}/{path-params}
```

### This validates ALL known implementer URLs

| Implementer URL | Domain | Prefix | Version | Resource |
|---|---|---|---|---|
| `selectprerelease.artikelbeheer.nl/api/v1/products/...` | ✅ | `/api` | `/v1` | `/products` |
| `acceptation-service-api-dsgo.etimix.com/v1/products/...` | ✅ | _(none)_ | `/v1` | `/products` |
| `rest.accept.2ba.nl/api/v1/products/...` | ✅ | `/api` | `/v1` | `/products` |

### Proposed OpenAPI Structure

Move version and resource into `paths`; use server variables for the implementer-specific parts:

```yaml
servers:
  - url: https://{host}{basePath}/v1
    description: ETIM xChange Product API v1
    variables:
      host:
        default: api.example.com
        description: >-
          Implementer-specific API hostname.
          Examples: rest.2ba.nl, selectprerelease.artikelbeheer.nl,
          acceptation-service-api-dsgo.etimix.com
      basePath:
        default: ''
        description: >-
          Optional path prefix (e.g. /api). Leave empty if the API
          is served directly under the domain root.

paths:
  /products/{manufacturerIdGln}/{manufacturerProductNumber}:
    get:
      summary: Get product details
      ...
```

### Also Needed

1. **OAuth `tokenUrl`** — replace hardcoded 2BA URL with a variable or `example.com` placeholder
2. **ProblemDetails `type` URLs** — make implementer-agnostic or document as variable
3. **Implementer Guide** — create `docs/implementer-guide.md` explaining the URL contract, OAuth setup, and scope naming
4. **Align internal docs** — resolve the `/api/` prefix inconsistency between GOVERNANCE.md, best-practices.md, and design-decisions.md

---

## Decision

Adopted the recommended approach with the following specifics:

- **Server URL**: Parameterized `https://{host}{basePath}/v1` with `api.example.com` as default placeholder
- **Resource in paths**: Moved resource name from `servers.url` into `paths` (e.g., `/products/{id}/details`)
- **Bulk path naming**: Combined with the bulk path rename from `plan-rename-paths.md` — dropped redundant resource prefix and aligned aspect names to match single-item endpoints
- **OAuth `tokenUrl`**: Placeholder `https://auth.example.com/connect/token` (implementer-specific, documented in description)
- **ProblemDetails `type`**: `about:blank` per RFC 7807 (no extra semantics beyond HTTP status)
- **ProblemDetails `instance`**: Omitted from examples
- **Redocly rule**: `no-server-example.com` set to `off` (deliberate use of placeholder)
- **Implementer guide**: Created at `docs/implementer-guide.md`

## References

- [Microsoft Azure REST API Guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md)
- [Microsoft Graph REST API Guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/graph/GuidelinesGraph.md)
- [Microsoft — API Design Best Practices](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design)
- [OpenAPI 3.1 Specification — Server Object](https://spec.openapis.org/oas/v3.1.0#server-object)
