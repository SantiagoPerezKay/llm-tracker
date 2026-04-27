const CONFIG = {
  pending:               { label: 'Iniciando',           cls: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
  generating_questions:  { label: 'Generando preguntas', cls: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' },
  querying_llms:         { label: 'Consultando LLMs',    cls: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' },
  analyzing:             { label: 'Analizando',           cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  completed:             { label: 'Completado',           cls: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
  failed:                { label: 'Error',                cls: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
}

export default function StatusBadge({ status }) {
  const cfg = CONFIG[status] ?? CONFIG.pending
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {status === 'completed' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />}
      {status === 'failed'    && <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />}
      {cfg.label}
    </span>
  )
}
