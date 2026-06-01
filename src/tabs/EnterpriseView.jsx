import { useMemo, useState } from 'react'
import DataTable from '../components/DataTable'
import FilterBar from '../components/FilterBar'
import Pill from '../components/Pill'
import CopyButton from '../components/CopyButton'
import { byEnterprise } from '../data/aggregations'
import { fmtInt, fmtMoney, pctOf } from '../utils/format'

const TYPE_COLOR = {
  GROUP_DEALER: 'indigo',
  INDIVIDUAL_DEALER: 'blue',
  PARTNER: 'amber',
  MARKETPLACE: 'green',
}

function distinct(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}

export default function EnterpriseView({ rows }) {
  const enterprises = useMemo(() => byEnterprise(rows), [rows])

  const [search, setSearch] = useState('')
  const [teamType, setTeamType] = useState('')
  const [csm, setCsm] = useState('')
  const [segment, setSegment] = useState('')

  const typeOptions = useMemo(
    () => distinct(enterprises.map((e) => e.teamType)).map((v) => ({ value: v, label: v })),
    [enterprises],
  )
  const csmOptions = useMemo(
    () => distinct(enterprises.map((e) => e.csm)).map((v) => ({ value: v, label: v })),
    [enterprises],
  )
  const segmentOptions = useMemo(
    () => distinct(enterprises.map((e) => e.customerSegment)).map((v) => ({ value: v, label: v })),
    [enterprises],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return enterprises.filter((e) => {
      if (teamType && e.teamType !== teamType) return false
      if (csm && e.csm !== csm) return false
      if (segment && e.customerSegment !== segment) return false
      if (q && !e.enterpriseName.toLowerCase().includes(q) && !e.enterpriseId.toLowerCase().includes(q))
        return false
      return true
    })
  }, [enterprises, search, teamType, csm, segment])

  const columns = [
    {
      key: 'enterpriseName',
      label: 'Enterprise Name',
      render: (e) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="font-semibold text-slate-800">{e.enterpriseName}</span>
          <CopyButton value={e.enterpriseId} title="Copy enterprise ID" />
        </span>
      ),
      csvValue: (e) => e.enterpriseName,
    },
    { key: 'enterpriseId', label: 'Enterprise ID', hidden: true, csvValue: (e) => e.enterpriseId },
    { key: 'teamType', label: 'Account Type', render: (e) => <Pill color={TYPE_COLOR[e.teamType]}>{e.teamType}</Pill> },
    { key: 'customerSegment', label: 'Customer Segment', render: (e) => <span className="text-slate-600">{e.customerSegment}</span>, csvValue: (e) => e.customerSegment },
    { key: 'rooftops', label: '# Rooftops', align: 'right', render: (e) => <span className="font-semibold text-indigo-600">{fmtInt(e.rooftops)}</span> },
    { key: 'live', label: '# Live', align: 'right', render: (e) => <span className="font-semibold text-emerald-600">{fmtInt(e.live)}</span> },
    { key: 'onboarding', label: '# Onboarding', align: 'right', render: (e) => <span className="font-semibold text-amber-600">{fmtInt(e.onboarding)}</span> },
    { key: 'svPct', label: 'SmartView VDP %', align: 'right', sortValue: (e) => e.svPct, render: (e) => <span className="font-semibold text-emerald-600">{pctOf(e.svPct)}</span>, csvValue: (e) => pctOf(e.svPct) },
    { key: 'appPct', label: 'App %', align: 'right', sortValue: (e) => e.appPct, render: (e) => <span className="font-semibold text-sky-600">{pctOf(e.appPct)}</span>, csvValue: (e) => pctOf(e.appPct) },
    { key: 'csm', label: 'CSM', render: (e) => <span className="text-slate-600">{e.csm}</span> },
    { key: 'arr', label: 'Total ARR', align: 'right', sortValue: (e) => e.arr, render: (e) => <span className="font-semibold text-slate-900">{fmtMoney(e.arr)}</span>, csvValue: (e) => Math.round(e.arr) },
  ]

  const hasFilters = search || teamType || csm || segment

  return (
    <div className="space-y-4">
      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Search enterprise name or ID…' }}
        selects={[
          { label: 'All Account Types', value: teamType, onChange: setTeamType, options: typeOptions },
          { label: 'All Segments', value: segment, onChange: setSegment, options: segmentOptions },
          { label: 'All CSMs', value: csm, onChange: setCsm, options: csmOptions },
        ]}
        showClear={hasFilters}
        onClear={() => {
          setSearch('')
          setTeamType('')
          setCsm('')
          setSegment('')
        }}
      />
      <DataTable
        columns={columns}
        rows={filtered}
        defaultSort={{ key: 'rooftops', dir: 'desc' }}
        pageSize={50}
        maxHeight="500px"
        showRank
        unit="enterprises"
        headerBg="bg-slate-200"
        headerText="text-slate-800"
        csvFilename="enterprise-view.csv"
        rowKey={(e) => e.enterpriseId}
      />
    </div>
  )
}
