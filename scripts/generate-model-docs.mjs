#!/usr/bin/env node
/**
 * Generate domain model documentation from bundled OpenAPI specs.
 * Produces:
 *   1. Interactive HTML treeview (details/summary)
 *   2. Mermaid class diagram
 *
 * Usage: node scripts/generate-model-docs.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import yaml from 'js-yaml';

// ── Configuration ──────────────────────────────────────────────────
const APIS = [
  {
    name: 'Product',
    specPath: 'openapi/apis/product/generated/product-api.yaml',
    // Domain schemas to include (exclude Response envelopes/pagination/shared)
    domainFilter: name =>
      !name.endsWith('Response') &&
      !name.startsWith('Bulk') &&
      !['ProblemDetails', 'ValidationProblemDetails', 'TechnicalId',
        'CursorPaginationMetadata', 'Gln', 'Gtin', 'LanguageCode'].includes(name),
    // Single root: the full product as returned by GET /products/{gln}/{mpn}
    root: 'ProductResponseData',
    rootLabel: 'Product',
  },
  {
    name: 'TradeItem',
    specPath: 'openapi/apis/tradeitem/generated/tradeitem-api.yaml',
    domainFilter: name =>
      !name.endsWith('Response') &&
      !name.startsWith('Bulk') &&
      !['ProblemDetails', 'ValidationProblemDetails', 'TechnicalId',
        'CursorPaginationMetadata', 'Gln', 'Gtin', 'LanguageCode'].includes(name),
    // Single root: the full trade item as returned by GET /trade-items/{gln}/{itemNumber}
    root: 'TradeItemResponseData',
    rootLabel: 'Trade Item',
  },
];

const OUT_DIR = '_test-site';

// ── Helpers ────────────────────────────────────────────────────────

function resolveRef(ref) {
  return ref.replace('#/components/schemas/', '');
}

function typeLabel(prop) {
  if (prop.$ref) return resolveRef(prop.$ref);
  if (prop.anyOf || prop.oneOf) {
    const variants = (prop.anyOf || prop.oneOf)
      .map(v => v.$ref ? resolveRef(v.$ref) : v.type || '?')
      .flat();
    return variants.join(' | ');
  }
  const t = prop.type;
  if (Array.isArray(t)) return t.join(' | ');
  if (t === 'array') {
    if (prop.items?.$ref) return resolveRef(prop.items.$ref) + '[]';
    if (prop.items?.type) {
      const it = Array.isArray(prop.items.type)
        ? prop.items.type.join('|')
        : prop.items.type;
      return it + '[]';
    }
    return 'array';
  }
  return t || 'any';
}

function shortDesc(desc) {
  if (!desc) return '';
  // Take the first sentence, strip ETIM xChange path references
  const first = desc.split(/\n\n/)[0].replace(/\s+/g, ' ').trim();
  // Remove markdown bold and ETIM path references
  const clean = first
    .replace(/\*\*ETIM xChange\*\*:.*$/i, '')
    .replace(/\*\*Path\*\*:.*$/i, '')
    .replace(/\*\*/g, '')
    .trim();
  return clean.length > 120 ? clean.slice(0, 117) + '…' : clean;
}

function isRef(prop) {
  if (prop.$ref) return resolveRef(prop.$ref);
  const t = prop.type;
  const isArray = t === 'array' || (Array.isArray(t) && t.includes('array'));
  if (isArray && prop.items?.$ref) return resolveRef(prop.items.$ref);
  if (prop.anyOf) {
    const refs = prop.anyOf.filter(v => v.$ref).map(v => resolveRef(v.$ref));
    return refs[0] || null;
  }
  return null;
}

function isEnum(schema) {
  return schema?.enum || schema?.const !== undefined;
}

// ── Tree HTML generation ───────────────────────────────────────────

