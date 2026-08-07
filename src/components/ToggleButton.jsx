// Pill-style on/off button for display preferences (not filters), sized to
// match the FilterBar selects so it sits on the same row.
export default function ToggleButton({ active, onClick, children, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition ${
        active
          ? 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  )
}
