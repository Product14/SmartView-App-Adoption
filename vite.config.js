import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Mirror the production serverless functions during `vite dev` so the API works
// at http://localhost:5173/api/* (Postman, browser, etc.) without the Vercel CLI.
function devApi() {
  return {
    name: 'dev-api',
    configureServer(server) {
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

      // /api/rooftops — the dashboard's adoption CSV, backed by Supabase.
      server.middlewares.use('/api/rooftops', runHandler('./api/rooftops.js', 'rooftops'))

      // /api/sync-adoption — manual Metabase → Supabase sync (hourly cron in prod).
      server.middlewares.use(
        '/api/sync-adoption',
        runHandler('./api/sync-adoption.js', 'sync-adoption'),
      )

      // /api/scheduled-report — the daily adoption report.
      server.middlewares.use(
        '/api/scheduled-report',
        runHandler('./api/scheduled-report.js', 'scheduled-report'),
      )

      // /api/studio-health-report — the daily studio health report (email).
      server.middlewares.use(
        '/api/studio-health-report',
        runHandler('./api/studio-health-report.js', 'studio-health-report'),
      )

      // Studio Health Report — on-screen executive board (2×3 grid). Served at the
      // clean /studio-health-report URL (mirrors the production vercel.json rewrite)
      // and also at /api/studio-health-board.
      const boardHandler = runHandler('./api/studio-health-board.js', 'studio-health-board')
      server.middlewares.use('/api/studio-health-board', boardHandler)
      server.middlewares.use('/studio-health-report', boardHandler)
    },
  }
}

export default defineConfig(({ mode }) => {
  // Load .env / .env.local into process.env so the dev middleware and the
  // scheduled-report handler can read EMAIL_TO, INTERNAL_EMAIL_API_URL, FROM, etc.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return { plugins: [react(), devApi()] }
})