function renderPropertyHtml(name, prop, schemas, required, visited) {
  const tl = typeLabel(prop);
  const req = required ? '<span class="req">required</span>' : '';
  const desc = shortDesc(prop.description);
  const descHtml = desc ? `<span class="desc">${escHtml(desc)}</span>` : '';
  const refName = isRef(prop);

  // Format info
  const format = prop.format ? `<span class="fmt">${prop.format}</span>` : '';
  const constraints = [];
  if (prop.minLength !== undefined) constraints.push(`min: ${prop.minLength}`);
  if (prop.maxLength !== undefined) constraints.push(`max: ${prop.maxLength}`);
  if (prop.minimum !== undefined) constraints.push(`≥ ${prop.minimum}`);
  if (prop.maximum !== undefined) constraints.push(`≤ ${prop.maximum}`);
  if (prop.pattern) constraints.push(`pattern`);
  const constraintHtml = constraints.length
    ? `<span class="constraint">${constraints.join(', ')}</span>` : '';

  if (refName && schemas[refName] && !isEnum(schemas[refName]) && !visited.has(refName)) {
    // Expandable nested schema
    const nested = renderSchemaHtml(refName, schemas, new Set(visited));
    return `<details class="prop">
  <summary><span class="pname">${escHtml(name)}</span><span class="ptype ref-type">${escHtml(tl)}</span>${format}${req}${constraintHtml}${descHtml}</summary>
  ${nested}
</details>`;
  }

  // Enum values
  let enumHtml = '';
  if (refName && schemas[refName] && isEnum(schemas[refName])) {
    const vals = schemas[refName].enum || [schemas[refName].const];
    enumHtml = `<span class="enum-vals">${vals.map(v => escHtml(String(v))).join(' | ')}</span>`;
  }
  if (prop.enum) {
    enumHtml = `<span class="enum-vals">${prop.enum.map(v => escHtml(String(v))).join(' | ')}</span>`;
  }

  return `<div class="prop leaf">
  <span class="pname">${escHtml(name)}</span><span class="ptype">${escHtml(tl)}</span>${format}${req}${constraintHtml}${enumHtml}${descHtml}
</div>`;
}

