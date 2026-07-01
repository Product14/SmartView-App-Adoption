// Vercel serverless function (GET /api/rooftops): serves the Rooftop-Level
// adoption data as CSV.
//
// Reads from Supabase (adoption.rooftop_adoption). With ?sync=1 it first runs a
// fresh Metabase → Supabase pull (the dashboard's Refresh button uses this), so
// clicking Refresh reflects live Metabase data — not just the last hourly cron.
// Plain reads (initial page load) skip the sync and are served from the edge cache.

import Papa from 'papaparse'
import { fetchRooftopRows, getLastSync } from './_adoptionDb.js'
import { runSync } from './sync-adoption.js'

export default async function handler(req, res) {
  try {
    if (req.query?.sync) {
      // Best-effort: if the live pull fails, fall back to the current snapshot
      // rather than erroring the dashboard. The sync lock serializes concurrent
      // triggers (extra calls return quickly as skipped).
      try {
        await runSync()
      } catch (e) {
        console.error('[rooftops] refresh sync failed, serving current snapshot:', e.message)
      }
    }

    const [rows, lastSync] = await Promise.all([fetchRooftopRows(), getLastSync()])
    // Papa.unparse takes the header row from the object keys, which fetchRooftopRows
    // aliases to the exact header casing transform.js expects (e.g. Smartview_vlp_enabled).
    const csv = Papa.unparse(rows)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    // True data freshness (last Metabase → Supabase sync) for the header's "synced X ago".
    if (lastSync) res.setHeader('X-Last-Sync', lastSync)
    // A sync-triggering refresh must never be cached; a plain read caches at the
    // edge for 10 min (stale-while-revalidate 30 min) to keep page loads off the DB.
    res.setHeader(
      'Cache-Control',
      req.query?.sync ? 'no-store' : 's-maxage=600, stale-while-revalidate=1800',
    )
    res.status(200).send(csv)
  } catch (e) {
    res.status(500).send('Failed to load adoption data: ' + e.message)
  }
}
