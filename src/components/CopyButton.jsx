import { useState } from 'react'

// Small clipboard icon that copies `value` to the clipboard on click.
export default function CopyButton({ value, title = 'Copy ID' }) {
  const [copied, setCopied] = useState(false)

  function handleClick(e) {
    e.stopPropagation()
    if (!value) return
    const text = String(value)
    const done = () => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(done)
    } else {
      done()
    }
  }

  return (
    <button
      onClick={handleClick}
      title={copied ? 'Copied!' : title}
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
    >
      {copied ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5 text-emerald-600">
          <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}