function renderSchemaHtml(name, schemas, visited = new Set()) {
  const schema = schemas[name];
  if (!schema || visited.has(name)) return `<div class="circular">↻ ${escHtml(name)}</div>`;
  visited.add(name);

  const props = schema.properties || {};
  const requiredSet = new Set(schema.required || []);
  const desc = shortDesc(schema.description);

  let html = `<div class="schema-block">`;
  if (desc) html += `<div class="schema-desc">${escHtml(desc)}</div>`;

  const sortedProps = Object.keys(props).sort((a, b) => {
    // Required first, preserve YAML source order within each group
    const aReq = requiredSet.has(a) ? 0 : 1;
    const bReq = requiredSet.has(b) ? 0 : 1;
    return aReq - bReq;
  });

  for (const pName of sortedProps) {
    html += renderPropertyHtml(pName, props[pName], schemas, requiredSet.has(pName), visited);
  }
  html += `</div>`;
  return html;
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Mermaid generation ─────────────────────────────────────────────

function collectReachable(root, schemas, visited = new Set()) {
  if (visited.has(root) || !schemas[root]) return visited;
  visited.add(root);
  const props = schemas[root].properties || {};
  for (const pDef of Object.values(props)) {
    const ref = isRef(pDef);
    if (ref && schemas[ref]) collectReachable(ref, schemas, visited);
  }
  return visited;
}

function generateMermaid(apiName, schemas, root) {
  const reachable = collectReachable(root, schemas);
  let mmd = `classDiagram\n  direction TB\n`;

  for (const name of reachable) {
    const schema = schemas[name];
    if (!schema?.properties) continue;

    const props = schema.properties;
    const requiredSet = new Set(schema.required || []);

    mmd += `  class ${name} {\n`;
    for (const [pName, pDef] of Object.entries(props)) {
      const tl = typeLabel(pDef).replace(/[<>]/g, '');
      const req = requiredSet.has(pName) ? '*' : '';
      mmd += `    +${tl} ${pName}${req}\n`;
    }
    mmd += `  }\n`;

    // Relationships
    for (const [pName, pDef] of Object.entries(props)) {
      const refName = isRef(pDef);
      if (refName && reachable.has(refName)) {
        const isArray = pDef.type === 'array' || (Array.isArray(pDef.type) && pDef.type.includes('array'));
        const card = isArray ? '"*"' : '"1"';
        mmd += `  ${name} --> ${card} ${refName} : ${pName}\n`;
      }
    }
  }
  return mmd;
}

// ── Page templates ─────────────────────────────────────────────────

function treePageHtml(apiName, schemasHtml, rootNames) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${apiName} — Domain Model Tree</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&family=Sora:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--blue-700:#143a64;--blue-500:#2176cc;--blue-400:#4a9aea;--cyan-500:#00b4d8;
--gray-50:#f8fafc;--gray-100:#f1f5f9;--gray-200:#e2e8f0;--gray-300:#cbd5e1;
--gray-400:#94a3b8;--gray-500:#64748b;--gray-600:#475569;--gray-700:#334155;
--gray-800:#1e293b;--gray-900:#0f172a;--white:#fff;--green-700:#15803d;
--amber-600:#d97706;--red-600:#dc2626;--radius:8px}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',system-ui,sans-serif;color:var(--gray-800);
background:var(--gray-50);-webkit-font-smoothing:antialiased;line-height:1.55}
.topbar{position:sticky;top:0;z-index:100;background:rgba(255,255,255,0.92);
backdrop-filter:blur(12px);border-bottom:1px solid var(--gray-200);
display:flex;align-items:center;justify-content:space-between;padding:.6rem 1.5rem}
.topbar-left{display:flex;align-items:center;gap:.75rem}
.topbar-brand{font-family:'Sora',sans-serif;font-weight:700;font-size:.95rem;
color:var(--blue-700);text-decoration:none}
.topbar-sep{color:var(--gray-300);font-weight:300}
.topbar-title{font-family:'Sora',sans-serif;font-weight:600;font-size:.85rem;color:var(--gray-600)}
.topbar-actions{display:flex;gap:.75rem}
.topbar-actions button{font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:500;
padding:.3rem .7rem;border:1px solid var(--gray-300);border-radius:6px;
background:var(--white);color:var(--gray-600);cursor:pointer;transition:all .15s}
.topbar-actions button:hover{border-color:var(--blue-400);color:var(--blue-500)}
.container{max-width:960px;margin:0 auto;padding:1.5rem}
h2.api-title{font-family:'Sora',sans-serif;font-size:1.3rem;font-weight:700;
color:var(--gray-900);margin-bottom:.25rem}
.api-subtitle{font-size:.85rem;color:var(--gray-500);margin-bottom:1.5rem}
.legend{display:flex;gap:1rem;flex-wrap:wrap;font-size:.72rem;margin-bottom:1.25rem;
color:var(--gray-500)}
.legend span{display:inline-flex;align-items:center;gap:.3rem}

/* ── Root sections ── */
.root-section{margin-bottom:1.5rem}
.root-section>details{border:1px solid var(--gray-200);border-radius:var(--radius);
background:var(--white);overflow:hidden}
.root-section>details>summary{font-family:'Sora',sans-serif;font-size:.95rem;font-weight:700;
color:var(--gray-900);padding:.85rem 1rem;cursor:pointer;list-style:none;
display:flex;align-items:center;gap:.5rem;background:var(--gray-50);
border-bottom:1px solid var(--gray-200);user-select:none}
.root-section>details>summary::before{content:'▶';font-size:.65rem;color:var(--gray-400);
transition:transform .15s;display:inline-block;width:1em}
.root-section>details[open]>summary::before{transform:rotate(90deg)}
.root-section>details>summary:hover{background:var(--gray-100)}
.root-section>details>.schema-block{padding:.5rem .75rem .75rem}

/* ── Schema blocks ── */
.schema-block{padding-left:.5rem}
.schema-desc{font-size:.78rem;color:var(--gray-500);margin-bottom:.5rem;
padding:.4rem .6rem;background:var(--gray-50);border-radius:6px;border:1px solid var(--gray-100)}

/* ── Properties ── */
.prop{border-left:2px solid var(--gray-200);margin-left:.25rem;padding-left:.75rem;margin-top:2px}
.prop.leaf{padding:.3rem 0 .3rem .75rem;font-size:.82rem;display:flex;
flex-wrap:wrap;align-items:baseline;gap:.35rem}
details.prop>summary{font-size:.82rem;padding:.35rem 0;cursor:pointer;
list-style:none;display:flex;flex-wrap:wrap;align-items:baseline;gap:.35rem;user-select:none}
details.prop>summary::before{content:'▸';color:var(--gray-400);font-size:.7rem;
margin-right:.15rem;display:inline-block;width:.7em}
details.prop[open]>summary::before{content:'▾'}
details.prop>.schema-block{margin-top:.15rem;margin-bottom:.35rem}

