// Generic filter row: a search box, dropdown selects, and a clear button.
// selects: [{ label, value, onChange, options: [{ value, label }] }]
// extra:   optional node (e.g. a display toggle) rendered after the selects
export default function FilterBar({ search, selects = [], onClear, showClear, extra }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {search && (
        <input
          type="text"
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          placeholder={search.placeholder || 'Search…'}
          className="min-w-[240px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      )}
      {selects.map((sel) => (
        <select
          key={sel.label}
          value={sel.value}
          onChange={(e) => sel.onChange(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">{sel.label}</option>
          {sel.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
      {extra}
      {showClear && (
        <button
          onClick={onClear}
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
