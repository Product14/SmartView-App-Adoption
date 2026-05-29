# SmartView & App Adoption

A self-serve dashboard tracking SmartView (VDP) and Studio App adoption across rooftops,
enterprises and CSMs. Built to be opened by anyone via a URL without re-querying ClickHouse —
it reads an hourly-refreshed Google Sheet and computes every rollup in the browser.

## How it works

- **Source of truth:** a Google Sheet (rooftop-level, one row per rooftop) that an AppScript
  trigger refreshes hourly from a Metabase public CSV.
- **Data access:** the browser fetches `/api/sheet` (same-origin). In production that's a Vercel
  serverless function ([api/sheet.js](api/sheet.js)) that proxies the sheet's gviz CSV
  server-side (the gviz endpoint sends no CORS header) and adds an edge cache. In dev, a Vite
  middleware in [vite.config.js](vite.config.js) mirrors the same endpoint.
- **Aggregation:** 100% client-side ([src/data/aggregations.js](src/data/aggregations.js)) so
  all filters and views stay dynamic.

## Tabs

- **Overview** — Total Rooftops / SmartView Adopted / App Adopted KPIs, By Rooftop Type, By CSM,
  and Newly Onboarded Clients (by live-date month, with a date-range filter).
- **Enterprise View** — one row per enterprise, with search + Account Type + CSM filters.
- **Rooftop View** — one row per rooftop (lowest level), with the full filter set.

All tables are sortable, paginated, and exportable to CSV.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
```

## Deploy (Vercel)

- Framework preset: Vite (build `npm run build`, output `dist`). Serverless function in `api/`
  is detected automatically. No `vercel.json` needed.
- Optional env var `SHEET_CSV_URL` overrides the default sheet CSV endpoint (set in Vercel
  Project → Settings → Environment Variables). Defaults are baked in as a fallback.

## Derived field notes

- **Rooftop Type** = team_sub_type (Franchise/Independent) × team_type (Group/Individual);
  non-dealer types → Others, blank type → NA.
- **Account Type** (enterprise) = any GROUP_DEALER → Group; else INDIVIDUAL_DEALER → Individual;
  else any other type → Others; all blank → NA.
- Adoption % = adopted rooftops / all rooftops in the group.
