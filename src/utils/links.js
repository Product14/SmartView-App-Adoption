// URL helpers for the dealer website links and the Spyne Console deep-link.

const CONSOLE_BASE = 'https://console.spyne.ai/home'

// The source columns (vdp_url / vlp_url / website_url) are hand-maintained and
// arrive in mixed shapes: some full ("https://www.foo.com/used"), some bare
// ("www.foo.com"), some wrapped in stray quotes. Return a value safe to use as
// an href, or '' when there's nothing usable.
export function normalizeUrl(raw) {
  let s = (raw ?? '').toString().trim()
  // Strip stray wrapping quotes that survive the CSV round-trip.
  s = s.replace(/^["']+/, '').replace(/["']+$/, '').trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  // Anything else (bare domain) gets https — no dealer site here is http-only.
  return `https://${s}`
}

// Deep-link into the Spyne Console for a rooftop. The console expects the team
// id wrapped in square brackets; encodeURIComponent turns those into %5B / %5D.
export function consoleUrl(teamId, enterpriseId) {
  const team = (teamId ?? '').toString().trim()
  if (!team) return ''
  const params = new URLSearchParams({ team_id: `[${team}]` })
  const ent = (enterpriseId ?? '').toString().trim()
  if (ent) params.set('enterprise_id', ent)
  return `${CONSOLE_BASE}?${params.toString()}`
}
