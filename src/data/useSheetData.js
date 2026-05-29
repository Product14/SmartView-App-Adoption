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

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    Papa.parse(`${ENDPOINT}?t=${Date.now()}`, {
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
    load()
  }, [load])

  return { rows, loading, error, lastSynced, refresh: load }
}
