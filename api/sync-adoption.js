// Vercel serverless function: syncs the Rooftop-Level adoption data from the
// Metabase public card straight into Supabase Postgres (adoption.rooftop_adoption).
// Replaces the old Google-Sheet AppScript hop. Runs hourly via the Vercel cron
// in vercel.json, and can be POSTed manually for an on-demand backfill.
//
// Mirrors the VIN-Tracker pattern (server/app.js syncRooftops + runSync):
//   fetch Metabase → dedup by team_id → atomic DELETE+INSERT swap, guarded by a
//   single-row distributed lock and an empty-pull guard so a transient empty
//   response never wipes the last good snapshot.

import Papa from 'papaparse'
import { query, getClient, ensureAdoptionSchema, TABLE, SCHEMA } from './_adoptionDb.js'

const CARD_URL =
  process.env.ADOPTION_CARD_URL ||
  'https://metabase.spyne.ai/api/public/card/2cbd4bc0-0b58-4fe4-9bd9-5262337e4312/query/csv'

// DB columns in insert order. The source-header → column mapping lives in SOURCES below.
const COLUMNS = [
  'team_id',
  'enterprise_id',
  'team_name',
  'enterprise_name',
  'stage',
  'cs_poc',
  'ob_poc',
  'contracted_arr',
  'team_type',
  'team_sub_type',
  'customer_segment',
  'live_date',
  'plan',
  'app_adoption',
  'smartview_vdp_enabled',
  'smartview_vlp_enabled',
  'smart_campaign_adoption',
  'active',
  'enterprise_stage',
  'synced_at',
]

// Map each DB column to the source CSV header(s). Defensive: the card currently
// emits clean names, but accept the `lt.`-prefixed variants too (transform.js
// guards against the same drift) so a Metabase query tweak can't silently null
// out the ids.
// The Metabase card prefixes its id columns with a single apostrophe (a text-
// format directive). The old pipeline went through Google Sheets, which strips
// that leading apostrophe on CSV export — so the dashboard has always seen clean
// ids. Strip one leading apostrophe here to keep byte-for-byte parity. No
// legitimate value in this dataset starts with an apostrophe.
const norm = (v) => {
  const s = v == null ? '' : String(v)
  return s.charAt(0) === "'" ? s.slice(1) : s
}
const SOURCES = {
  team_id: (r) => norm(r['team_id'] ?? r['lt.team_id']),
  enterprise_id: (r) => norm(r['enterprise_id'] ?? r['lt.enterprise_id']),
  team_name: (r) => norm(r['team_name']),
  enterprise_name: (r) => norm(r['enterprise_name']),
  stage: (r) => norm(r['stage']),
  cs_poc: (r) => norm(r['cs_poc']),
  ob_poc: (r) => norm(r['ob_poc']),
  contracted_arr: (r) => norm(r['contracted_arr']),
  team_type: (r) => norm(r['team_type']),
  team_sub_type: (r) => norm(r['team_sub_type']),
  customer_segment: (r) => norm(r['customer_segment']),
  live_date: (r) => norm(r['live_date']),
  plan: (r) => norm(r['plan'] ?? r['Plan']),
  app_adoption: (r) => norm(r['app_adoption']),
  smartview_vdp_enabled: (r) => norm(r['Smartview_vdp_enabled'] ?? r['smartview_vdp_enabled']),
  smartview_vlp_enabled: (r) => norm(r['Smartview_vlp_enabled'] ?? r['smartview_vlp_enabled']),
  smart_campaign_adoption: (r) => norm(r['smart_campaign_adoption']),
  active: (r) => norm(r['Active'] ?? r['active']),
  enterprise_stage: (r) => norm(r['enterprise_stage']),
}

async function fetchCardRows(retries = 2) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(CARD_URL, {
        redirect: 'follow',
        signal: AbortSignal.timeout(45000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()

      // Metabase sometimes returns an error as a JSON body even on the CSV endpoint.
      const head = text.replace(/^﻿/, '').trimStart()
      if (head.startsWith('{') || head.startsWith('[')) {
        let msg = head.slice(0, 200)
        try {
          const j = JSON.parse(head)
          msg = j.error || j.message || msg
        } catch {
          /* keep raw head */
        }
        throw new Error(`Metabase returned a non-CSV (JSON) body: ${msg}`)
      }

      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
      return parsed.data
    } catch (err) {
      lastErr = err
      if (attempt < retries) {
        const delay = 3000 * (attempt + 1)
        console.warn(`[sync-adoption] fetch failed, retrying in ${delay / 1000}s — ${err.message}`)
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }
  throw lastErr
}

export async function runSync() {
  await ensureAdoptionSchema()

  // Atomic lock claim. Steal a stale lock (>10 min) so a timed-out run can't wedge sync forever.
  const { rows: claimed } = await query(`
    UPDATE ${SCHEMA}.sync_state
       SET running = TRUE, started_at = NOW(), completed_at = NULL
     WHERE id = 'global'
       AND (running = FALSE OR started_at < NOW() - INTERVAL '10 minutes')
    RETURNING id
  `)
  if (claimed.length === 0) {
    console.warn('[sync-adoption] already in progress — skipping')
    return { skipped: true }
  }

  try {
    const rawRows = await fetchCardRows()

    // Dedup by team_id (skip blanks; keep last occurrence).
    const byId = new Map()
    for (const r of rawRows) {
      const id = SOURCES.team_id(r)
      if (id) byId.set(id, r)
    }
    const deduped = [...byId.values()]

    // Empty-pull guard: never wipe a good snapshot because of a transient empty
    // response (Metabase timeout → valid-but-empty CSV).
    if (deduped.length === 0) {
      throw new Error('aborting swap — source returned 0 rows; keeping previous snapshot')
    }

    const syncedAt = new Date().toISOString()
    const arrays = COLUMNS.map((col) =>
      col === 'synced_at' ? deduped.map(() => syncedAt) : deduped.map((r) => SOURCES[col](r)),
    )

    const client = await getClient()
    try {
      await client.query('BEGIN')
      await client.query(`DELETE FROM ${TABLE}`)
      const unnest = COLUMNS.map((_, i) => `UNNEST($${i + 1}::text[])`).join(', ')
      await client.query(
        `INSERT INTO ${TABLE} (${COLUMNS.join(', ')}) SELECT ${unnest}`,
        arrays,
      )
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }

    await query(
      `UPDATE ${SCHEMA}.sync_state
          SET running = FALSE, completed_at = NOW(), total_rows = $1, last_sync = $2
        WHERE id = 'global'`,
      [deduped.length, syncedAt],
    )

    console.log(`[sync-adoption] done — ${deduped.length} rooftops`)
    return { skipped: false, rows: deduped.length }
  } catch (e) {
    // Release the lock so the next cron can retry; keep prior data intact.
    await query(`UPDATE ${SCHEMA}.sync_state SET running = FALSE WHERE id = 'global'`).catch(
      () => {},
    )
    throw e
  }
}

export default async function handler(req, res) {
  // Cron auth: only enforced when CRON_SECRET is set (local runs need no header).
  // Vercel cron sends `Authorization: Bearer <CRON_SECRET>` automatically.
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const result = await runSync()
    return res.status(200).json({ ok: true, ...result })
  } catch (e) {
    console.error('[sync-adoption] failed:', e)
    return res.status(500).json({ ok: false, error: e.message })
  }
}
