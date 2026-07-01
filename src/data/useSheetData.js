import { useCallback, useEffect, useState } from 'react'
import Papa from 'papaparse'
import { transformRows } from './transform.js'

// Same-origin endpoint: a Vercel serverless function in prod, a vite
// middleware in dev. Both fetch the Google Sheet CSV server-side.
const ENDPOINT = '/api/sheet'

export function useSheetData() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastSynced, setLastSynced] = useState(null)

  // sync=false → just read the current Supabase snapshot (fast; used on mount).
  // sync=true  → trigger a fresh Metabase → Supabase pull first, then read
  //              (the Refresh button; takes a few seconds).
  const load = useCallback((sync = false) => {
    setLoading(true)
    setError(null)
    const url = `${ENDPOINT}?${sync ? 'sync=1&' : ''}t=${Date.now()}`
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        try {
          setRows(transformRows(res.data))
          setLastSynced(new Date())
        } catch (e) {
          setError(e.message || 'Failed to parse data')
        }
        setLoading(false)
      },
      error: (err) => {
        setError(err?.message || 'Failed to load data')
        setLoading(false)
      },
    })
  }, [])

  useEffect(() => {
    load(false)
  }, [load])

  return { rows, loading, error, lastSynced, refresh: () => load(true) }
}
