// Display order for the derived rooftop-type buckets.
export const TYPE_ORDER = [
  'Franchise Group',
  'Franchise Individual',
  'Independent Group',
  'Independent Individual',
  'Others',
]

export function groupBy(rows, keyFn) {
  const m = new Map()
  for (const r of rows) {
    const k = keyFn(r)
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(r)
  }
  return m
}

// Shared rollup used by By Type / By CSM / By Month.
function rollup(key, rows) {
  const enterprises = new Set()
  let app = 0
  let sv = 0
  let svl = 0
  let sc = 0
  let active = 0
  let arr = 0
  for (const r of rows) {
    enterprises.add(r.enterpriseId)
    if (r.app) app++
    if (r.smartview) sv++
    if (r.smartviewVlp) svl++
    if (r.smartCampaign) sc++
    if (r.active) active++
    arr += r.arr
  }
  return {
    key,
    rooftops: rows.length,
    enterprises: enterprises.size,
    app,
    sv,
    svl,
    sc,
    active,
    arr,
    // App adoption is measured against active rooftops; the rest stay vs total.
    appPct: active ? app / active : 0,
    svPct: rows.length ? sv / rows.length : 0,
    svlPct: rows.length ? svl / rows.length : 0,
    scPct: rows.length ? sc / rows.length : 0,
  }
}

export function computeKpis(rows) {
  let app = 0
  let sv = 0
  let svl = 0
  let sc = 0
  let active = 0
  let arr = 0
  for (const r of rows) {
    if (r.app) app++
    if (r.smartview) sv++
    if (r.smartviewVlp) svl++
    if (r.smartCampaign) sc++
    if (r.active) active++
    arr += r.arr
  }
  return { total: rows.length, app, sv, svl, sc, active, arr }
}

export function byRooftopType(rows) {
  const out = [...groupBy(rows, (r) => r.rooftopType).entries()].map(([k, rs]) => rollup(k, rs))
  out.sort((a, b) => TYPE_ORDER.indexOf(a.key) - TYPE_ORDER.indexOf(b.key))
  return out
}

// Display order for the customer-segment buckets.
export const SEGMENT_ORDER = ['Ent', 'SMB', 'Resellers', 'Unspecified']

export function byCustomerSegment(rows) {
  const out = [...groupBy(rows, (r) => r.customerSegment).entries()].map(([k, rs]) => rollup(k, rs))
  out.sort((a, b) => {
    const ai = SEGMENT_ORDER.indexOf(a.key)
    const bi = SEGMENT_ORDER.indexOf(b.key)
    return (ai === -1 ? SEGMENT_ORDER.length : ai) - (bi === -1 ? SEGMENT_ORDER.length : bi)
  })
  return out
}

export function byCSM(rows) {
  const out = [...groupBy(rows, (r) => r.csm).entries()].map(([k, rs]) => rollup(k, rs))
  out.sort((a, b) => b.rooftops - a.rooftops)
  return out
}

const pad2 = (n) => String(n).padStart(2, '0')

// Key for the Monday (UTC) that starts the week containing the given YYYY-MM-DD.
function weekKey(ymd) {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const day = dt.getUTCDay() // 0=Sun … 6=Sat
  dt.setUTCDate(dt.getUTCDate() + (day === 0 ? -6 : 1 - day))
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`
}

// Group go-lives by 'month' or 'week' on the UTC calendar date; newest period first.
export function byPeriod(rows, period) {
  const keyFn = period === 'week' ? (r) => weekKey(r.liveYMD) : (r) => r.liveYMD.slice(0, 7)
  const out = [...groupBy(rows.filter((r) => r.liveYMD), keyFn).entries()].map(([k, rs]) =>
    rollup(k, rs),
  )
  out.sort((a, b) => b.key.localeCompare(a.key))
  return out
}

export function byEnterprise(rows) {
  return [...groupBy(rows, (r) => r.enterpriseId).entries()].map(([id, rs]) => {
    let app = 0
    let sv = 0
    let svl = 0
    let sc = 0
    let active = 0
    let live = 0
    let onboarding = 0
    let arr = 0
    const csmCount = {}
    const obCount = {}
    const typeCount = {}
    const segmentCount = {}
    for (const r of rs) {
      if (r.app) app++
      if (r.smartview) sv++
      if (r.smartviewVlp) svl++
      if (r.smartCampaign) sc++
      if (r.active) active++
      const stage = r.stage.toLowerCase()
      if (stage === 'live') live++
      else if (stage === 'onboarding') onboarding++
      arr += r.arr
      csmCount[r.csm] = (csmCount[r.csm] || 0) + 1
      obCount[r.obPoc] = (obCount[r.obPoc] || 0) + 1
      const tt = r.teamType || 'NA'
      typeCount[tt] = (typeCount[tt] || 0) + 1
      const seg = r.customerSegment || 'Unspecified'
      segmentCount[seg] = (segmentCount[seg] || 0) + 1
    }
    const csm = Object.entries(csmCount).sort((a, b) => b[1] - a[1])[0][0]
    // OB POC is per-rooftop; surface the most common one for the enterprise.
    const obPoc = Object.entries(obCount).sort((a, b) => b[1] - a[1])[0][0]
    // An enterprise's team_type is normally uniform; if mixed, take the most common.
    const teamType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0][0]
    // Same for customer_segment — uniform per enterprise; take the most common if mixed.
    const customerSegment = Object.entries(segmentCount).sort((a, b) => b[1] - a[1])[0][0]
    return {
      enterpriseId: id,
      enterpriseName: rs[0].enterpriseName,
      teamType,
      customerSegment,
      rooftops: rs.length,
      live,
      onboarding,
      app,
      sv,
      svl,
      sc,
      active,
      // App adoption is measured against active rooftops; the rest stay vs total.
      appPct: active ? app / active : 0,
      svPct: rs.length ? sv / rs.length : 0,
      svlPct: rs.length ? svl / rs.length : 0,
      scPct: rs.length ? sc / rs.length : 0,
      csm,
      obPoc,
      arr,
    }
  })
}