.pname{font-family:'JetBrains Mono',monospace;font-size:.78rem;font-weight:500;color:var(--gray-900)}
.ptype{font-family:'JetBrains Mono',monospace;font-size:.72rem;color:var(--blue-500);
background:var(--gray-100);padding:.1rem .4rem;border-radius:4px}
.ptype.ref-type{color:var(--cyan-500);background:#e0f7fa}
.req{font-size:.65rem;font-weight:600;color:var(--red-600);text-transform:uppercase;letter-spacing:.04em}
.fmt{font-size:.68rem;color:var(--amber-600);font-style:italic}
.constraint{font-size:.68rem;color:var(--gray-400)}
.enum-vals{font-size:.7rem;color:var(--green-700);font-family:'JetBrains Mono',monospace}
.desc{font-size:.75rem;color:var(--gray-500);flex-basis:100%;padding-left:1rem;margin-top:.1rem}
.circular{font-size:.78rem;color:var(--gray-400);font-style:italic;padding:.25rem 0 .25rem .75rem}

@media(max-width:700px){.container{padding:1rem}.topbar-actions{display:none}}
</style>
</head>
<body>
<div class="topbar">
  <div class="topbar-left">
    <span class="topbar-brand">Product Data OpenAPI</span>
    <span class="topbar-sep">|</span>
    <span class="topbar-title">${apiName} — Domain Model</span>
  </div>
  <div class="topbar-actions">
    <button onclick="document.querySelectorAll('details').forEach(d=>d.open=true)">Expand All</button>
    <button onclick="document.querySelectorAll('details').forEach(d=>d.open=false)">Collapse All</button>
  </div>
</div>
<div class="container">
  <h2 class="api-title">${apiName} Domain Model</h2>
  <p class="api-subtitle">Interactive treeview of all domain schemas — generated from the OpenAPI specification.</p>
  <div class="legend">
    <span><span class="ptype" style="font-size:.68rem">type</span> data type</span>
    <span><span class="ptype ref-type" style="font-size:.68rem">Schema</span> nested schema (click to expand)</span>
    <span><span class="req" style="font-size:.68rem">REQUIRED</span> required field</span>
    <span><span class="fmt" style="font-size:.68rem">format</span> format hint</span>
    <span><span class="enum-vals" style="font-size:.68rem">A | B</span> enum values</span>
  </div>
  ${schemasHtml}
</div>
</body>
</html>`;
}

function mermaidPageHtml(apiName, mermaidCode) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${apiName} — Domain Model Diagram</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Sora:wght@400;600;700&display=swap" rel="stylesheet">
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  mermaid.initialize({ startOnLoad: true, theme: 'default',
    themeVariables: { fontSize: '13px' },
    classDiagram: { useMaxWidth: false }
  });
</script>
<style>
:root{--blue-700:#143a64;--gray-50:#f8fafc;--gray-200:#e2e8f0;--gray-500:#64748b;
--gray-600:#475569;--gray-900:#0f172a;--white:#fff}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',system-ui,sans-serif;background:var(--gray-50);color:var(--gray-900)}
.topbar{position:sticky;top:0;z-index:100;background:rgba(255,255,255,0.92);
backdrop-filter:blur(12px);border-bottom:1px solid var(--gray-200);
display:flex;align-items:center;padding:.6rem 1.5rem;gap:.75rem}
.topbar-brand{font-family:'Sora',sans-serif;font-weight:700;font-size:.95rem;color:var(--blue-700)}
.topbar-sep{color:var(--gray-200)}
.topbar-title{font-family:'Sora',sans-serif;font-weight:600;font-size:.85rem;color:var(--gray-600)}
.container{max-width:100%;overflow-x:auto;padding:1.5rem;display:flex;flex-direction:column;align-items:center}
h2{font-family:'Sora',sans-serif;font-size:1.3rem;margin-bottom:.25rem}
.subtitle{font-size:.85rem;color:var(--gray-500);margin-bottom:1.5rem}
.mermaid{background:var(--white);border:1px solid var(--gray-200);border-radius:8px;
padding:1.5rem;overflow-x:auto;max-width:100%}
</style>
</head>
<body>
<div class="topbar">
  <span class="topbar-brand">Product Data OpenAPI</span>
  <span class="topbar-sep">|</span>
  <span class="topbar-title">${apiName} — Domain Model Diagram</span>
</div>
<div class="container">
  <h2>${apiName} Domain Model</h2>
  <p class="subtitle">Class diagram showing schema relationships — generated from the OpenAPI specification.</p>
  <pre class="mermaid">
${mermaidCode}
  </pre>
</div>
</body>
</html>`;
}

