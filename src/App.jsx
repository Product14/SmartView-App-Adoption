import { useState } from 'react'
import Header from './components/Header'
import Tabs, { TABS } from './components/Tabs'
import Overview from './tabs/Overview'
import EnterpriseView from './tabs/EnterpriseView'
import RooftopView from './tabs/RooftopView'
import { useSheetData } from './data/useSheetData'

function initialTab() {
  const t = new URLSearchParams(window.location.search).get('tab')
  return TABS.includes(t) ? t : 'Overview'
}

export default function App() {
  const { rows, loading, error, lastSynced, refresh } = useSheetData()
  const [tab, setTab] = useState(initialTab)

  // Keep the URL in sync so tab views are shareable (no router / reload needed).
  function changeTab(next) {
    setTab(next)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', next)
    window.history.replaceState({}, '', url)
  }

  return (
    <div className="min-h-full">
      <Header
        recordCount={rows.length}
        lastSynced={lastSynced}
        loading={loading}
        onRefresh={refresh}
      />

      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <Tabs active={tab} onChange={changeTab} />

        <div className="mt-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Failed to load data: {error}.{' '}
              <button onClick={refresh} className="font-semibold underline">
                Retry
              </button>
            </div>
          )}

          {!error && loading && rows.length === 0 && (
            <div className="flex items-center justify-center py-24 text-slate-400">
              <span className="mr-2 animate-spin">↻</span> Loading data…
            </div>
          )}

          {!error && rows.length > 0 && (
            <>
              {tab === 'Overview' && <Overview rows={rows} />}
              {tab === 'Enterprise View' && <EnterpriseView rows={rows} />}
              {tab === 'Rooftop View' && <RooftopView rows={rows} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
