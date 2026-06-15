// ─── Studio Health Report — Executive Board (on-screen 2×3 grid) ──────────────
// A browser-viewable, single-glance executive layout of the same Studio Health
// Report data. NOT an email — it uses a real <style> block + CSS grid so the six
// segments tile cleanly on screen, but it borrows the EXACT design system of the
// email template (api/_studioHealthTemplate.js): light page, eyebrow + pill header,
// colored section bars, the MTD..M-2 metric matrix (bold MTD, lavender month
// columns), the lifecycle funnel table, and the italic commentary callouts.
//
// Layout:
//   Row 1 (HERO, no cards, divided off from the rest):
//     Col 1 — Funnel — Contracted → Live  (heading + bare table, no byline, no card)
//     Col 2 — Plan                        (heading + 3 KPI cards, no card)
//   ── divider ──
//   Rows 2–3 (carded panels):
//     Images · Video   |   360 · Adoption
//
// The numbers are live: the handler re-fetches the three sheet tabs on each
// request. The "Refresh" button forces a no-cache re-fetch; an hourly Vercel cron
// keeps the edge cache warm. All figures come straight from buildStudioHealthPayload.

import { fmtInt, pct, fmtMoneyCompact } from '../src/utils/format.js'

// ─── Design tokens (identical to the email template) ──────────────────────────
const PAGE_BG = '#f4f4f5'
const CARD_BG = '#ffffff'
const BORDER = '#e5e7eb'
const ROW_BORDER = '#f1f1f4'
const TEXT_DARK = '#111827'
const TEXT_BODY = '#374151'
const TEXT_MUTED = '#6b7280'
const EYEBROW = '#0ea5e9'
const PILL_BG = '#1c1c1e'
const LAVENDER = '#f5f3ff'
const CALLOUT_BG = '#ededf1'

const SEC = {
  funnel: '#2563eb',
  plan: '#0ea5e9',
  images: '#16a34a',
  three60: '#d97706',
  video: '#db2777',
  adoption: '#4f46e5',
}

// Lifecycle-stage dot colors for the funnel (substring match → label variants resolve).
const STAGE_DOT = {
  contracted: '#0ea5e9',
  pws: '#7c3aed',
  onboarding: '#d97706',
  live: '#16a34a',
  churned: '#dc2626',
}
function stageDot(stage) {
  const s = (stage || '').toLowerCase()
  for (const key of Object.keys(STAGE_DOT)) if (s.includes(key)) return STAGE_DOT[key]
  return '#9ca3af'
}

// Plan-tier accent colors — reuse the exact email KPI label colors.
const PLAN_TIER = [
  { key: 'lite', label: 'Studio-Lite', color: '#0284c7' },
  { key: 'pro', label: 'Studio-Pro', color: '#16a34a' },
  { key: 'others', label: 'Studio-Others', color: '#64748b' },
]

// Metric matrix columns: MTD bold; `sep` draws a left divider; `lav` washes the month cells.
const COLS = [
  { k: 'mtd', label: 'MTD', cls: 'c-mtd' },
  { k: 'ent', label: 'ENT', cls: 'c-sep' },
  { k: 'mid', label: 'MID' },
  { k: 'smb', label: 'SMB' },
  { k: 'd1', label: 'D-1', cls: 'c-sep' },
  { k: 'd2', label: 'D-2' },
  { k: 'd3', label: 'D-3' },
  { k: 'm1', label: 'M-1', cls: 'c-sep c-lav' },
  { k: 'm2', label: 'M-2', cls: 'c-lav' },
]

