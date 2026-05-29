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
  let sv = 0
  let app = 0
  let arr = 0
  for (const r of rows) {
    enterprises.add(r.enterpriseId)
    if (r.smartview) sv++
    if (r.app) app++
    arr += r.arr
  }
  return {
    key,
    rooftops: rows.length,
    enterprises: enterprises.size,
    sv,
    app,
    arr,
    svPct: rows.length ? sv / rows.length : 0,
    appPct: rows.length ? app / rows.length : 0,
  }
}

export function computeKpis(rows) {
  let sv = 0
  let app = 0
  let arr = 0
  for (const r of rows) {
    if (r.smartview) sv++
    if (r.app) app++
    arr += r.arr
  }
  return { total: rows.length, sv, app, arr }
}

export function byRooftopType(rows) {
  const out = [...groupBy(rows, (r) => r.rooftopType).entries()].map(([k, rs]) => rollup(k, rs))
  out.sort((a, b) => TYPE_ORDER.indexOf(a.key) - TYPE_ORDER.indexOf(b.key))
  return out
}

export function byCSM(rows) {
  const out = [...groupBy(rows, (r) => r.csm).entries()].map(([k, rs]) => rollup(k, rs))
  out.sort((a, b) => b.rooftops - a.rooftops)
  return out
}

const pad2 = (n) => String(n).padStart(2, '0')
const monthKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`

// Key for the Monday that starts the date's week (YYYY-MM-DD, sortable).
function weekKey(d) {
  const day = d.getDay() // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff)
  return `${monday.getFullYear()}-${pad2(monday.getMonth() + 1)}-${pad2(monday.getDate())}`
}

// Group go-lives by 'month' or 'week'; newest period first.
export function byPeriod(rows, period) {
  const keyFn = period === 'week' ? (r) => weekKey(r.liveDate) : (r) => monthKey(r.liveDate)
  const out = [...groupBy(rows.filter((r) => r.liveDate), keyFn).entries()].map(([k, rs]) =>
    rollup(k, rs),
  )
  out.sort((a, b) => b.key.localeCompare(a.key))
  return out
}

export function byEnterprise(rows) {
  return [...groupBy(rows, (r) => r.enterpriseId).entries()].map(([id, rs]) => {
    let sv = 0
    let app = 0
    let live = 0
    let onboarding = 0
    let arr = 0
    const csmCount = {}
    const typeCount = {}
    for (const r of rs) {
      if (r.smartview) sv++
      if (r.app) app++
      const stage = r.stage.toLowerCase()
      if (stage === 'live') live++
      else if (stage === 'onboarding') onboarding++
      arr += r.arr
      csmCount[r.csm] = (csmCount[r.csm] || 0) + 1
      const tt = r.teamType || 'NA'
      typeCount[tt] = (typeCount[tt] || 0) + 1
    }
    const csm = Object.entries(csmCount).sort((a, b) => b[1] - a[1])[0][0]
    // An enterprise's team_type is normally uniform; if mixed, take the most common.
    const teamType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0][0]
    return {
      enterpriseId: id,
      enterpriseName: rs[0].enterpriseName,
      teamType,
      rooftops: rs.length,
      live,
      onboarding,
      sv,
      app,
      svPct: rs.length ? sv / rs.length : 0,
      appPct: rs.length ? app / rs.length : 0,
      csm,
      arr,
    }
  })
}
