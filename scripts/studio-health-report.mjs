// Local Studio Health Report tester — no Vercel CLI needed.
//   npm run studio-health:preview   → writes studio-health-preview.html (renders only)
//   npm run studio-health:send      → actually sends the email via the internal API
//
// Loads .env.local automatically. Uses the same assembly + template as
// api/studio-health-report.js so what you see/send matches production.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import Papa from 'papaparse'
import { normalizeRows } from '../src/data/transform.js'
import { parseMatrix } from '../src/data/studioMetrics.js'
import { buildStudioHealthPayload } from '../api/_studioHealthData.js'
import { buildStudioHealthHtml } from '../api/_studioHealthTemplate.js'
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

const SHEET_ID = '1VDvn6ZcHfRYdjtVHi2aJ06tylbKX2TyC9Lvhg-0-078'
const gvizUrl = (gid) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`
// Matrix tabs use the plain CSV export — gviz drops cells in mixed-type columns.
const exportCsvUrl = (gid) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`

const ROOFTOP_CSV_URL = process.env.SHEET_CSV_URL || gvizUrl(0)
const STUDIO_HEALTH_CSV_URL = process.env.STUDIO_HEALTH_CSV_URL || exportCsvUrl('1632148391')
const STUDIO_ADOPTION_CSV_URL = process.env.STUDIO_ADOPTION_CSV_URL || exportCsvUrl('1323822955')

const fetchText = async (url) => (await fetch(url, { redirect: 'follow' })).text()
const [rooftopCsv, healthCsv, adoptionCsv] = await Promise.all([
  fetchText(ROOFTOP_CSV_URL),
  fetchText(STUDIO_HEALTH_CSV_URL),
  fetchText(STUDIO_ADOPTION_CSV_URL),
])

const rooftopRows = normalizeRows(Papa.parse(rooftopCsv, { header: true, skipEmptyLines: true }).data)
const healthMap = parseMatrix(Papa.parse(healthCsv, { header: false, skipEmptyLines: false }).data)
const adoptionMap = parseMatrix(Papa.parse(adoptionCsv, { header: false, skipEmptyLines: false }).data)

const html = buildStudioHealthHtml(buildStudioHealthPayload({ rooftopRows, healthMap, adoptionMap }))

if (process.argv.includes('send')) {
  const result = await sendReport(html, 'Studio Health Report')
  console.log(`✓ Sent — ${rooftopRows.length} rows (all stages). API response:`, JSON.stringify(result))
} else {
  const out = join(ROOT, 'studio-health-preview.html')
  writeFileSync(out, html)
  console.log(`✓ Wrote studio-health-preview.html — ${rooftopRows.length} rows (all stages)`)
}
