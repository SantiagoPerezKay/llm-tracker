/**
 * Componente de selección de frecuencia de análisis recurrente.
 * Se embebe en el flujo de selección de preguntas (NewAnalysisPage / ReanalyzePage).
 */

const INTERVAL_OPTIONS = [
  { hours: 6,   label: 'Cada 6 horas' },
  { hours: 12,  label: 'Cada 12 horas' },
  { hours: 24,  label: 'Diariamente' },
  { hours: 72,  label: 'Cada 3 días' },
  { hours: 168, label: 'Semanalmente' },
  { hours: 336, label: 'Cada 2 semanas' },
  { hours: 720, label: 'Mensualmente' },
]

export { INTERVAL_OPTIONS }

export default function ScheduleSelector({ enabled, onToggle, intervalHours, onIntervalChange }) {
  return (
    <div className={`rounded-xl border transition-all ${
      enabled
        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50'
        : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
    } p-4`}>
      {/* Toggle principal */}
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-3 w-full group"
      >
        {/* Switch visual */}
        <div className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
          enabled ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'
        }`}>
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </div>

        <div className="flex-1 text-left">
          <span className={`text-sm font-medium ${
            enabled
              ? 'text-indigo-700 dark:text-indigo-300'
              : 'text-gray-700 dark:text-gray-300'
          }`}>
            🔁 Repetir análisis automáticamente
          </span>
          {!enabled && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              El análisis se ejecutará una sola vez
            </p>
          )}
        </div>
      </button>

      {/* Selector de intervalo (solo si está habilitado) */}
      {enabled && (
        <div className="mt-4 ml-13">
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-2 font-medium uppercase tracking-wide">
            Repetir cada
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {INTERVAL_OPTIONS.map(opt => (
              <button
                key={opt.hours}
                type="button"
                onClick={() => onIntervalChange(opt.hours)}
                className={`text-xs px-3 py-2 rounded-lg border font-medium transition-all ${
                  intervalHours === opt.hours
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-3 flex items-center gap-1.5">
            <span>ℹ️</span>
            <span>
              El próximo análisis se lanzará automáticamente en{' '}
              <strong>{INTERVAL_OPTIONS.find(o => o.hours === intervalHours)?.label.toLowerCase() ?? '...'}</strong>.
              Podés pausarlo desde <em>Schedules activos</em>.
            </span>
          </p>
        </div>
      )}
    </div>
  )
}
