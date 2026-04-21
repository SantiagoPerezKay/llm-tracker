const CONFIG = {
  pending:               { label: 'Iniciando',          cls: 'bg-gray-100 text-gray-600' },
  generating_questions:  { label: 'Generando preguntas', cls: 'bg-indigo-100 text-indigo-700' },
  querying_llms:         { label: 'Consultando LLMs',    cls: 'bg-purple-100 text-purple-700' },
  analyzing:             { label: 'Analizando',          cls: 'bg-amber-100 text-amber-700' },
  completed:             { label: 'Completado',          cls: 'bg-emerald-100 text-emerald-700' },
  failed:                { label: 'Error',               cls: 'bg-red-100 text-red-700' },
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
