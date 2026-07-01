// Vercel serverless function: builds and sends the daily internal SmartView
// adoption report email. Triggered once a day by the Vercel cron defined in
// vercel.json (08:00 UTC = 1:30 PM IST).
//
// It reads the same Rooftop-Level adoption data the dashboard uses (now from
// Supabase, populated hourly by /api/sync-adoption), runs the same transform +
// aggregation logic, renders the Overview content (minus "Newly Onboarded
// Clients") as an HTML email, and sends it via the internal email API.
//
// Add ?preview=1 to return the rendered HTML instead of sending — handy for QA.

import { transformRows } from '../src/data/transform.js'
import { byCSM, byCustomerSegment, computeKpis } from '../src/data/aggregations.js'
import { buildEmailHtml } from './_emailTemplate.js'
import { sendReport } from './_emailClient.js'
import { fetchRooftopRows } from './_adoptionDb.js'

export default async function handler(req, res) {
  // Cron auth: only enforced when CRON_SECRET is set (so local runs need no
  // header). Vercel cron sends `Authorization: Bearer <CRON_SECRET>` automatically.
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const rows = transformRows(await fetchRooftopRows())

    const kpis = computeKpis(rows)
    const segmentRows = byCustomerSegment(rows)
    const csmRows = byCSM(rows)

    // Totals row for the tables — mirrors Overview.jsx (App % vs active rooftops;
    // SmartView/Campaign % vs total).
    const totalEnterprises = new Set(rows.map((r) => r.enterpriseId)).size
    const totalRow = {
      rooftops: kpis.total,
      enterprises: totalEnterprises,
      app: kpis.app,
      sv: kpis.sv,
      svl: kpis.svl,
      sc: kpis.sc,
      appPct: kpis.active ? kpis.app / kpis.active : 0,
      svPct: kpis.total ? kpis.sv / kpis.total : 0,
      svlPct: kpis.total ? kpis.svl / kpis.total : 0,
      scPct: kpis.total ? kpis.sc / kpis.total : 0,
    }

    const html = buildEmailHtml({ kpis, totalRow, segmentRows, csmRows })

    // Preview mode: render the email in the browser without sending.
    if (req.query?.preview) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.status(200).send(html)
    }

    const result = await sendReport(html)
    return res.status(200).json({ ok: true, rooftops: rows.length, result })
  } catch (e) {
    console.error('[scheduled-report] failed:', e)
    return res.status(500).json({ error: e.message })
  }
}
