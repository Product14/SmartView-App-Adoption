import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Default to the link-shared sheet's gviz CSV endpoint; override with SHEET_CSV_URL.
const SHEET_CSV_URL =
  process.env.SHEET_CSV_URL ||
  'https://docs.google.com/spreadsheets/d/1VDvn6ZcHfRYdjtVHi2aJ06tylbKX2TyC9Lvhg-0-078/gviz/tq?tqx=out:csv&gid=0'

// Mirror the production /api/sheet serverless function during `vite dev`.
// The gviz endpoint sends no CORS header, so we fetch it server-side here too.
function sheetDevApi() {
  return {
    name: 'sheet-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/sheet', async (_req, res) => {
        try {
          const upstream = await fetch(SHEET_CSV_URL, { redirect: 'follow' })
          const csv = await upstream.text()
          res.setHeader('Content-Type', 'text/csv; charset=utf-8')
          res.end(csv)
        } catch (e) {
          res.statusCode = 500
          res.end('Failed to fetch sheet: ' + e.message)
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), sheetDevApi()],
})
