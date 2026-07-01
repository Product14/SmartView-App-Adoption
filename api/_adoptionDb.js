// Shared Supabase/Postgres access for the Rooftop-Level adoption data.
//
// Mirrors the VIN-Tracker pattern (server/db.js): a small pg.Pool against the
// Supabase transaction-mode pooler, an idempotent schema bootstrap, and a
// single read helper that returns rows keyed by the exact CSV header names the
// dashboard's transform layer expects — so swapping the data source from the
// Google Sheet to Postgres needs zero changes to the client pipeline.

import pg from 'pg'

const { Pool } = pg

// Keep the pool tiny: Vercel functions are short-lived and Supabase has a
// bounded connection budget. idleTimeout releases connections quickly between
// invocations. Use the transaction-mode pooler URL (port 6543) in prod.
const pool = new Pool({
  connectionString: process.env.ADOPTION_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
})

export const query = (text, params) => pool.query(text, params)
export const getClient = () => pool.connect()

// Everything lives under a dedicated `adoption` schema so it never collides
// with VIN-Tracker's tables in the same database.
export const SCHEMA = 'adoption'
export const TABLE = `${SCHEMA}.rooftop_adoption`

// ─── Schema bootstrap ───────────────────────────────────────────────────────
// Idempotent and memoized: the DDL runs at most once per cold start. All data
// columns are TEXT — the dashboard's transform.js does its own number/date/
// Yes-No parsing, so we must preserve the source bytes verbatim and not let
// Postgres coerce/reformat them.

let schemaReady = null

export function ensureAdoptionSchema() {
  if (!schemaReady) {
    schemaReady = pool
      .query(`
        CREATE SCHEMA IF NOT EXISTS ${SCHEMA};

        CREATE TABLE IF NOT EXISTS ${TABLE} (
          team_id                 TEXT PRIMARY KEY,
          enterprise_id           TEXT,
          team_name               TEXT,
          enterprise_name         TEXT,
          stage                   TEXT,
          cs_poc                  TEXT,
          ob_poc                  TEXT,
          contracted_arr          TEXT,
          team_type               TEXT,
          team_sub_type           TEXT,
          customer_segment        TEXT,
          live_date               TEXT,
          plan                    TEXT,
          app_adoption            TEXT,
          smartview_vdp_enabled   TEXT,
          smartview_vlp_enabled   TEXT,
          smart_campaign_adoption TEXT,
          active                  TEXT,
          enterprise_stage        TEXT,
          synced_at               TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_rooftop_adoption_enterprise
          ON ${TABLE}(enterprise_id);

        -- Single-row distributed sync lock + last-sync metadata.
        CREATE TABLE IF NOT EXISTS ${SCHEMA}.sync_state (
          id            TEXT PRIMARY KEY DEFAULT 'global',
          running       BOOLEAN NOT NULL DEFAULT FALSE,
          started_at    TIMESTAMPTZ,
          completed_at  TIMESTAMPTZ,
          total_rows    INTEGER,
          last_sync     TEXT
        );
        INSERT INTO ${SCHEMA}.sync_state (id) VALUES ('global')
          ON CONFLICT (id) DO NOTHING;
      `)
      .catch((err) => {
        // Don't cache a failed bootstrap — let the next call retry.
        schemaReady = null
        throw err
      })
  }
  return schemaReady
}

// Read all rooftops, aliasing each column back to the EXACT header string the
// Google Sheet used (and that transform.js reads). Casing is load-bearing:
// transform.js looks up `Smartview_vdp_enabled`, `Smartview_vlp_enabled` and
// `Active` by exact key. Returning these as the object keys means Papa.unparse
// reproduces the identical CSV the dashboard consumed before.
export async function fetchRooftopRows() {
  await ensureAdoptionSchema()
  const { rows } = await query(`
    SELECT
      team_id                 AS "team_id",
      enterprise_id           AS "enterprise_id",
      team_name               AS "team_name",
      enterprise_name         AS "enterprise_name",
      stage                   AS "stage",
      cs_poc                  AS "cs_poc",
      ob_poc                  AS "ob_poc",
      contracted_arr          AS "contracted_arr",
      team_type               AS "team_type",
      team_sub_type           AS "team_sub_type",
      customer_segment        AS "customer_segment",
      live_date               AS "live_date",
      plan                    AS "plan",
      app_adoption            AS "app_adoption",
      smartview_vdp_enabled   AS "Smartview_vdp_enabled",
      smartview_vlp_enabled   AS "Smartview_vlp_enabled",
      smart_campaign_adoption AS "smart_campaign_adoption",
      active                  AS "Active",
      enterprise_stage        AS "enterprise_stage"
    FROM ${TABLE}
    ORDER BY team_id
  `)
  return rows
}
