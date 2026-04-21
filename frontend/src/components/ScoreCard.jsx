const COLORS = {
  emerald: { bg: 'from-emerald-50 to-emerald-100/50', border: 'border-emerald-100', label: 'text-emerald-600', value: 'text-emerald-700', sub: 'text-emerald-500' },
  blue:    { bg: 'from-blue-50 to-blue-100/50',       border: 'border-blue-100',    label: 'text-blue-600',    value: 'text-blue-700',    sub: 'text-blue-500'    },
  purple:  { bg: 'from-purple-50 to-purple-100/50',   border: 'border-purple-100',  label: 'text-purple-600',  value: 'text-purple-700',  sub: 'text-purple-500'  },
  amber:   { bg: 'from-amber-50 to-amber-100/50',     border: 'border-amber-100',   label: 'text-amber-600',   value: 'text-amber-700',   sub: 'text-amber-500'   },
  red:     { bg: 'from-red-50 to-red-100/50',         border: 'border-red-100',     label: 'text-red-600',     value: 'text-red-700',     sub: 'text-red-500'     },
}

export default function ScoreCard({ title, value, unit = '', sub, color = 'indigo' }) {
  const c = COLORS[color] ?? COLORS.blue
  const display = value !== null && value !== undefined
    ? (typeof value === 'number' ? value.toFixed(0) : value)
    : '—'

  return (
    <div className={`bg-gradient-to-br ${c.bg} rounded-2xl p-5 border ${c.border}`}>
      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${c.label}`}>{title}</div>
      <div className={`text-3xl font-bold ${c.value}`}>
        {display}
        {value !== null && value !== undefined && unit && (
          <span className="text-lg font-semibold">{unit}</span>
        )}
      </div>
      {sub && <div className={`text-xs mt-1 ${c.sub}`}>{sub}</div>}
    </div>
  )
}
