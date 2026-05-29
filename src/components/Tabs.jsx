const TABS = ['Overview', 'Enterprise View', 'Rooftop View']

export default function Tabs({ active, onChange }) {
  return (
    <div className="inline-flex gap-1 rounded-2xl bg-slate-200 p-1">
      {TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`rounded-xl px-4 py-2 text-base font-semibold transition ${
            active === tab
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

export { TABS }
