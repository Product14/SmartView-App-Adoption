// Vercel serverless function: builds and sends the daily internal "Studio Health
// Report" email. Triggered once a day by the Vercel cron defined in vercel.json.
//
// It reads three tabs of the same Google Sheet the dashboard uses:
//   • Rooftop Level   (gid 0)          → plan tiers + total/live/active + VLP/Campaign
//   • Studio Health   (gid 1632148391) → Images / 360 / Video delivery metrics
//   • Studio Adoption (gid 1323822955) → App / SmartView VDP / SmartMatch adoption %
// then renders the matrix as an HTML email and sends it via the internal email API.
//
// Add ?preview=1 to return the rendered HTML instead of sending — handy for QA.

import Papa from 'papaparse'
import { normalizeRows } from '../src/data/transform.js'
import { parseMatrix } from '../src/data/studioMetrics.js'
import { buildStudioHealthPayload } from './_studioHealthData.js'
import { buildStudioHealthHtml } from './_studioHealthTemplate.js'
import { sendReport } from './_emailClient.js'

const SHEET_ID = '1VDvn6ZcHfRYdjtVHi2aJ06tylbKX2TyC9Lvhg-0-078'
const gvizUrl = (gid) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`
// The matrix tabs mix value types within a column (%, plain numbers, "4.3s"). The gviz
// CSV endpoint infers one type per column and silently drops cells that don't match it,
// so use the plain CSV export, which preserves every cell verbatim.
const exportCsvUrl = (gid) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`

const ROOFTOP_CSV_URL = process.env.SHEET_CSV_URL || gvizUrl(0)
const STUDIO_HEALTH_CSV_URL = process.env.STUDIO_HEALTH_CSV_URL || exportCsvUrl('1632148391')
const STUDIO_ADOPTION_CSV_URL = process.env.STUDIO_ADOPTION_CSV_URL || exportCsvUrl('1323822955')

async function fetchCsv(url) {
  const upstream = await fetch(url, { redirect: 'follow' })
  if (!upstream.ok) throw new Error(`Upstream error ${upstream.status} for ${url}`)
  return upstream.text()
}

export async function buildHtml() {
  const [rooftopCsv, healthCsv, adoptionCsv] = await Promise.all([
    fetchCsv(ROOFTOP_CSV_URL),
    fetchCsv(STUDIO_HEALTH_CSV_URL),
    fetchCsv(STUDIO_ADOPTION_CSV_URL),
  ])

  const rooftopRows = normalizeRows(Papa.parse(rooftopCsv, { header: true, skipEmptyLines: true }).data)
  const healthMap = parseMatrix(Papa.parse(healthCsv, { header: false, skipEmptyLines: false }).data)
  const adoptionMap = parseMatrix(Papa.parse(adoptionCsv, { header: false, skipEmptyLines: false }).data)

  const payload = buildStudioHealthPayload({ rooftopRows, healthMap, adoptionMap })
  return { html: buildStudioHealthHtml(payload), rooftops: rooftopRows.length }
}

export default async function handler(req, res) {
  // Cron auth: only enforced when CRON_SECRET is set (so local runs need no header).
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { html, rooftops } = await buildHtml()

    // Preview mode: render the email in the browser without sending.
    if (req.query?.preview) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.status(200).send(html)
    }

    const result = await sendReport(html, 'Studio Health Report')
    return res.status(200).json({ ok: true, rooftops, result })
  } catch (e) {
    console.error('[studio-health-report] failed:', e)
    return res.status(500).json({ error: e.message })
  }
}
