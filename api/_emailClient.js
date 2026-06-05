// ─── Internal Email API Client ────────────────────────────────────────────────
// Calls the internal REST email API (same one VIN Tracker uses).
//
// Required env vars:
//   INTERNAL_EMAIL_API_URL   – e.g. https://abc.cyx.in/send-template-email
//   EMAIL_TO                 – primary recipient(s), comma-separated
//   EMAIL_CC                 – comma-separated CC addresses (optional)
//   EMAIL_BCC                – comma-separated BCC addresses (optional)
//   FROM                     – sender address (optional)

function splitAddresses(envVal) {
  return (envVal || '').split(',').map((s) => s.trim()).filter(Boolean)
}

// "5 Jun 2026, 1 PM IST" — used in the subject line.
function subjectStamp() {
  const now = new Date()
  const date = now.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const time = now
    .toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: true })
    .toUpperCase()
    .replace(/\s+/g, ' ')
  return `${date}, ${time} IST`
}

/**
 * Sends the SmartView adoption snapshot email via the internal email API.
 * @param {string} html  Full HTML string built by _emailTemplate.js
 */
export async function sendReport(html) {
  const url = process.env.INTERNAL_EMAIL_API_URL
  if (!url) throw new Error('INTERNAL_EMAIL_API_URL env var is not set')

  const to = splitAddresses(process.env.EMAIL_TO)
  if (to.length === 0) throw new Error('EMAIL_TO env var is not set')

  const cc = splitAddresses(process.env.EMAIL_CC)
  const bcc = splitAddresses(process.env.EMAIL_BCC)
  const from = process.env.FROM

  const payload = {
    to,
    ...(cc.length > 0 && { cc }),
    ...(bcc.length > 0 && { bcc }),
    ...(from && { from }),
    subject: `Studio Adoption Report - ${subjectStamp()}`,
    // Generic HTML-passthrough template on the internal email service — it just
    // injects templateData.HTMLdata into the email body.
    template: 'email-control-tower-report',
    templateData: { HTMLdata: html },
  }

  console.log(`[email] sending to=${to} cc=${cc.join(',') || '—'} subject="${payload.subject}"`)

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Email API responded HTTP ${res.status}: ${body}`)
  }

  const responseBody = await res.json().catch(() => ({}))
  console.log('[email] sent successfully — api response:', JSON.stringify(responseBody))
  return responseBody
}
