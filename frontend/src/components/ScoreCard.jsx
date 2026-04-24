const COLORS = {
  emerald: { bg: 'from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/20', border: 'border-emerald-100 dark:border-emerald-800/50', label: 'text-emerald-600 dark:text-emerald-400', value: 'text-emerald-700 dark:text-emerald-300', sub: 'text-emerald-500 dark:text-emerald-400' },
  blue:    { bg: 'from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-800/20',             border: 'border-blue-100 dark:border-blue-800/50',    label: 'text-blue-600 dark:text-blue-400',       value: 'text-blue-700 dark:text-blue-300',       sub: 'text-blue-500 dark:text-blue-400'    },
  purple:  { bg: 'from-purple-50 to-purple-100/50 dark:from-purple-900/30 dark:to-purple-800/20',     border: 'border-purple-100 dark:border-purple-800/50', label: 'text-purple-600 dark:text-purple-400',   value: 'text-purple-700 dark:text-purple-300',   sub: 'text-purple-500 dark:text-purple-400'  },
  amber:   { bg: 'from-amber-50 to-amber-100/50 dark:from-amber-900/30 dark:to-amber-800/20',         border: 'border-amber-100 dark:border-amber-800/50',  label: 'text-amber-600 dark:text-amber-400',     value: 'text-amber-700 dark:text-amber-300',     sub: 'text-amber-500 dark:text-amber-400'   },
  red:     { bg: 'from-red-50 to-red-100/50 dark:from-red-900/30 dark:to-red-800/20',                 border: 'border-red-100 dark:border-red-800/50',      label: 'text-red-600 dark:text-red-400',         value: 'text-red-700 dark:text-red-300',         sub: 'text-red-500 dark:text-red-400'      },
}

export default function ScoreCard({ title, value, unit = '', sub, color = 'blue' }) {
  const c = COLORS[color] ?? COLORS.blue
  const display = value !== null && value !== undefined
    ? (typeof value === 'number' ? value.toFixed(0) : value)
    : '—'

  return (
    <div className={`bg-gradient-to-br ${c.bg} rounded-2xl p-4 sm:p-5 border ${c.border}`}>
      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${c.label}`}>{title}</div>
      <div className={`text-2xl sm:text-3xl font-bold ${c.value}`}>
        {display}
        {value !== null && value !== undefined && unit && (
          <span className="text-base sm:text-lg font-semibold">{unit}</span>
        )}
      </div>
      {sub && <div className={`text-xs mt-1 ${c.sub}`}>{sub}</div>}
    </div>
  )
}
