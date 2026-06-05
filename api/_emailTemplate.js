// ─── Email HTML Template ──────────────────────────────────────────────────────
// Builds a self-contained, Gmail-safe (table-based, inline-CSS) HTML email that
// mirrors the dashboard's Overview tab — the 6 KPI cards plus the three rollup
// tables (By Customer Segment, By Rooftop Type, By CSM). The "Newly Onboarded
// Clients" section is intentionally excluded.
//
// Numbers are produced by the same format helpers the dashboard uses, so the
// email matches the UI exactly.

import { fmtInt, pct, pctOf, shortEmail } from '../src/utils/format.js'

const BRAND_COLOR = '#1a1a2e'
const ACCENT_COLOR = '#4f46e5'
const GRAY_BG = '#f8f9fa'
const BORDER_COLOR = '#e2e8f0'
const TEXT_MAIN = '#1e293b'
const TEXT_MUTED = '#64748b'

// Per-metric accent colors, matching the dashboard's Tailwind classes.
const C_ENTERPRISE = '#475569' // slate-600
const C_ROOFTOP = '#4f46e5' // indigo-600
const C_APP = '#0284c7' // sky-600
const C_SV = '#059669' // emerald-600
const C_SVL = '#d97706' // amber-600
const C_SC = '#7c3aed' // violet-600

// ─── Partials ───────────────────────────────────────────────────────────────

function kpiCard(label, value, sub, color, width = '33.33%') {
  return `
    <td style="width:${width}; padding:6px;" valign="top">
      <div style="background:#fff; border:1px solid ${BORDER_COLOR}; border-radius:8px; padding:12px 16px; border-top:3px solid ${color};">
        <div style="font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:${TEXT_MUTED}; line-height:1.3; min-height:30px; margin-bottom:4px;">${label}</div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="left" valign="bottom" style="font-size:26px; font-weight:700; color:${color}; line-height:1;">${value}</td>
            ${sub ? `<td align="right" valign="bottom" style="font-size:11px; color:${TEXT_MUTED}; line-height:1.2;">${sub}</td>` : ''}
          </tr>
        </table>
      </div>
    </td>`
}

function sectionTitle(title) {
  return `
    <tr>
      <td style="padding:18px 0 8px;">
        <div style="font-size:14px; font-weight:700; color:${TEXT_MAIN}; text-transform:uppercase; letter-spacing:0.06em; border-left:3px solid ${ACCENT_COLOR}; padding-left:10px;">${title}</div>
      </td>
    </tr>`
}

const thBase = `padding:9px 12px; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; color:${TEXT_MUTED}; white-space:nowrap; border-bottom:2px solid ${BORDER_COLOR};`

function th(label, align) {
  return `<th style="${thBase} text-align:${align};">${label}</th>`
}

function bodyCell(value, color, align, weight) {
  const c = color || TEXT_MAIN
  const fw = weight || (color ? 'font-weight:600;' : '')
  return `<td style="padding:9px 12px; font-size:13px; color:${c}; ${fw} text-align:${align}; border-bottom:1px solid ${BORDER_COLOR}; white-space:nowrap;">${value}</td>`
}

// One adoption-metric cell, e.g. "123 (45%)".
function metricCell(n, ratio, color) {
  return bodyCell(`${fmtInt(n)} (${pctOf(ratio)})`, color, 'right')
}

// A rollup table identical in shape to the dashboard's groupColumns tables:
// rank · label · # Enterprises · # Rooftops · App · SmartView - VDP · SmartView VLP · Smart Campaign,
// with a bold Total footer row.
function rollupTable(labelHeader, rows, totalRow, labelFn) {
  const fmtLabel = labelFn || ((k) => k)

  const headers = `<tr style="background:${GRAY_BG};">
    <th style="${thBase} text-align:center; width:32px;">#</th>
    ${th(labelHeader, 'left')}
    ${th('# Enterprises', 'right')}
    ${th('# Rooftops', 'right')}
    ${th('App', 'right')}
    ${th('SmartView - VDP', 'right')}
    ${th('SmartView VLP', 'right')}
    ${th('Smart Campaign', 'right')}
  </tr>`

  const body = rows
    .map((r, i) => {
      const bg = i % 2 === 0 ? '#fff' : '#f8fafc'
      return `<tr style="background:${bg};">
        ${bodyCell(i + 1, TEXT_MUTED, 'center')}
        ${bodyCell(fmtLabel(r.key), TEXT_MAIN, 'left', 'font-weight:600;')}
        ${bodyCell(fmtInt(r.enterprises), C_ENTERPRISE, 'right')}
        ${bodyCell(fmtInt(r.rooftops), C_ROOFTOP, 'right')}
        ${metricCell(r.app, r.appPct, C_APP)}
        ${metricCell(r.sv, r.svPct, C_SV)}
        ${metricCell(r.svl, r.svlPct, C_SVL)}
        ${metricCell(r.sc, r.scPct, C_SC)}
      </tr>`
    })
    .join('')

  const totalCellStyle = `padding:10px 12px; font-size:13px; font-weight:700; color:${TEXT_MAIN}; border-top:2px solid ${BORDER_COLOR}; white-space:nowrap;`
  const totalRowHtml = `<tr style="background:${GRAY_BG};">
    <td style="${totalCellStyle} text-align:center;"></td>
    <td style="${totalCellStyle} text-align:left;">Total</td>
    <td style="${totalCellStyle} text-align:right;">${fmtInt(totalRow.enterprises)}</td>
    <td style="${totalCellStyle} text-align:right;">${fmtInt(totalRow.rooftops)}</td>
    <td style="${totalCellStyle} text-align:right;">${fmtInt(totalRow.app)} (${pctOf(totalRow.appPct)})</td>
    <td style="${totalCellStyle} text-align:right;">${fmtInt(totalRow.sv)} (${pctOf(totalRow.svPct)})</td>
    <td style="${totalCellStyle} text-align:right;">${fmtInt(totalRow.svl)} (${pctOf(totalRow.svlPct)})</td>
    <td style="${totalCellStyle} text-align:right;">${fmtInt(totalRow.sc)} (${pctOf(totalRow.scPct)})</td>
  </tr>`

  const empty = `<tr><td colspan="8" style="padding:16px; text-align:center; color:${TEXT_MUTED}; font-size:13px;">No data</td></tr>`

  return `
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="border:1px solid ${BORDER_COLOR}; border-radius:8px; overflow:hidden; border-collapse:separate; border-spacing:0;">
        ${headers}
        ${body || empty}
        ${rows.length ? totalRowHtml : ''}
      </table>
    </td></tr>`
}

