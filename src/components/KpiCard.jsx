const ACCENTS = {
  indigo: 'text-indigo-600',
  blue: 'text-sky-500',
  green: 'text-emerald-600',
  red: 'text-red-500',
  amber: 'text-amber-500',
  violet: 'text-violet-600',
}

export default function KpiCard({ label, value, sub, accent = 'indigo' }) {
  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:w-72">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <span className={`text-4xl font-bold tracking-tight ${ACCENTS[accent] || ACCENTS.indigo}`}>
          {value}
        </span>
        {sub && <span className="whitespace-nowrap text-sm text-slate-400">{sub}</span>}
      </div>
    </div>
  )
}
