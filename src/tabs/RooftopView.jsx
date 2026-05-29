import { useMemo, useState } from 'react'
import DataTable from '../components/DataTable'
import FilterBar from '../components/FilterBar'
import Pill from '../components/Pill'
import CopyButton from '../components/CopyButton'
import { fmtMoney, ymdLabel } from '../utils/format'

const SUBTYPE_COLOR = {
  FRANCHISE_DEALER: 'indigo',
  INDEPENDENT_DEALER: 'blue',
  NA: 'slate',
}

const typeOf = (r) => r.subType || 'NA'

function stageColor(stage) {
  const s = stage.toLowerCase()
  if (s === 'live') return 'green'
  if (s === 'onboarding') return 'amber'
  return 'slate'
}

function distinct(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

export default function RooftopView({ rows }) {
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('')
  const [type, setType] = useState('')
  const [csm, setCsm] = useState('')
  const [obPoc, setObPoc] = useState('')
  const [sv, setSv] = useState('')
  const [app, setApp] = useState('')

  const stageOptions = useMemo(() => distinct(rows.map((r) => r.stage)).map((v) => ({ value: v, label: v })), [rows])
  const typeOptions = useMemo(() => distinct(rows.map(typeOf)).map((v) => ({ value: v, label: v })), [rows])
  const csmOptions = useMemo(() => distinct(rows.map((r) => r.csm)).map((v) => ({ value: v, label: v })), [rows])
  const obOptions = useMemo(() => distinct(rows.map((r) => r.obPoc)).map((v) => ({ value: v, label: v })), [rows])
  const yesNo = [
    { value: 'Yes', label: 'Yes' },
    { value: 'No', label: 'No' },
  ]

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (stage && r.stage !== stage) return false
      if (type && typeOf(r) !== type) return false
      if (csm && r.csm !== csm) return false
      if (obPoc && r.obPoc !== obPoc) return false
      if (sv && (sv === 'Yes') !== r.smartview) return false
      if (app && (app === 'Yes') !== r.app) return false
      if (
        q &&
        !r.teamName.toLowerCase().includes(q) &&
        !r.enterpriseName.toLowerCase().includes(q) &&
        !r.teamId.toLowerCase().includes(q) &&
        !r.enterpriseId.toLowerCase().includes(q)
      )
        return false
      return true
    })
  }, [rows, search, stage, type, csm, obPoc, sv, app])

  const columns = [
    {
      key: 'enterpriseName',
      label: 'Enterprise',
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="text-slate-700">{r.enterpriseName}</span>
          <CopyButton value={r.enterpriseId} title="Copy enterprise ID" />
        </span>
      ),
      csvValue: (r) => r.enterpriseName,
    },
    {
      key: 'teamName',
      label: 'Rooftop',
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="font-semibold text-slate-800">{r.teamName}</span>
          <CopyButton value={r.teamId} title="Copy rooftop (team) ID" />
        </span>
      ),
      csvValue: (r) => r.teamName,
    },
    { key: 'teamId', label: 'Team ID', hidden: true, csvValue: (r) => r.teamId },
    { key: 'enterpriseId', label: 'Enterprise ID', hidden: true, csvValue: (r) => r.enterpriseId },
    { key: 'stage', label: 'Stage', render: (r) => <Pill color={stageColor(r.stage)}>{r.stage}</Pill> },
    { key: 'subType', label: 'Type', sortValue: typeOf, render: (r) => <Pill color={SUBTYPE_COLOR[typeOf(r)]}>{typeOf(r)}</Pill>, csvValue: typeOf },
    { key: 'csm', label: 'CSM', render: (r) => <span className="text-slate-600">{r.csm}</span> },
    { key: 'obPoc', label: 'OB POC', render: (r) => <span className="text-slate-600">{r.obPoc}</span> },
    { key: 'smartview', label: 'SmartView VDP', align: 'center', sortValue: (r) => (r.smartview ? 1 : 0), render: (r) => <Pill color={r.smartview ? 'green' : 'slate'}>{r.smartview ? 'Yes' : 'No'}</Pill>, csvValue: (r) => (r.smartview ? 'Yes' : 'No') },
    { key: 'app', label: 'App Adoption', align: 'center', sortValue: (r) => (r.app ? 1 : 0), render: (r) => <Pill color={r.app ? 'green' : 'slate'}>{r.app ? 'Yes' : 'No'}</Pill>, csvValue: (r) => (r.app ? 'Yes' : 'No') },
    { key: 'arr', label: 'Contracted ARR', align: 'right', sortValue: (r) => r.arr, render: (r) => <span className="font-semibold text-slate-900">{fmtMoney(r.arr)}</span>, csvValue: (r) => Math.round(r.arr) },
    { key: 'liveDate', label: 'Live Date', sortValue: (r) => r.liveYMD || '', render: (r) => <span className="text-slate-600">{ymdLabel(r.liveYMD)}</span>, csvValue: (r) => r.liveYMD || '' },
  ]

  const hasFilters = search || stage || type || csm || obPoc || sv || app

  return (
    <div className="space-y-4">
      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Search rooftop or enterprise…' }}
        selects={[
          { label: 'All Stages', value: stage, onChange: setStage, options: stageOptions },
          { label: 'All Types', value: type, onChange: setType, options: typeOptions },
          { label: 'All CSMs', value: csm, onChange: setCsm, options: csmOptions },
          { label: 'All OB POCs', value: obPoc, onChange: setObPoc, options: obOptions },
          { label: 'SmartView: All', value: sv, onChange: setSv, options: yesNo },
          { label: 'App: All', value: app, onChange: setApp, options: yesNo },
        ]}
        showClear={hasFilters}
        onClear={() => {
          setSearch('')
          setStage('')
          setType('')
          setCsm('')
          setObPoc('')
          setSv('')
          setApp('')
        }}
      />
      <DataTable
        columns={columns}
        rows={filtered}
        defaultSort={{ key: 'arr', dir: 'desc' }}
        pageSize={50}
        maxHeight="500px"
        showRank
        unit="rooftops"
        headerBg="bg-slate-200"
        headerText="text-slate-800"
        csvFilename="rooftop-view.csv"
        rowKey={(r) => r.teamId}
      />
    </div>
  )
}
