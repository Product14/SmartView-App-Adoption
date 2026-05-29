// Normalize raw CSV rows (one per rooftop) into typed objects with derived fields.

const norm = (v) => (v ?? '').toString().trim()
const isYes = (v) => norm(v).toLowerCase() === 'yes'

// Derived "Rooftop Type" — Franchise/Independent (team_sub_type) crossed with
// Group/Individual (team_type). Mirrors the source SQL CASE exactly: anything
// not matching the four dealer combinations (incl. blank type) falls to Others.
export function deriveRooftopType(teamType, subType) {
  const t = norm(teamType).toUpperCase()
  const s = norm(subType).toUpperCase()
  if (t === 'GROUP_DEALER' && s === 'INDEPENDENT_DEALER') return 'Independent Group'
  if (t === 'GROUP_DEALER' && s === 'FRANCHISE_DEALER') return 'Franchise Group'
  if (t === 'INDIVIDUAL_DEALER' && s === 'INDEPENDENT_DEALER') return 'Independent Individual'
  if (t === 'INDIVIDUAL_DEALER' && s === 'FRANCHISE_DEALER') return 'Franchise Individual'
  return 'Others'
}

export function transformRows(rawRows) {
  return rawRows
    .filter((r) => norm(r['lt.team_id']) !== '')
    .map((r) => {
      const teamType = norm(r.team_type)
      const subType = norm(r.team_sub_type)
      const liveRaw = norm(r.live_date)
      const parsed = liveRaw ? new Date(liveRaw) : null
      const liveDate = parsed && !isNaN(parsed.getTime()) ? parsed : null
      return {
        teamId: norm(r['lt.team_id']),
        enterpriseId: norm(r['lt.enterprise_id']),
        teamName: norm(r.team_name) || '—',
        enterpriseName: norm(r.enterprise_name) || '—',
        stage: norm(r.stage) || '—',
        csm: norm(r.cs_poc) || 'Unassigned',
        obPoc: norm(r.ob_poc) || '—',
        arr: parseFloat(norm(r.contracted_arr)) || 0,
        teamType,
        subType,
        rooftopType: deriveRooftopType(teamType, subType),
        // Support either the current header (Smartview_vdp_enabled) or a rename.
        smartview: isYes(r.Smartview_vdp_enabled ?? r.Smartview_vdp ?? r.smartview_vdp),
        app: isYes(r.app_adoption),
        liveDate,
        liveMonth: liveDate
          ? `${liveDate.getFullYear()}-${String(liveDate.getMonth() + 1).padStart(2, '0')}`
          : null,
      }
    })
}
