import { useMemo, useState } from 'react'
import KpiCard from '../components/KpiCard'
import DataTable from '../components/DataTable'
import { byCSM, byCustomerSegment, byPeriod, byRooftopType, computeKpis } from '../data/aggregations'
import { fmtInt, monthLabel, pct, pctOf, shortEmail, toInputDate, weekLabel } from '../utils/format'

// Shared column set for the By Rooftop Type / By CSM rollup tables.
const groupColumns = (firstLabel) => [
  {
    key: 'key',
    label: firstLabel,
    render: (r) => <span className="font-semibold text-slate-800">{shortEmail(r.key)}</span>,
    totalRender: () => <span className="font-bold">Total</span>,
    csvValue: (r) => r.key,
  },
  {
    key: 'enterprises',
    label: '# Enterprises',
    align: 'right',
    render: (r) => <span className="text-slate-600">{fmtInt(r.enterprises)}</span>,
    totalRender: (t) => fmtInt(t.enterprises),
    csvValue: (r) => r.enterprises,
  },
  {
    key: 'rooftops',
    label: '# Rooftops',
    align: 'right',
    render: (r) => <span className="font-semibold text-indigo-600">{fmtInt(r.rooftops)}</span>,
    totalRender: (t) => fmtInt(t.rooftops),
    csvValue: (r) => r.rooftops,
  },
  {
    key: 'appPct',
    label: 'App',
    align: 'right',
    sortValue: (r) => r.appPct,
    render: (r) => <span className="font-semibold text-sky-600">{fmtInt(r.app)} ({pctOf(r.appPct)})</span>,
    totalRender: (t) => `${fmtInt(t.app)} (${pctOf(t.appPct)})`,
    csvValue: (r) => `${fmtInt(r.app)} (${pctOf(r.appPct)})`,
  },
  {
    key: 'svPct',
    label: 'SmartView - VDP',
    align: 'right',
    sortValue: (r) => r.svPct,
    render: (r) => <span className="font-semibold text-emerald-600">{fmtInt(r.sv)} ({pctOf(r.svPct)})</span>,
    totalRender: (t) => `${fmtInt(t.sv)} (${pctOf(t.svPct)})`,
    csvValue: (r) => `${fmtInt(r.sv)} (${pctOf(r.svPct)})`,
  },
  {
    key: 'svlPct',
    label: 'SmartView VLP',
    align: 'right',
    sortValue: (r) => r.svlPct,
    render: (r) => <span className="font-semibold text-amber-600">{fmtInt(r.svl)} ({pctOf(r.svlPct)})</span>,
    totalRender: (t) => `${fmtInt(t.svl)} (${pctOf(t.svlPct)})`,
    csvValue: (r) => `${fmtInt(r.svl)} (${pctOf(r.svlPct)})`,
  },
  {
    key: 'scPct',
    label: 'Smart Campaign',
    align: 'right',
    sortValue: (r) => r.scPct,
    render: (r) => <span className="font-semibold text-violet-600">{fmtInt(r.sc)} ({pctOf(r.scPct)})</span>,
    totalRender: (t) => `${fmtInt(t.sc)} (${pctOf(t.scPct)})`,
    csvValue: (r) => `${fmtInt(r.sc)} (${pctOf(r.scPct)})`,
  },
]

