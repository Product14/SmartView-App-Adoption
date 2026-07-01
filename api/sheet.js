// Vercel serverless function: serves the Rooftop-Level adoption data as CSV.
//
// Previously this proxied the Google Sheet's gviz CSV. It now reads from
// Supabase (adoption.rooftop_adoption, populated hourly by /api/sync-adoption)
// and re-serializes to CSV with the EXACT same headers the sheet used — so the
// client (useSheetData.js → PapaParse → transform.js) is unchanged.

import Papa from 'papaparse'
import { fetchRooftopRows } from './_adoptionDb.js'

export default async function handler(_req, res) {
  try {
    const rows = await fetchRooftopRows()
    // Papa.unparse takes the header row from the object keys, which fetchRooftopRows
    // aliases to the original sheet header casing (e.g. Smartview_vlp_enabled).
    const csv = Papa.unparse(rows)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    // Cache at the edge for 10 min, serve stale for 30 min while revalidating —
    // keeps page loads off the database.
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800')
    res.status(200).send(csv)
  } catch (e) {
    res.status(500).send('Failed to load adoption data: ' + e.message)
  }
}