// ─── Small helpers ────────────────────────────────────────────────────────────
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
// Escape, then turn **x** into upright bold (used inside italic commentary bullets).
function mdBoldToHtml(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

// Section heading: colored bar + title + optional byline. `lg` enlarges it slightly
// for the hero row so Row 1 reads as the summary tier.
function sectionHead(title, subtitle, color, lg) {
  return `
    <header class="sec-head${lg ? ' sec-head-lg' : ''}">
      <span class="sec-bar" style="background:${color};"></span>
      <div>
        <div class="sec-title">${title}</div>
        ${subtitle ? `<div class="sec-sub">${subtitle}</div>` : ''}
      </div>
    </header>`
}

// A carded panel (used for rows 2–3): heading + body inside a white card.
function panel(title, subtitle, color, body) {
  return `
    <section class="panel">
      ${sectionHead(title, subtitle, color)}
      <div class="panel-body">${body}</div>
    </section>`
}

// ─── Funnel table (Col 1 · Row 1) ─────────────────────────────────────────────
function funnelTable(rows) {
  const body = rows
    .map(
      (r) => `
        <tr>
          <td class="lead"><span class="dot" style="background:${stageDot(r.stage)};"></span>${r.stage}</td>
          <td class="num">${fmtInt(r.accounts)}</td>
          <td class="num">${fmtInt(r.rooftops)}</td>
          <td class="num">${fmtInt(r.active)}</td>
          <td class="num strong">${fmtMoneyCompact(r.arr)}</td>
        </tr>`,
    )
    .join('')
  return `
    <table class="grid-table funnel">
      <thead>
        <tr>
          <th class="l">Stage</th><th class="r">Accounts</th><th class="r">Rooftops</th>
          <th class="r">Active Rooftops</th><th class="r">ARR</th>
        </tr>
      </thead>
      <tbody>${body || `<tr><td colspan="5" class="empty">No data</td></tr>`}</tbody>
    </table>`
}

// ─── Plan KPI cards (Col 2 · Row 1) ───────────────────────────────────────────
// The same three KPI cards as the daily email: colored tier label, big count with
// an ARR aside, and "% of Live Rooftops" sub.
function kpiCard(label, value, sub, color, aside) {
  return `
    <div class="kpi">
      <div class="kpi-label" style="color:${color};">${label}</div>
      <div class="kpi-value">${value}${aside ? `<span class="kpi-aside">${aside}</span>` : ''}</div>
      ${sub ? `<div class="kpi-sub">${sub}</div>` : ''}
    </div>`
}

function planKpis(plan) {
  return PLAN_TIER.map((t) =>
    kpiCard(
      t.label,
      fmtInt(plan[t.key]),
      `${pct(plan[t.key], plan.total)} of Live Rooftops`,
      t.color,
      `${fmtMoneyCompact(plan[`${t.key}Arr`])} ARR`,
    ),
  ).join('')
}

// ─── Commentary callout ───────────────────────────────────────────────────────
function calloutBox(points, color) {
  if (!points || !points.length) return ''
  const items = points.map((p) => `<li>${mdBoldToHtml(p)}</li>`).join('')
  return `<div class="callout" style="border-left-color:${color};"><ul>${items}</ul></div>`
}

// ─── Metric matrix (Images / 360 / Video / Adoption) ──────────────────────────
function metricTable(rows) {
  const headers = `<tr>
    <th class="l">Metric</th>
    ${COLS.map((c) => `<th class="r ${c.cls || ''}">${c.label}</th>`).join('')}
  </tr>`
  const body = rows
    .map((r) => {
      const cells = COLS.map((c) => `<td class="r ${c.cls || ''}">${r.cols[c.k]}</td>`).join('')
      return `<tr>
        <td class="metric"><span class="m-label">${r.label}</span>${r.sub ? `<span class="m-sub">${r.sub}</span>` : ''}</td>
        ${cells}
      </tr>`
    })
    .join('')
  return `
    <table class="grid-table matrix">
      <thead>${headers}</thead>
      <tbody>${body || `<tr><td colspan="10" class="empty">No data</td></tr>`}</tbody>
    </table>`
}

function metricPanel(title, subtitle, color, rows, commentary) {
  return panel(title, subtitle, color, `${calloutBox(commentary, color)}${metricTable(rows)}`)
}

// ─── Main builder ─────────────────────────────────────────────────────────────
/**
 * @param {object} data  Same payload as buildStudioHealthHtml:
 *   { funnel, planCounts, images, three60, video, adoption, commentary }
 * @returns {string} full HTML page
 */
export function buildStudioHealthBoardHtml({
  funnel,
  planCounts,
  images,
  three60,
  video,
  adoption,
  commentary = {},
}) {
  const now = new Date()
  const dateLabel = now.toLocaleDateString('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const stamp = now.toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  const dashboardUrl = (process.env.STUDIO_HEALTH_DASHBOARD_URL || 'https://analytics.spyne.ai/satudio').replace(/\/$/, '')

  // Row 1 — hero: bare heading + table | bare heading + 3 KPI cards (no panel cards).
  const heroHtml = `
    <div class="hero-col">
      ${sectionHead('Funnel — Contracted → Live', '', SEC.funnel, true)}
      <div class="hero-body">${funnelTable(funnel)}</div>
    </div>
    <div class="hero-col">
      ${sectionHead('Plan', `${fmtInt(planCounts.total)} Live rooftops`, SEC.plan, true)}
      <div class="hero-body"><div class="kpi-row">${planKpis(planCounts)}</div></div>
    </div>`

  // Rows 2–3 — carded panels (Col 1: Images, Video · Col 2: 360, Adoption).
  const boardHtml = `
    ${metricPanel('Images', 'Delivery health across segments & trend', SEC.images, images, commentary.images)}
    ${metricPanel('360', 'Delivery health across segments & trend', SEC.three60, three60, commentary.three60)}
    ${metricPanel('Video', 'Delivery health across segments & trend', SEC.video, video, commentary.video)}
    ${metricPanel('Adoption', 'Adoption % across segments & trend', SEC.adoption, adoption, commentary.adoption)}`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Studio Health Report — ${dateLabel}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0; background: ${PAGE_BG}; color: ${TEXT_DARK};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .wrap { max-width: 1480px; margin: 0 auto; padding: 28px 28px 48px; }

    /* Header */
    .topline { border-top: 2px solid ${TEXT_DARK}; padding-top: 16px; display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; }
    .eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: ${EYEBROW}; }
    h1 { font-size: 32px; font-weight: 800; line-height: 1.15; margin: 10px 0 0; }
    .date { font-size: 15px; color: ${TEXT_MUTED}; margin-top: 6px; }
    .head-right { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
    .pill { background: ${PILL_BG}; color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; padding: 6px 14px; border-radius: 999px; }
    .refresh-btn { display: inline-flex; align-items: center; gap: 8px; background: ${CARD_BG}; color: ${TEXT_DARK}; border: 1px solid ${BORDER}; border-radius: 8px; padding: 9px 16px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 1px 2px rgba(17,24,39,0.05); transition: background .15s, border-color .15s; }
    .refresh-btn:hover { background: #fafafa; border-color: #d1d5db; }
    .refresh-btn:disabled { cursor: default; opacity: .7; }
    .rf-icon { font-size: 15px; line-height: 1; display: inline-block; }
    .refresh-btn.spin .rf-icon { animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .stamp { font-size: 12px; color: ${TEXT_MUTED}; }

    /* Section heading (shared by hero + panels) */
    .sec-head { display: flex; gap: 13px; align-items: flex-start; margin-bottom: 14px; }
    .sec-bar { flex: 0 0 4px; align-self: stretch; min-height: 38px; border-radius: 2px; }
    .sec-title { font-size: 19px; font-weight: 800; line-height: 1.2; }
    .sec-sub { font-size: 13px; color: ${TEXT_MUTED}; margin-top: 3px; }
    .sec-head-lg .sec-bar { min-height: 44px; flex-basis: 5px; }
    .sec-head-lg .sec-title { font-size: 22px; }
    .sec-head-lg .sec-sub { font-size: 14px; font-weight: 600; color: ${TEXT_BODY}; }

    /* Row 1 — HERO: no cards, sits on the page bg, divided from the rest */
    .hero { display: grid; grid-template-columns: 1.04fr 0.96fr; gap: 26px; margin-top: 22px; align-items: stretch; }
    .hero-col { display: flex; flex-direction: column; }
    .hero-body { flex: 1 1 auto; display: flex; }
    .hero-body > .grid-table { align-self: flex-start; }

    /* The divider that strongly separates Row 1 from rows 2–3 */
    .row-divider { position: relative; height: 0; border: 0; border-top: 1.5px solid #d6d6dd; margin: 30px 0 26px; }
    .row-divider::after { content: ''; position: absolute; left: 0; top: -1.5px; width: 64px; border-top: 3px solid ${TEXT_DARK}; }

    /* Rows 2–3 grid of carded panels */
    .board { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: stretch; }
    @media (max-width: 1080px) { .hero, .board { grid-template-columns: 1fr; } }

    .panel { background: ${CARD_BG}; border: 1px solid ${BORDER}; border-radius: 14px; padding: 20px 22px 22px; display: flex; flex-direction: column; box-shadow: 0 1px 2px rgba(17,24,39,0.04); }
    .panel-body { flex: 1 1 auto; }

    /* KPI cards (Plan) */
    .kpi-row { display: flex; gap: 14px; width: 100%; align-items: stretch; }
    .kpi { flex: 1 1 0; background: ${CARD_BG}; border: 1px solid ${BORDER}; border-radius: 12px; padding: 18px 20px; display: flex; flex-direction: column; justify-content: center; box-shadow: 0 1px 2px rgba(17,24,39,0.04); }
    .kpi-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
    .kpi-value { font-size: 32px; font-weight: 800; color: ${TEXT_DARK}; line-height: 1.1; margin-top: 10px; }
    .kpi-aside { font-size: 14px; font-weight: 700; color: ${TEXT_MUTED}; margin-left: 8px; }
    .kpi-sub { font-size: 13px; color: ${TEXT_MUTED}; margin-top: 7px; }

    /* Shared table */
    .grid-table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid ${BORDER}; border-radius: 12px; overflow: hidden; background: ${CARD_BG}; }
    .grid-table th { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: ${TEXT_MUTED}; padding: 11px 10px; white-space: nowrap; border-bottom: 1px solid ${BORDER}; background: ${CARD_BG}; }
    .grid-table td { padding: 12px 10px; font-size: 13px; border-bottom: 1px solid ${ROW_BORDER}; white-space: nowrap; color: ${TEXT_BODY}; }
    .grid-table tbody tr:last-child td { border-bottom: 0; }
    .grid-table tbody tr:nth-child(even) td { background: #fafafa; }
    .grid-table th.l, .grid-table td.l, .grid-table td.lead, .grid-table td.metric { text-align: left; }
    .grid-table th.r, .grid-table td.num, .grid-table td.r { text-align: right; }
    .grid-table td.strong, .grid-table td.num.strong { font-weight: 700; color: ${TEXT_DARK}; }

    /* Funnel table — compact so Row 1 stays light and the KPI cards match its height */
    .funnel th, .funnel td { padding: 11px 16px; font-size: 14px; }
    .funnel td.lead { font-weight: 700; color: ${TEXT_DARK}; }
    .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 9px; vertical-align: middle; }

    /* Metric matrix specifics */
    .matrix td.metric .m-label { display: block; font-size: 13px; font-weight: 700; color: ${TEXT_DARK}; }
    .matrix td.metric .m-sub { display: block; font-size: 11px; color: ${TEXT_MUTED}; margin-top: 1px; }
    .matrix td.c-mtd, .matrix th.c-mtd { font-weight: 700; color: ${TEXT_DARK}; }
    .matrix .c-sep { border-left: 1px solid ${BORDER}; }
    .matrix .c-lav { background: ${LAVENDER}; }
    .matrix tbody tr:nth-child(even) td.c-lav { background: #efeafe; }

    /* Commentary callout */
    .callout { background: ${CALLOUT_BG}; border-left: 4px solid ${TEXT_MUTED}; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; }
    .callout ul { margin: 0; padding: 0; list-style: none; }
    .callout li { position: relative; padding-left: 16px; font-size: 13.5px; font-style: italic; color: ${TEXT_BODY}; line-height: 1.5; margin-bottom: 7px; }
    .callout li:last-child { margin-bottom: 0; }
    .callout li::before { content: '•'; position: absolute; left: 2px; color: ${TEXT_BODY}; font-style: normal; }
    .callout strong { font-style: normal; font-weight: 700; color: ${TEXT_DARK}; }

    .empty { text-align: center; color: ${TEXT_MUTED}; padding: 16px; }

    /* Footer */
    .foot { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 26px; flex-wrap: wrap; }
    .foot-note { font-size: 12.5px; color: ${TEXT_MUTED}; }
    .cta { display: inline-block; background: ${PILL_BG}; color: #fff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 11px 28px; border-radius: 8px; letter-spacing: 0.02em; }
  </style>
</head>
<body>
  <div class="wrap">

    <div class="topline">
      <div>
        <div class="eyebrow">Studio · Daily</div>
        <h1>Studio Health Report</h1>
        <div class="date">${dateLabel}</div>
      </div>
      <div class="head-right">
        <span class="pill">STUDIO</span>
        <button id="refresh" class="refresh-btn" type="button" data-label="Refresh" title="Re-fetch live numbers from the source sheet">
          <span class="rf-icon">&#8635;</span><span class="rf-text">Refresh</span>
        </button>
        <span id="stamp" class="stamp">Updated ${stamp} IST</span>
      </div>
    </div>

    <!-- Row 1 (hero) -->
    <div id="hero" class="hero">${heroHtml}</div>

    <hr class="row-divider" />

    <!-- Rows 2–3 (panels) -->
    <div id="board" class="board">${boardHtml}</div>

    <div class="foot">
      <span class="foot-note">Live from the source sheet (Rooftop · Studio Health · Adoption tabs) · auto-refreshes hourly</span>
      ${dashboardUrl ? `<a class="cta" href="${dashboardUrl}" target="_blank" rel="noopener noreferrer">View Dashboard</a>` : ''}
    </div>

  </div>

  <script>
    (function () {
      var btn = document.getElementById('refresh');
      if (!btn) return;
      var txt = btn.querySelector('.rf-text');
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        btn.disabled = true;
        btn.classList.add('spin');
        if (txt) txt.textContent = 'Refreshing…';
        var url = location.pathname + '?refresh=1&t=' + Date.now();
        fetch(url, { cache: 'no-store' })
          .then(function (r) { return r.text(); })
          .then(function (html) {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            ['hero', 'board'].forEach(function (id) {
              var src = doc.getElementById(id), dst = document.getElementById(id);
              if (src && dst) dst.innerHTML = src.innerHTML;
            });
            var s = doc.getElementById('stamp'), sd = document.getElementById('stamp');
            if (s && sd) sd.textContent = s.textContent;
          })
          .catch(function (e) { console.error('refresh failed', e); })
          .finally(function () {
            btn.disabled = false;
            btn.classList.remove('spin');
            if (txt) txt.textContent = btn.getAttribute('data-label') || 'Refresh';
          });
      });
    })();
  </script>
</body>
</html>`
}
