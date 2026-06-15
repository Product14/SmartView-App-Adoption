// Vercel serverless function: renders the Studio Health Report as an on-screen
// EXECUTIVE BOARD — the same data + design system as the daily email
// (api/studio-health-report.js), re-laid-out as a 2×3 grid of six segments:
//
//   Col 1: Funnel — Contracted → Live  ·  Images  ·  Video
//   Col 2: Plan (by tier)              ·  360     ·  Adoption
//
// View-only: a browser GET renders the page (no email send, no cron). It carries
// an edge-cache header so production serves it from cache and refreshes hourly,
// matching the source sheet's hourly AppScript refresh. In production it is wired
// to the clean URL /studio-health-report via a rewrite in vercel.json; in dev the
// vite middleware mounts it at both /studio-health-report and /api/studio-health-board.

import Papa from 'papaparse'
import { normalizeRows } from '../src/data/transform.js'
import { parseMatrix } from '../src/data/studioMetrics.js'
import { buildStudioHealthPayload } from './_studioHealthData.js'
import { buildStudioHealthBoardHtml } from './_studioHealthBoardTemplate.js'

const SHEET_ID = '1VDvn6ZcHfRYdjtVHi2aJ06tylbKX2TyC9Lvhg-0-078'
const gvizUrl = (gid) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`
// Matrix tabs use the plain CSV export — gviz drops cells in mixed-type columns.
const exportCsvUrl = (gid) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`

const ROOFTOP_CSV_URL = process.env.SHEET_CSV_URL || gvizUrl(0)
const STUDIO_HEALTH_CSV_URL = process.env.STUDIO_HEALTH_CSV_URL || exportCsvUrl('1632148391')
const STUDIO_ADOPTION_CSV_URL = process.env.STUDIO_ADOPTION_CSV_URL || exportCsvUrl('1323822955')

// Reliable CSV fetch: per-attempt timeout (so a hung Google request can't stall the
// whole function) + retries with linear backoff for transient upstream errors, and a
// guard against empty / HTML-error-page responses that would otherwise parse to junk.
async function fetchCsv(url, { label = 'sheet', retries = 2, timeoutMs = 10000 } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const upstream = await fetch(url, { redirect: 'follow', signal: controller.signal })
      if (!upstream.ok) throw new Error(`HTTP ${upstream.status}`)
      const text = await upstream.text()
      if (!text || !text.trim()) throw new Error('empty response')
      // gviz/export return CSV; an auth/error page comes back as HTML — reject it.
      if (/^\s*<(?:!doctype|html)/i.test(text)) throw new Error('got HTML, not CSV (sheet not link-shared?)')
      return text
    } catch (e) {
      lastErr = e
      if (attempt < retries) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
    } finally {
      clearTimeout(timer)
    }
  }
  throw new Error(`Failed to fetch ${label} after ${retries + 1} attempts: ${lastErr?.message}`)
}

export async function buildBoardHtml() {
  const [rooftopCsv, healthCsv, adoptionCsv] = await Promise.all([
    fetchCsv(ROOFTOP_CSV_URL, { label: 'Rooftop Level' }),
    fetchCsv(STUDIO_HEALTH_CSV_URL, { label: 'Studio Health' }),
    fetchCsv(STUDIO_ADOPTION_CSV_URL, { label: 'Studio Adoption' }),
  ])

  const rooftopRows = normalizeRows(Papa.parse(rooftopCsv, { header: true, skipEmptyLines: true }).data)
  // The funnel + plan (Row 1) are driven entirely by the rooftop tab — if it came back
  // unparseable, fail loudly rather than render a board full of zeros.
  if (!rooftopRows.length) throw new Error('Rooftop Level tab parsed to 0 rows')
  const healthMap = parseMatrix(Papa.parse(healthCsv, { header: false, skipEmptyLines: false }).data)
  const adoptionMap = parseMatrix(Papa.parse(adoptionCsv, { header: false, skipEmptyLines: false }).data)

  const payload = await buildStudioHealthPayload({ rooftopRows, healthMap, adoptionMap })
  return buildStudioHealthBoardHtml(payload)
}

export default async function handler(req, res) {
  try {
    const html = await buildBoardHtml()
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    if (req.query?.refresh) {
      // Refresh button: bypass every cache and return the just-fetched numbers.
      res.setHeader('Cache-Control', 'no-store, max-age=0')
    } else {
      // Refresh hourly at the edge; serve stale while revalidating in the background.
      // The hourly Vercel cron (vercel.json) re-warms this between visits.
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400')
    }
    return res.status(200).send(html)
  } catch (e) {
    console.error('[studio-health-board] failed:', e)
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res
      .status(500)
      .send(`<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;padding:40px;color:#b91c1c;">
        <h1 style="margin:0 0 8px;">Studio Health Report — temporarily unavailable</h1>
        <p style="color:#374151;">Failed to build the board: ${String(e.message)}</p></body>`)
  }
}
