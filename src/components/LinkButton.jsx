// Small external-link icon that opens `href` in a new tab. Sized and styled to
// sit flush next to CopyButton. Renders a muted dash when there's no URL —
// most rooftops have no VDP/VLP link, so an empty cell would read as broken.

const ICONS = {
  external: (
    <>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 3h6v6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 14 21 3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // Arrow leaving a doorway — reads as "jump to another product".
  console: (
    <>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 12H3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
}

export default function LinkButton({ href, title = 'Open link', icon = 'external' }) {
  if (!href) return <span className="text-slate-300">—</span>

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
        {ICONS[icon] || ICONS.external}
      </svg>
    </a>
  )
}
