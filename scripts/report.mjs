// Local report tester — no Vercel CLI needed.
//   npm run report:preview   → writes report-preview.html (renders only)
//   npm run report:send      → actually sends the email via the internal API
//
// Loads .env.local automatically. Uses the exact same logic as
// api/scheduled-report.js so what you see/send matches production.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import Papa from 'papaparse'
import { transformRows } from '../src/data/transform.js'
import { byCSM, byCustomerSegment, computeKpis } from '../src/data/aggregations.js'
import { buildEmailHtml } from '../api/_emailTemplate.js'
import { sendReport } from '../api/_emailClient.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// Minimal .env.local loader (works on any Node 18+; doesn't override real env).
function loadEnv(file) {
  let text
  try {
    text = readFileSync(join(ROOT, file), 'utf8')
  } catch {
    return
  }
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/)
    if (!m || line.trimStart().startsWith('#')) continue
    const key = m[1]
    let val = m[2].trim().replace(/^["']|["']$/g, '')
    if (process.env[key] === undefined) process.env[key] = val
  }
}
loadEnv('.env.local')

const SHEET_CSV_URL =
  process.env.SHEET_CSV_URL ||
  'https://docs.google.com/spreadsheets/d/1VDvn6ZcHfRYdjtVHi2aJ06tylbKX2TyC9Lvhg-0-078/gviz/tq?tqx=out:csv&gid=0'

const csv = await (await fetch(SHEET_CSV_URL, { redirect: 'follow' })).text()
const rows = transformRows(Papa.parse(csv, { header: true, skipEmptyLines: true }).data)

const kpis = computeKpis(rows)
const totalRow = {
  rooftops: kpis.total,
  enterprises: new Set(rows.map((r) => r.enterpriseId)).size,
  app: kpis.app,
  sv: kpis.sv,
  svl: kpis.svl,
  sc: kpis.sc,
  appPct: kpis.active ? kpis.app / kpis.active : 0,
  svPct: kpis.total ? kpis.sv / kpis.total : 0,
  svlPct: kpis.total ? kpis.svl / kpis.total : 0,
  scPct: kpis.total ? kpis.sc / kpis.total : 0,
}
const html = buildEmailHtml({
  kpis,
  totalRow,
  segmentRows: byCustomerSegment(rows),
  csmRows: byCSM(rows),
})

if (process.argv.includes('send')) {
  const result = await sendReport(html)
  console.log(`✓ Sent — ${rows.length} rooftops. API response:`, JSON.stringify(result))
} else {
  const out = join(ROOT, 'report-preview.html')
  writeFileSync(out, html)
  console.log(`✓ Wrote report-preview.html — ${rows.length} rooftops, ${totalRow.enterprises} enterprises`)
}
