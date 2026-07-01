import { useCallback, useEffect, useState } from 'react'
import Papa from 'papaparse'
import { transformRows } from './transform.js'

// Same-origin endpoint: a Vercel serverless function in prod, a vite middleware
// in dev. Both serve the rooftop adoption rows as CSV from Supabase (?sync=1
// triggers a fresh Metabase pull first).
const ENDPOINT = '/api/rooftops'

export function useRooftopData() {
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
    // Fetch manually (rather than Papa's download mode) so we can read the
    // X-Last-Sync response header — the true "data synced X ago" time from the
    // Metabase → Supabase sync, not just when this browser fetched.
    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const lastSync = res.headers.get('X-Last-Sync')
        const text = await res.text()
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
        setRows(transformRows(parsed.data))
        setLastSynced(lastSync ? new Date(lastSync) : new Date())
        setLoading(false)
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load data')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    load(false)
  }, [load])

  return { rows, loading, error, lastSynced, refresh: () => load(true) }
}
