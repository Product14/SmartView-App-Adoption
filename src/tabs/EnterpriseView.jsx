import { useMemo, useState } from 'react'
import DataTable from '../components/DataTable'
import FilterBar from '../components/FilterBar'
import Pill from '../components/Pill'
import CopyButton from '../components/CopyButton'
import LinkButton from '../components/LinkButton'
import ToggleButton from '../components/ToggleButton'
import { byEnterprise } from '../data/aggregations'
import { fmtInt, fmtMoney, noUnderscore, pctOf, shortEmail } from '../utils/format'
import { consoleUrl } from '../utils/links'

const TYPE_COLOR = {
  GROUP_DEALER: 'indigo',
  INDIVIDUAL_DEALER: 'blue',
  PARTNER: 'amber',
  MARKETPLACE: 'green',
}

// Distinct palette so segment pills don't visually collide with the Account Type column.
const SEGMENT_COLOR = {
  Ent: 'violet',
  Mid: 'amber',
  SMB: 'cyan',
  Resellers: 'teal',
}

function distinct(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}

export default function EnterpriseView({ rows }) {
  const enterprises = useMemo(() => byEnterprise(rows), [rows])

  const [search, setSearch] = useState('')
  const [teamType, setTeamType] = useState('')
  const [csm, setCsm] = useState('')
  const [obPoc, setObPoc] = useState('')
  const [segment, setSegment] = useState('')
  const [app, setApp] = useState('')
  const [sv, setSv] = useState('')
  const [svl, setSvl] = useState('')
  const [sc, setSc] = useState('')
  // Display preference, not a filter — off by default, untouched by "Clear filters".
  const [showLinks, setShowLinks] = useState(false)

  // Enterprise metrics are percentages; "Yes" = any adoption (>0%), "No" = none (0%).
  const yesNo = [
    { value: 'Yes', label: 'Yes' },
    { value: 'No', label: 'No' },
  ]
  const matchPct = (filter, ratio) => !filter || (filter === 'Yes') === (ratio > 0)

  const typeOptions = useMemo(
    () => distinct(enterprises.map((e) => e.teamType)).map((v) => ({ value: v, label: noUnderscore(v) })),
    [enterprises],
  )
  const csmOptions = useMemo(
    () => distinct(enterprises.map((e) => e.csm)).map((v) => ({ value: v, label: shortEmail(v) })),
    [enterprises],
  )
  const obOptions = useMemo(
    () => distinct(enterprises.map((e) => e.obPoc)).map((v) => ({ value: v, label: shortEmail(v) })),
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
      if (obPoc && e.obPoc !== obPoc) return false
      if (segment && e.customerSegment !== segment) return false
      // App filter means "has any app adoption"; test the raw count so it stays
      // correct now that appPct is measured against active rooftops (can be 0).
      if (!matchPct(app, e.app)) return false
      if (!matchPct(sv, e.svPct)) return false
      if (!matchPct(svl, e.svlPct)) return false
      if (!matchPct(sc, e.scPct)) return false
      if (q && !e.enterpriseName.toLowerCase().includes(q) && !e.enterpriseId.toLowerCase().includes(q))
        return false
      return true
    })
  }, [enterprises, search, teamType, csm, obPoc, segment, sv, app, sc, svl])

  const columns = [
    {
      key: 'enterpriseName',
      label: 'Enterprise Name',
      render: (e) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="font-semibold text-slate-800">{e.enterpriseName}</span>
          <CopyButton value={e.enterpriseId} title="Copy enterprise ID" />
          <LinkButton
            href={consoleUrl(e.teamId, e.enterpriseId)}
            title="Open in Console (first rooftop)"
            icon="console"
          />
        </span>
      ),
      csvValue: (e) => e.enterpriseName,
    },
    { key: 'enterpriseId', label: 'Enterprise ID', hidden: true, csvValue: (e) => e.enterpriseId },
    { key: 'teamType', label: 'Account Type', render: (e) => <Pill color={TYPE_COLOR[e.teamType]}>{noUnderscore(e.teamType)}</Pill>, csvValue: (e) => e.teamType },
    { key: 'customerSegment', label: 'Customer Segment', render: (e) => <Pill color={SEGMENT_COLOR[e.customerSegment]}>{e.customerSegment}</Pill>, csvValue: (e) => e.customerSegment },
    { key: 'rooftops', label: '# Rooftops', align: 'right', render: (e) => <span className="font-semibold text-indigo-600">{fmtInt(e.rooftops)}</span> },
    { key: 'live', label: '# Live', align: 'right', render: (e) => <span className="font-semibold text-emerald-600">{fmtInt(e.live)}</span> },
    { key: 'onboarding', label: '# Onboarding', align: 'right', render: (e) => <span className="font-semibold text-amber-600">{fmtInt(e.onboarding)}</span> },
    { key: 'appPct', label: 'App', align: 'right', sortValue: (e) => e.appPct, render: (e) => <span className="font-semibold text-sky-600">{fmtInt(e.app)} ({pctOf(e.appPct)})</span>, csvValue: (e) => `${fmtInt(e.app)} (${pctOf(e.appPct)})` },
    { key: 'svPct', label: 'SmartView VDP', align: 'right', sortValue: (e) => e.svPct, render: (e) => <span className="font-semibold text-emerald-600">{fmtInt(e.sv)} ({pctOf(e.svPct)})</span>, csvValue: (e) => `${fmtInt(e.sv)} (${pctOf(e.svPct)})` },
    { key: 'svlPct', label: 'SmartView VLP', align: 'right', sortValue: (e) => e.svlPct, render: (e) => <span className="font-semibold text-amber-600">{fmtInt(e.svl)} ({pctOf(e.svlPct)})</span>, csvValue: (e) => `${fmtInt(e.svl)} (${pctOf(e.svlPct)})` },
    { key: 'scPct', label: 'Smart Campaign', align: 'right', sortValue: (e) => e.scPct, render: (e) => <span className="font-semibold text-violet-600">{fmtInt(e.sc)} ({pctOf(e.scPct)})</span>, csvValue: (e) => `${fmtInt(e.sc)} (${pctOf(e.scPct)})` },
    // First non-empty URL across the enterprise's rooftops. Grouped under one
    // "Website Link" banner and toggled by the FilterBar button; always in the CSV.
    { key: 'vdpUrl', label: 'VDP', group: 'Website Link', align: 'center', sortable: false, hidden: !showLinks, render: (e) => <LinkButton href={e.vdpUrl} title="Open VDP" />, csvValue: (e) => e.vdpUrl },
    { key: 'vlpUrl', label: 'VLP', group: 'Website Link', align: 'center', sortable: false, hidden: !showLinks, render: (e) => <LinkButton href={e.vlpUrl} title="Open VLP" />, csvValue: (e) => e.vlpUrl },
    { key: 'websiteUrl', label: 'Website', group: 'Website Link', align: 'center', sortable: false, hidden: !showLinks, render: (e) => <LinkButton href={e.websiteUrl} title="Open website" />, csvValue: (e) => e.websiteUrl },
    { key: 'csm', label: 'CSM', sortValue: (e) => e.csm, render: (e) => <span className="text-slate-600">{shortEmail(e.csm)}</span>, csvValue: (e) => e.csm },
    { key: 'obPoc', label: 'OB POC', sortValue: (e) => e.obPoc, render: (e) => <span className="text-slate-600">{shortEmail(e.obPoc)}</span>, csvValue: (e) => e.obPoc },
    { key: 'arr', label: 'Total ARR', align: 'right', sortValue: (e) => e.arr, render: (e) => <span className="font-semibold text-slate-900">{fmtMoney(e.arr)}</span>, csvValue: (e) => Math.round(e.arr) },
  ]

  const hasFilters = search || teamType || csm || obPoc || segment || sv || app || sc || svl

  return (
    <div className="space-y-4">
      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Search enterprise name or ID…' }}
        selects={[
          { label: 'All Account Types', value: teamType, onChange: setTeamType, options: typeOptions },
          { label: 'All Segments', value: segment, onChange: setSegment, options: segmentOptions },
          { label: 'All CSMs', value: csm, onChange: setCsm, options: csmOptions },
          { label: 'All OB POCs', value: obPoc, onChange: setObPoc, options: obOptions },
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
          setTeamType('')
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
