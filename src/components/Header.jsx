import { fmtInt, relativeTime } from '../utils/format'

export default function Header({ recordCount, lastSynced, loading, onRefresh }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">SmartView &amp; App Adoption</h1>
        <p className="mt-1 text-sm text-slate-500">
          SmartView (VDP) &amp; Studio App adoption across rooftops, enterprises and CSMs
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          <span>
            {fmtInt(recordCount)} records
            {lastSynced && <> · synced {relativeTime(lastSynced)}</>}
          </span>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          <span className={loading ? 'animate-spin' : ''}>↻</span>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </div>
  )
}
