# Governance Model  
**Products & TradeItems API**

## 1. Doel

Dit document beschrijft de governance, wijzigingsprocessen en release-strategie voor de Products & TradeItems API.  
Het doel is:

- Stabiliteit voor internationale implementaties
- Transparantie van wijzigingen
- Voorspelbare versionering
- Zorgvuldige omgang met breaking changes

---

## 2. Principes

1. **Stabiliteit boven snelheid**
2. **Geen breaking changes binnen een major versie**
3. **Volledige transparantie (public repository)**
4. **Traceerbaarheid van elke wijziging**
5. **Internationale participatie via formeel proces**

---

## 3. Rollen & Rechten

### 3.1 Maintainers (Core Team)
- Merge rechten
- Release rechten
- Eindbeslissing bij conflicten
- Verantwoordelijk voor versionering

### 3.2 National Centers / Belanghebbende organisaties
- Mogen Issues openen
- Mogen RFC’s indienen
- Mogen Pull Requests indienen
- Geen directe merge rechten

### 3.3 Community
- Read-only toegang
- Mag Issues openen
- Mag deelnemen aan discussies

Repository is **public**.  
Write access is beperkt tot maintainers.

---

## 4. Wijzigingsproces

Alle wijzigingen volgen hetzelfde traceerbare proces.

### Stap 1 — Change Request (Issue)

Elke wijziging start als GitHub Issue met:

- Business motivatie
- Impactanalyse
- Backwards compatible? (ja/nee)
- Betrokken endpoints / modellen
- National Center (indien van toepassing)

---

### Stap 2 — RFC (verplicht bij majeure wijzigingen)

Een RFC is verplicht bij:

- Breaking changes
- Nieuwe resources
- Wijziging van Products of TradeItems model
- Semantische wijzigingen

RFC wordt ingediend als Markdown document in `/rfcs` via Pull Request.

RFC bevat:

- Context
- Probleemstelling
- Voorgestelde oplossing
- JSON/OpenAPI voorbeeld
- Impactanalyse
- Migratiestrategie
- Alternatieven

Discussieperiode: **3–4 weken**

Merge van de RFC PR betekent formele goedkeuring.

---

### Stap 3 — Implementatie PR

Na goedgekeurde RFC:

- Nieuwe Pull Request tegen `main`
- Moet refereren aan Issue en RFC
- Moet CHANGELOG bijwerken
- Moet versie aanpassen indien nodig
- Moet CI-validatie succesvol doorlopen

Minimaal **2 maintainer reviews** vereist.

---

## 5. Versioneringsstrategie

De API gebruikt **Semantic Versioning (SemVer)**:

```
MAJOR.MINOR.PATCH
```

### MAJOR
Breaking changes:
- Required veld toegevoegd
- Veld verwijderd
- Type gewijzigd
- Endpoint verwijderd
- Semantiek gewijzigd

Nieuwe major → nieuw URL pad:

```
/api/v1/
/api/v2/
```

---

### MINOR
Backwards compatible toevoegingen:
- Nieuw optional veld
- Nieuwe endpoint
- Enum uitbreiding
- Nieuwe filtermogelijkheden

---

### PATCH
- Documentatieverbetering
- Bugfix in schema
- Non-functionele correcties

---

## 6. Breaking Change Policy

- Geen breaking changes binnen een major versie
- Deprecatieperiode: minimaal **24 maanden**
- Parallelle major versies toegestaan
- Clients moeten onbekende enum-waarden negeren

---

## 7. Releaseproces

Elke release bevat:

- Git tag (`vX.Y.Z`)
- GitHub Release
- OpenAPI YAML & JSON
- Release Notes
- Bijgewerkte CHANGELOG

Release Notes structuur:

- Added
- Changed
- Deprecated
- Removed
- Breaking

---

## 8. CI & Validatie

Automatische controles bij elke Pull Request:

- OpenAPI linting
- Schema validatie
- Breaking change detectie
- Verplichte CHANGELOG update
- Verplichte versiecontrole

PR’s zonder geslaagde checks kunnen niet worden gemerged.

---

## 9. Transparantie & Documentatie

De repository bevat:

- `GOVERNANCE.md`
- `CONTRIBUTING.md`
- `VERSIONING.md`
- `CHANGELOG.md`
- `/rfcs` map

Alle beslissingen zijn publiek traceerbaar.

---

## 10. Besluitvorming

- Consensus waar mogelijk
- Bij geen consensus: beslissing door maintainers
- RFC-discussies zijn publiek zichtbaar
- Besluit wordt vastgelegd in merge van RFC

---

## 11. Langetermijnstrategie

- Major versies worden minimaal 24 maanden ondersteund
- Roadmap wordt publiek gepubliceerd
- Internationale stakeholders worden betrokken via RFC-proces

---

# Samenvatting Workflow

1. Issue
2. (Indien nodig) RFC
3. Discussieperiode
4. RFC goedkeuring
5. Implementatie PR
6. CI validatie
7. Review & merge
8. Version bump
9. Release + communicatie

---

TODO:

- Een formele `CONTRIBUTING.md` opstellen  (Engels)
- Een concrete GitHub folderstructuur uitschrijven  
- Een voorbeeld RFC template genereren  

