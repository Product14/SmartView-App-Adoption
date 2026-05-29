// Vercel serverless function: proxies the Google Sheet CSV server-side.
// The gviz endpoint returns no CORS header, so the browser can't fetch it
// directly — this fetches it server-side and adds an edge cache layer so we
// don't hammer the source (and never touch ClickHouse) on every page load.

const SHEET_CSV_URL =
  process.env.SHEET_CSV_URL ||
  'https://docs.google.com/spreadsheets/d/1VDvn6ZcHfRYdjtVHi2aJ06tylbKX2TyC9Lvhg-0-078/gviz/tq?tqx=out:csv&gid=0'

export default async function handler(_req, res) {
  try {
    const upstream = await fetch(SHEET_CSV_URL, { redirect: 'follow' })
    if (!upstream.ok) {
      res.status(502).send('Upstream error ' + upstream.status)
      return
    }
    const csv = await upstream.text()
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    // Cache at the edge for 10 min, serve stale for 30 min while revalidating.
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800')
    res.status(200).send(csv)
  } catch (e) {
    res.status(500).send('Failed to fetch sheet: ' + e.message)
  }
}
