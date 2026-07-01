# SmartView, App & Smart Campaign Adoption

A self-serve dashboard tracking SmartView (VDP & VLP), Studio App and Smart Campaign adoption across
rooftops, enterprises and CSMs. Built to be opened by anyone via a URL without re-querying ClickHouse —
it reads an hourly-synced Supabase table and computes every rollup in the browser.

## How it works

- **Source of truth:** a Supabase Postgres table (`adoption.rooftop_adoption`, one row per rooftop),
  synced hourly from a Metabase public card by [api/sync-adoption.js](api/sync-adoption.js) (Vercel cron).
- **Data access:** the browser fetches `/api/rooftops` (same-origin). In production that's a Vercel
  serverless function ([api/rooftops.js](api/rooftops.js)) that reads the Supabase table and returns it
  as CSV with an edge cache. Adding `?sync=1` (the Refresh button) runs a fresh Metabase pull first. In
  dev, a Vite middleware in [vite.config.js](vite.config.js) mirrors the same endpoint.
- **Aggregation:** 100% client-side ([src/data/aggregations.js](src/data/aggregations.js)) so
  all filters and views stay dynamic.

## Tabs

- **Overview** — Total Rooftops / SmartView Adoption / App Adoption / Smart Campaign Adoption /
  SmartView VLP Adoption KPIs, By Rooftop Type, By CSM, and Newly Onboarded Clients (by live-date
  month, with a date-range filter).
- **Enterprise View** — one row per enterprise, with search + Account Type + CSM filters.
- **Rooftop View** — one row per rooftop (lowest level), with the full filter set.

All tables are sortable, paginated, and exportable to CSV.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
```

## Daily report email

[api/scheduled-report.js](api/scheduled-report.js) is a Vercel serverless function, triggered
once a day by a Vercel cron (`30 7 * * *` = **1 PM IST**, see [vercel.json](vercel.json)). It
reads the same Supabase data, runs the same transform + aggregations, and emails the Overview content
(the 6 KPI cards + By Customer Segment / By Rooftop Type / By CSM tables — **excluding Newly
Onboarded Clients**) as an HTML email via the internal email API, reusing VIN Tracker's pattern.

- **HTML** is built in [api/\_emailTemplate.js](api/_emailTemplate.js); **sending** in
  [api/\_emailClient.js](api/_emailClient.js). (`_`-prefixed files aren't routed by Vercel.)
- **Env vars** (set in Vercel): `CRON_SECRET` (cron auth — the endpoint is open when unset, so
  local runs need no header), `INTERNAL_EMAIL_API_URL`, `EMAIL_TO` (required), `EMAIL_CC`,
  `EMAIL_BCC`, `FROM`, `DASHBOARD_URL` (optional CTA link). See [.env.example](.env.example).
- **Preview:** `GET /api/scheduled-report?preview=1` returns the rendered HTML without sending.

## Deploy (Vercel)

- Framework preset: Vite (build `npm run build`, output `dist`). Serverless functions in `api/`
  are detected automatically. [vercel.json](vercel.json) adds only the cron + function config
  (no rewrites), so the Vite preset still handles the build and SPA fallback.
- Required env var `ADOPTION_DATABASE_URL` (Supabase transaction-pooler URL, port 6543); optional
  `ADOPTION_CARD_URL` overrides the Metabase card. Set in Vercel Project → Settings → Environment
  Variables. The hourly `/api/sync-adoption` cron populates the table.
- For the daily email to send, set the report env vars listed above.

## Derived field notes

- **Rooftop Type** = team_sub_type (Franchise/Independent) × team_type (Group/Individual);
  non-dealer types → Others, blank type → NA.
- **Account Type** (enterprise) = any GROUP_DEALER → Group; else INDIVIDUAL_DEALER → Individual;
  else any other type → Others; all blank → NA.
- Adoption % = adopted rooftops / all rooftops in the group.
