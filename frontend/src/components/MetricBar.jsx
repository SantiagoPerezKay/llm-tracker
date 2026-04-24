export default function MetricBar({ label, value, max = 100, color = 'indigo', inverted = false }) {
  const pct = value !== null && value !== undefined ? Math.min((value / max) * 100, 100) : 0
  const display = value !== null && value !== undefined ? `${value.toFixed(0)}${max === 100 ? '%' : ''}` : '—'

  const BAR = {
    emerald: 'bg-emerald-500',
    blue:    'bg-blue-500',
    red:     'bg-red-400',
    amber:   'bg-amber-400',
    indigo:  'bg-indigo-500',
    purple:  'bg-purple-500',
  }

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        <span className={`font-semibold ${inverted && value > 15 ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}`}>
          {display}
        </span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${inverted ? 'bg-red-400' : (BAR[color] ?? BAR.indigo)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
