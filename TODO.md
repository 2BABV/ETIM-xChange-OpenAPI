The only potentially problematic date field is DateTime? mutationDateTime on all five bulk endpoints. Two issues:

Timezone ambiguity: ASP.NET Core minimal APIs bind DateTime from the query string without timezone awareness. If a client sends 2025-01-01T00:00:00Z, the bound DateTime will have DateTimeKind.Unspecified or Local depending on the host, which can cause incorrect filtering comparisons if the repository compares against UTC-stored timestamps.

DateTimeOffset is more correct for a format: date-time filter — it preserves the offset and makes intent explicit.

The response models (priceValidityDate, itemValidityDate, etc.) are not problematic since those use DateOnly in the server models and System.Text.Json serializes them correctly as "YYYY-MM-DD".

The mutationDateTime parameter is also defined as format: date-time in the OpenAPI spec (per the mutation-date-time parameter), so changing to DateTimeOffset? would be the safer option:

DateTimeOffset? mutationDateTime = null

ASP.NET Core minimal APIs bind DateTimeOffset correctly from ISO 8601 strings like 2025-01-01T00:00:00Z, and it preserves the UTC offset throughout the call to the service layer.