export default function Overview({ rows }) {
  const kpis = useMemo(() => computeKpis(rows), [rows])
  const typeRows = useMemo(() => byRooftopType(rows), [rows])
  const segmentRows = useMemo(() => byCustomerSegment(rows), [rows])
  const csmRows = useMemo(() => byCSM(rows), [rows])

  const totalEnterprises = useMemo(() => new Set(rows.map((r) => r.enterpriseId)).size, [rows])
  const totalRow = {
    rooftops: kpis.total,
    enterprises: totalEnterprises,
    app: kpis.app,
    sv: kpis.sv,
    svl: kpis.svl,
    sc: kpis.sc,
    appPct: kpis.active ? kpis.app / kpis.active : 0,
    svPct: kpis.total ? kpis.sv / kpis.total : 0,
    svlPct: kpis.total ? kpis.svl / kpis.total : 0,
    scPct: kpis.total ? kpis.sc / kpis.total : 0,
  }

  // Newly Onboarded date range (default: previous 3 months).
  const defaults = useMemo(() => {
    const now = new Date()
    return {
      from: toInputDate(new Date(now.getFullYear(), now.getMonth() - 3, 1)),
      to: toInputDate(now),
    }
  }, [])
  const [from, setFrom] = useState(defaults.from)
  const [to, setTo] = useState(defaults.to)
  const [period, setPeriod] = useState('month')

  const periodRows = useMemo(() => {
    // from/to and liveYMD are all YYYY-MM-DD, so string compare = UTC-date compare.
    const filtered = rows.filter(
      (r) => r.liveYMD && (!from || r.liveYMD >= from) && (!to || r.liveYMD <= to),
    )
    return byPeriod(filtered, period)
  }, [rows, from, to, period])

  const periodLabel = (key) => (period === 'week' ? weekLabel(key) : monthLabel(key))

  const periodColumns = [
    { key: 'key', label: period === 'week' ? 'Week' : 'Month', sortValue: (r) => r.key, render: (r) => <span className="font-semibold text-slate-800">{periodLabel(r.key)}</span>, csvValue: (r) => periodLabel(r.key) },
    { key: 'enterprises', label: '# Enterprises', align: 'right', render: (r) => <span className="text-slate-600">{fmtInt(r.enterprises)}</span>, csvValue: (r) => r.enterprises },
    { key: 'rooftops', label: '# Rooftops', align: 'right', render: (r) => <span className="font-semibold text-indigo-600">{fmtInt(r.rooftops)}</span>, csvValue: (r) => r.rooftops },
    { key: 'appPct', label: 'App', align: 'right', sortValue: (r) => r.appPct, render: (r) => <span className="font-semibold text-sky-600">{fmtInt(r.app)} ({pctOf(r.appPct)})</span>, csvValue: (r) => `${fmtInt(r.app)} (${pctOf(r.appPct)})` },
    { key: 'svPct', label: 'SmartView - VDP', align: 'right', sortValue: (r) => r.svPct, render: (r) => <span className="font-semibold text-emerald-600">{fmtInt(r.sv)} ({pctOf(r.svPct)})</span>, csvValue: (r) => `${fmtInt(r.sv)} (${pctOf(r.svPct)})` },
    { key: 'svlPct', label: 'SmartView VLP', align: 'right', sortValue: (r) => r.svlPct, render: (r) => <span className="font-semibold text-amber-600">{fmtInt(r.svl)} ({pctOf(r.svlPct)})</span>, csvValue: (r) => `${fmtInt(r.svl)} (${pctOf(r.svlPct)})` },
    { key: 'scPct', label: 'Smart Campaign', align: 'right', sortValue: (r) => r.scPct, render: (r) => <span className="font-semibold text-violet-600">{fmtInt(r.sc)} ({pctOf(r.scPct)})</span>, csvValue: (r) => `${fmtInt(r.sc)} (${pctOf(r.scPct)})` },
  ]

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <KpiCard label="Total Rooftops" value={fmtInt(kpis.total)} sub="Live & OB" accent="indigo" />
        <KpiCard
          label="Active Rooftops"
          value={fmtInt(kpis.active)}
          sub={`${pct(kpis.active, kpis.total)} of total`}
          accent="green"
        />
        <KpiCard
          label="App Adoption"
          value={fmtInt(kpis.app)}
          sub={`${pct(kpis.app, kpis.active)} of active`}
          accent="blue"
        />
        <KpiCard
          label="SmartView VDP Adoption"
          value={fmtInt(kpis.sv)}
          sub={`${pct(kpis.sv, kpis.total)} of total`}
          accent="green"
        />
        <KpiCard
          label="SmartView VLP Adoption"
          value={fmtInt(kpis.svl)}
          sub={`${pct(kpis.svl, kpis.total)} of total`}
          accent="amber"
        />
        <KpiCard
          label="Smart Campaign Adoption"
          value={fmtInt(kpis.sc)}
          sub={`${pct(kpis.sc, kpis.total)} of total`}
          accent="violet"
        />
      </div>

      {/* By Customer Segment */}
      <DataTable
        title="By Customer Segment"
        columns={groupColumns('Customer Segment')}
        rows={segmentRows}
        showRank
        pageSize={null}
        totalRow={totalRow}
        csvFilename="by-customer-segment.csv"
        rowKey={(r) => r.key}
      />

      {/* By Rooftop Type */}
      <DataTable
        title="By Rooftop Type"
        columns={groupColumns('Rooftop Type')}
        rows={typeRows}
        showRank
        pageSize={null}
        totalRow={totalRow}
        csvFilename="by-rooftop-type.csv"
        rowKey={(r) => r.key}
      />

      {/* By CSM (scrollable, sticky header + total) */}
      <DataTable
        title="By CSM"
        columns={groupColumns('CSM')}
        rows={csmRows}
        showRank
        defaultSort={{ key: 'rooftops', dir: 'desc' }}
        pageSize={null}
        maxHeight="460px"
        totalRow={totalRow}
        csvFilename="by-csm.csv"
        rowKey={(r) => r.key}
      />

      {/* Newly Onboarded Clients */}
      <DataTable
        title="Newly Onboarded Clients"
        columns={periodColumns}
        rows={periodRows}
        showRank
        pageSize={null}
        maxHeight="460px"
        csvFilename="newly-onboarded.csv"
        rowKey={(r) => r.key}
        emptyText="No rooftops went live in this range"
        headerExtra={
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 font-medium">
              {['Month', 'Week'].map((opt) => {
                const val = opt.toLowerCase()
                return (
                  <button
                    key={opt}
                    onClick={() => setPeriod(val)}
                    className={`rounded-md px-3 py-1 transition ${
                      period === val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
            <span>Live date</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-indigo-400 focus:outline-none"
            />
            <span>→</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>
        }
      />
    </div>
  )
}