// ─── Main builder ─────────────────────────────────────────────────────────────

/**
 * @param {object} data
 * @param {object} data.kpis          - computeKpis() result
 * @param {object} data.totalRow      - totals row for the tables (matches Overview)
 * @param {Array}  data.segmentRows   - byCustomerSegment() result
 * @param {Array}  data.typeRows      - byRooftopType() result
 * @param {Array}  data.csmRows       - byCSM() result
 * @returns {string} full HTML email string
 */
export function buildEmailHtml({ kpis, totalRow, segmentRows, csmRows }) {
  const dateLabel = new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  // Row 1: Total · Live · Active rooftops (3 cards). Row 2: the 4 adoption KPIs.
  const kpiRow1 = `
    <tr>
      ${kpiCard('Total Rooftops', fmtInt(kpis.total), 'Live &amp; OB', '#4f46e5', '33.33%')}
      ${kpiCard('Live Rooftops', fmtInt(kpis.live), `${pct(kpis.live, kpis.total)} of total`, '#0d9488', '33.34%')}
      ${kpiCard('Active Rooftops', fmtInt(kpis.active), `${pct(kpis.active, kpis.total)} of total`, '#16a34a', '33.33%')}
    </tr>`

  const kpiRow2 = `
    <tr>
      ${kpiCard('App Adoption', fmtInt(kpis.app), `${pct(kpis.app, kpis.active)} of active`, '#2563eb', '25%')}
      ${kpiCard('SmartView VDP Adoption', fmtInt(kpis.sv), `${pct(kpis.sv, kpis.total)} of total`, '#16a34a', '25%')}
      ${kpiCard('SmartView VLP Adoption', fmtInt(kpis.svl), `${pct(kpis.svl, kpis.total)} of total`, '#d97706', '25%')}
      ${kpiCard('Smart Campaign Adoption', fmtInt(kpis.sc), `${pct(kpis.sc, kpis.total)} of total`, '#7c3aed', '25%')}
    </tr>`

  const dashboardUrl = (process.env.DASHBOARD_URL || '').replace(/\/$/, '')
  const ctaHtml = dashboardUrl
    ? `
    <tr>
      <td style="padding:28px 0 8px; text-align:center;">
        <a href="${dashboardUrl}"
           style="display:inline-block; background:${ACCENT_COLOR}; color:#fff; font-size:14px; font-weight:600;
                  text-decoration:none; padding:12px 32px; border-radius:6px; letter-spacing:0.02em;">
          View Full Dashboard →
        </a>
      </td>
    </tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Studio Adoption Report — ${dateLabel}</title>
</head>
<body style="margin:0; padding:0; background:${GRAY_BG}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${GRAY_BG}; padding:24px 0;">
    <tr>
      <td align="center">

        <table width="760" cellpadding="0" cellspacing="0" border="0"
               style="max-width:760px; width:100%; background:#fff; border-radius:10px; overflow:hidden;
                      box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:${BRAND_COLOR}; padding:24px 32px;">
              <div style="font-size:20px; font-weight:700; color:#fff; letter-spacing:0.02em;">
                Studio Adoption Report
              </div>
              <div style="font-size:13px; color:#94a3b8; margin-top:4px;">${dateLabel}</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:20px 32px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">

                <!-- KPI cards: Total + Active on one line, the 4 adoption KPIs below -->
                <tr><td style="padding-bottom:4px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">${kpiRow1}</table>
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">${kpiRow2}</table>
                </td></tr>

                ${sectionTitle('By Customer Segment')}
                ${rollupTable('Customer Segment', segmentRows, totalRow)}

                ${sectionTitle('By CSM')}
                ${rollupTable('CSM', csmRows, totalRow, shortEmail)}

                ${ctaHtml}

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:${GRAY_BG}; border-top:1px solid ${BORDER_COLOR}; padding:16px 32px; text-align:center;">
              <div style="font-size:11px; color:${TEXT_MUTED};">
                Automated daily report from the SmartView App Adoption dashboard.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
}
