import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const DEFAULT_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1VDvn6ZcHfRYdjtVHi2aJ06tylbKX2TyC9Lvhg-0-078/gviz/tq?tqx=out:csv&gid=0'

// Mirror the production serverless functions during `vite dev` so the API works
// at http://localhost:5173/api/* (Postman, browser, etc.) without the Vercel CLI.
function devApi() {
  return {
    name: 'dev-api',
    configureServer(server) {
      // /api/sheet — proxy the gviz CSV server-side (no CORS header upstream).
      server.middlewares.use('/api/sheet', async (_req, res) => {
        try {
          const upstream = await fetch(process.env.SHEET_CSV_URL || DEFAULT_SHEET_CSV_URL, {
            redirect: 'follow',
          })
          const csv = await upstream.text()
          res.setHeader('Content-Type', 'text/csv; charset=utf-8')
          res.end(csv)
        } catch (e) {
          res.statusCode = 500
          res.end('Failed to fetch sheet: ' + e.message)
        }
      })

      // Adapt raw Node req/res to the Vercel-style API the serverless handlers
      // expect, then run the real handler module.
      const runHandler = (modulePath, label) => async (req, res) => {
        try {
          const { default: handler } = await import(modulePath)
          const url = new URL(req.url, 'http://localhost')
          req.query = Object.fromEntries(url.searchParams)
          res.status = (code) => {
            res.statusCode = code
            return res
          }
          res.json = (obj) => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(obj))
          }
          res.send = (data) => res.end(data)
          await handler(req, res)
        } catch (e) {
          res.statusCode = 500
          res.end(`${label} dev error: ` + e.message)
        }
      }

      // /api/scheduled-report — the daily adoption report.
      server.middlewares.use(
        '/api/scheduled-report',
        runHandler('./api/scheduled-report.js', 'scheduled-report'),
      )

      // /api/studio-health-report — the daily studio health report.
      server.middlewares.use(
        '/api/studio-health-report',
        runHandler('./api/studio-health-report.js', 'studio-health-report'),
      )
    },
  }
}

export default defineConfig(({ mode }) => {
  // Load .env / .env.local into process.env so the dev middleware and the
  // scheduled-report handler can read EMAIL_TO, INTERNAL_EMAIL_API_URL, FROM, etc.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return { plugins: [react(), devApi()] }
})
