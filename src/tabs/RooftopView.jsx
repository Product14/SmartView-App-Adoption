import { useMemo, useState } from 'react'
import DataTable from '../components/DataTable'
import FilterBar from '../components/FilterBar'
import Pill from '../components/Pill'
import CopyButton from '../components/CopyButton'
import LinkButton from '../components/LinkButton'
import ToggleButton from '../components/ToggleButton'
import { fmtMoney, noUnderscore, shortEmail, ymdLabel } from '../utils/format'
import { consoleUrl } from '../utils/links'

// team_sub_type values, plus team_type values used as a fallback when sub_type is blank.
const SUBTYPE_COLOR = {
  FRANCHISE_DEALER: 'indigo',
  INDEPENDENT_DEALER: 'blue',
  GROUP_DEALER: 'indigo',
  INDIVIDUAL_DEALER: 'blue',
  PARTNER: 'amber',
  MARKETPLACE: 'green',
  NA: 'slate',
}

// Distinct palette so segment pills don't visually collide with the Stage/Type columns.
const SEGMENT_COLOR = {
  Ent: 'violet',
  Mid: 'amber',
  SMB: 'cyan',
  Resellers: 'teal',
}

// Prefer team_sub_type; fall back to team_type (account type) when sub_type is blank.
const typeOf = (r) => r.subType || r.teamType || 'NA'

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
  const [segment, setSegment] = useState('')
  const [app, setApp] = useState('')
  const [sv, setSv] = useState('')
  const [svl, setSvl] = useState('')
  const [sc, setSc] = useState('')
  // Display preference, not a filter — the link columns are off by default so
  // the table keeps its current width, and "Clear filters" doesn't reset it.
  const [showLinks, setShowLinks] = useState(false)

  const stageOptions = useMemo(() => distinct(rows.map((r) => r.stage)).map((v) => ({ value: v, label: v })), [rows])
  const typeOptions = useMemo(() => distinct(rows.map(typeOf)).map((v) => ({ value: v, label: noUnderscore(v) })), [rows])
  const segmentOptions = useMemo(() => distinct(rows.map((r) => r.customerSegment)).map((v) => ({ value: v, label: v })), [rows])
  const csmOptions = useMemo(() => distinct(rows.map((r) => r.csm)).map((v) => ({ value: v, label: shortEmail(v) })), [rows])
  const obOptions = useMemo(() => distinct(rows.map((r) => r.obPoc)).map((v) => ({ value: v, label: shortEmail(v) })), [rows])
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
      if (segment && r.customerSegment !== segment) return false
      if (app && (app === 'Yes') !== r.app) return false
      if (sv && (sv === 'Yes') !== r.smartview) return false
      if (svl && (svl === 'Yes') !== r.smartviewVlp) return false
      if (sc && (sc === 'Yes') !== r.smartCampaign) return false
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
  }, [rows, search, stage, type, csm, obPoc, segment, sv, app, sc, svl])

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
          <LinkButton
            href={consoleUrl(r.teamId, r.enterpriseId)}
            title="Open this rooftop in Console"
            icon="console"
          />
        </span>
      ),
      csvValue: (r) => r.teamName,
    },
    { key: 'teamId', label: 'Team ID', hidden: true, csvValue: (r) => r.teamId },
    { key: 'enterpriseId', label: 'Enterprise ID', hidden: true, csvValue: (r) => r.enterpriseId },
    { key: 'stage', label: 'Stage', render: (r) => <Pill color={stageColor(r.stage)}>{r.stage}</Pill> },
    { key: 'subType', label: 'Type', sortValue: typeOf, render: (r) => <Pill color={SUBTYPE_COLOR[typeOf(r)]}>{noUnderscore(typeOf(r))}</Pill>, csvValue: typeOf },
    { key: 'customerSegment', label: 'Customer Segment', render: (r) => <Pill color={SEGMENT_COLOR[r.customerSegment]}>{r.customerSegment}</Pill>, csvValue: (r) => r.customerSegment },
    { key: 'csm', label: 'CSM', sortValue: (r) => r.csm, render: (r) => <span className="text-slate-600">{shortEmail(r.csm)}</span>, csvValue: (r) => r.csm },
    { key: 'obPoc', label: 'OB POC', sortValue: (r) => r.obPoc, render: (r) => <span className="text-slate-600">{shortEmail(r.obPoc)}</span>, csvValue: (r) => r.obPoc },
    { key: 'app', label: 'App Adoption', align: 'center', sortValue: (r) => (r.app ? 1 : 0), render: (r) => <Pill color={r.app ? 'green' : 'slate'}>{r.app ? 'Yes' : 'No'}</Pill>, csvValue: (r) => (r.app ? 'Yes' : 'No') },
    { key: 'smartview', label: 'SmartView VDP', align: 'center', sortValue: (r) => (r.smartview ? 1 : 0), render: (r) => <Pill color={r.smartview ? 'green' : 'slate'}>{r.smartview ? 'Yes' : 'No'}</Pill>, csvValue: (r) => (r.smartview ? 'Yes' : 'No') },
    { key: 'smartviewVlp', label: 'SmartView VLP', align: 'center', sortValue: (r) => (r.smartviewVlp ? 1 : 0), render: (r) => <Pill color={r.smartviewVlp ? 'green' : 'slate'}>{r.smartviewVlp ? 'Yes' : 'No'}</Pill>, csvValue: (r) => (r.smartviewVlp ? 'Yes' : 'No') },
    { key: 'smartCampaign', label: 'Smart Campaign', align: 'center', sortValue: (r) => (r.smartCampaign ? 1 : 0), render: (r) => <Pill color={r.smartCampaign ? 'green' : 'slate'}>{r.smartCampaign ? 'Yes' : 'No'}</Pill>, csvValue: (r) => (r.smartCampaign ? 'Yes' : 'No') },
    // Grouped under one "Website Link" banner; toggled by the FilterBar button.
    // Always exported to CSV — DataTable's export uses the full column list.
    { key: 'vdpUrl', label: 'VDP', group: 'Website Link', align: 'center', sortable: false, hidden: !showLinks, render: (r) => <LinkButton href={r.vdpUrl} title="Open VDP" />, csvValue: (r) => r.vdpUrl },
    { key: 'vlpUrl', label: 'VLP', group: 'Website Link', align: 'center', sortable: false, hidden: !showLinks, render: (r) => <LinkButton href={r.vlpUrl} title="Open VLP" />, csvValue: (r) => r.vlpUrl },
    { key: 'websiteUrl', label: 'Website', group: 'Website Link', align: 'center', sortable: false, hidden: !showLinks, render: (r) => <LinkButton href={r.websiteUrl} title="Open website" />, csvValue: (r) => r.websiteUrl },
    { key: 'arr', label: 'Contracted ARR', align: 'right', sortValue: (r) => r.arr, render: (r) => <span className="font-semibold text-slate-900">{fmtMoney(r.arr)}</span>, csvValue: (r) => Math.round(r.arr) },
    { key: 'liveDate', label: 'Live Date', sortValue: (r) => r.liveYMD || '', render: (r) => <span className="text-slate-600">{ymdLabel(r.liveYMD)}</span>, csvValue: (r) => r.liveYMD || '' },
  ]

  const hasFilters = search || stage || type || csm || obPoc || segment || sv || app || sc || svl

  return (
    <div className="space-y-4">
      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Search rooftop or enterprise…' }}
        selects={[
          { label: 'All Stages', value: stage, onChange: setStage, options: stageOptions },
          { label: 'All Types', value: type, onChange: setType, options: typeOptions },
          { label: 'All CSMs', value: csm, onChange: setCsm, options: csmOptions },
          { label: 'All OB POCs', value: obPoc, onChange: setObPoc, options: obOptions },
          { label: 'All Segments', value: segment, onChange: setSegment, options: segmentOptions },
          { label: 'App: All', value: app, onChange: setApp, options: yesNo },
          { label: 'SmartView VDP: All', value: sv, onChange: setSv, options: yesNo },
          { label: 'SmartView VLP: All', value: svl, onChange: setSvl, options: yesNo },
          { label: 'Smart Campaign: All', value: sc, onChange: setSc, options: yesNo },
        ]}
        extra={
          <ToggleButton
            active={showLinks}
            onClick={() => setShowLinks((v) => !v)}
            title="Show VDP / VLP / website links"
          >
            🔗 Website links
          </ToggleButton>
        }
        showClear={hasFilters}
        onClear={() => {
          setSearch('')
          setStage('')
          setType('')
          setCsm('')
          setObPoc('')
          setSegment('')
          setApp('')
          setSv('')
          setSvl('')
          setSc('')
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