// ── Index page ─────────────────────────────────────────────────────

function indexPageHtml(apis) {
  const cards = apis.map(a => `
    <div class="card">
      <h3>${a.name}</h3>
      <div class="links">
        <a href="${a.name.toLowerCase()}-tree.html">Treeview</a>
        <a href="${a.name.toLowerCase()}-diagram.html">Diagram</a>
      </div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Domain Models — Product Data OpenAPI</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Sora:wght@400;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:#f8fafc;color:#1e293b;
display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:2rem}
h1{font-family:'Sora',sans-serif;font-size:1.5rem;margin-bottom:.5rem}
p{color:#64748b;margin-bottom:2rem;font-size:.9rem}
.grid{display:flex;gap:1.5rem;flex-wrap:wrap;justify-content:center}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:1.5rem 2rem;
text-align:center;min-width:220px}
.card h3{font-family:'Sora',sans-serif;font-size:1.1rem;margin-bottom:1rem}
.links{display:flex;gap:.75rem;justify-content:center}
.links a{font-size:.85rem;font-weight:500;color:#2176cc;text-decoration:none;
padding:.35rem .75rem;border:1px solid #e2e8f0;border-radius:6px;transition:all .15s}
.links a:hover{border-color:#4a9aea;background:#f0f7ff}
</style>
</head>
<body>
<h1>Domain Models</h1>
<p>Choose an API and visualization style.</p>
<div class="grid">${cards}</div>
</body>
</html>`;
}

// ── Main ───────────────────────────────────────────────────────────

mkdirSync(OUT_DIR, { recursive: true });

for (const api of APIS) {
  console.log(`Processing ${api.name}...`);
  const raw = readFileSync(api.specPath, 'utf8');
  const spec = yaml.load(raw);
  const allSchemas = spec.components?.schemas || {};

  // Filter to domain schemas
  const domainNames = Object.keys(allSchemas).filter(api.domainFilter);
  const domainSchemas = {};
  for (const n of domainNames) domainSchemas[n] = allSchemas[n];

  // ── Tree HTML ──
  // Single root: the full model as returned by the API
  const rootSchema = domainSchemas[api.root] || allSchemas[api.root];
  let treeSections = '';
  if (rootSchema) {
    const inner = renderSchemaHtml(api.root, { ...domainSchemas, [api.root]: rootSchema });
    treeSections = `<div class="root-section"><details open>
  <summary>${api.rootLabel}</summary>
  ${inner}
</details></div>\n`;
  }

  const treeHtml = treePageHtml(api.name, treeSections, api.rootLabel);
  writeFileSync(`${OUT_DIR}/${api.name.toLowerCase()}-tree.html`, treeHtml);
  console.log(`  → ${api.name.toLowerCase()}-tree.html`);

  // ── Mermaid diagram ──
  const mermaid = generateMermaid(api.name, allSchemas, api.root);
  const diagramHtml = mermaidPageHtml(api.name, mermaid);
  writeFileSync(`${OUT_DIR}/${api.name.toLowerCase()}-diagram.html`, diagramHtml);
  console.log(`  → ${api.name.toLowerCase()}-diagram.html`);
}

// Index page
writeFileSync(`${OUT_DIR}/index.html`, indexPageHtml(APIS));
console.log(`\nDone. Serve with: npx http-server ${OUT_DIR} -p 8765 -c-1`);
