import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'
import { INTERVAL_OPTIONS } from '../components/ScheduleSelector'

function intervalLabel(hours) {
  return INTERVAL_OPTIONS.find(o => o.hours === hours)?.label ?? `Cada ${hours}h`
}

function nextRunLabel(dateStr) {
  const diff = new Date(dateStr) - new Date()
  if (diff <= 0) return 'Pendiente de ejecución'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h >= 24) return `en ${Math.floor(h / 24)}d ${h % 24}h`
  if (h > 0) return `en ${h}h ${m}m`
  return `en ${m}m`
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null) // id del que se está actualizando
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    api.listSchedules()
      .then(setSchedules)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleToggle = async (schedule) => {
    setToggling(schedule.id)
    try {
      const updated = await api.updateSchedule(schedule.id, { is_active: !schedule.is_active })
      setSchedules(prev => prev.map(s => s.id === updated.id ? updated : s))
    } catch {}
    setToggling(null)
  }

  const handleChangeInterval = async (schedule, hours) => {
    setToggling(schedule.id)
    try {
      const updated = await api.updateSchedule(schedule.id, { interval_hours: hours })
      setSchedules(prev => prev.map(s => s.id === updated.id ? updated : s))
    } catch {}
    setToggling(null)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este schedule? El negocio ya no se analizará automáticamente.')) return
    setDeleting(id)
    try {
      await api.deleteSchedule(id)
      setSchedules(prev => prev.filter(s => s.id !== id))
    } catch {}
    setDeleting(null)
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 sm:mb-8 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50">
            Análisis programados
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {schedules.length} schedule{schedules.length !== 1 ? 's' : ''} configurado{schedules.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link to="/"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          ← Volver
        </Link>
      </div>

      {/* Empty */}
      {schedules.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🕐</div>
          <h2 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">
            No hay análisis programados
          </h2>
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">
            Al lanzar un análisis podés activar la repetición automática.
          </p>
          <Link to="/"
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity">
            Ir a mis negocios
          </Link>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-4">
        {schedules.map(schedule => (
          <ScheduleCard
            key={schedule.id}
            schedule={schedule}
            toggling={toggling === schedule.id}
            deleting={deleting === schedule.id}
            onToggle={() => handleToggle(schedule)}
            onChangeInterval={(h) => handleChangeInterval(schedule, h)}
            onDelete={() => handleDelete(schedule.id)}
          />
        ))}
      </div>
    </div>
  )
}

function ScheduleCard({ schedule, toggling, deleting, onToggle, onChangeInterval, onDelete }) {
  const [showIntervals, setShowIntervals] = useState(false)

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-sm transition-opacity ${
      schedule.is_active
        ? 'border-gray-100 dark:border-gray-800'
        : 'border-gray-100 dark:border-gray-800 opacity-60'
    }`}>
      {/* Cabecera */}
      <div className="flex items-start gap-4 p-5">
        {/* Icono */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
          schedule.is_active
            ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
            : 'bg-gray-300 dark:bg-gray-700'
        }`}>
          {schedule.business?.name?.charAt(0).toUpperCase() ?? '?'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/negocio/${schedule.business_id}/historial`}
              className="font-bold text-gray-900 dark:text-gray-50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate">
              {schedule.business?.name ?? `Negocio #${schedule.business_id}`}
            </Link>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              schedule.is_active
                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            }`}>
              {schedule.is_active ? 'Activo' : 'Pausado'}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {schedule.business?.city} · {schedule.business?.sector}
          </p>
        </div>

        {/* Toggle on/off */}
        <button
          onClick={onToggle}
          disabled={toggling || deleting}
          title={schedule.is_active ? 'Pausar' : 'Activar'}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${
            schedule.is_active ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            schedule.is_active ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      {/* Stats row */}
      <div className="border-t border-gray-50 dark:border-gray-800 px-5 py-3 flex flex-wrap gap-5 text-sm">
        {/* Frecuencia (editable) */}
        <div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Frecuencia</div>
          <button
            onClick={() => setShowIntervals(v => !v)}
            disabled={toggling || deleting}
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 disabled:opacity-50"
          >
            {intervalLabel(schedule.interval_hours)}
            <svg className={`w-3 h-3 transition-transform ${showIntervals ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Próxima ejecución */}
        <div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Próxima ejecución</div>
          <div className="font-semibold text-gray-700 dark:text-gray-200">
            {schedule.is_active ? nextRunLabel(schedule.next_run_at) : '—'}
          </div>
        </div>

        {/* Última ejecución */}
        <div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Última ejecución</div>
          <div className="font-semibold text-gray-700 dark:text-gray-200">
            {schedule.last_run_at
              ? new Date(schedule.last_run_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
              : 'Nunca'
            }
          </div>
        </div>

        {/* Preguntas */}
        <div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Preguntas</div>
          <div className="font-semibold text-gray-700 dark:text-gray-200">
            {schedule.questions?.length ?? 0}
          </div>
        </div>

        {/* Eliminar */}
        <div className="ml-auto flex items-center">
          <button
            onClick={onDelete}
            disabled={toggling || deleting}
            className="text-xs text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Eliminar
          </button>
        </div>
      </div>

      {/* Selector de intervalo expandible */}
      {showIntervals && (
        <div className="border-t border-gray-50 dark:border-gray-800 px-5 py-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wide font-medium">
            Cambiar frecuencia
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {INTERVAL_OPTIONS.map(opt => (
              <button
                key={opt.hours}
                type="button"
                disabled={toggling}
                onClick={() => { onChangeInterval(opt.hours); setShowIntervals(false) }}
                className={`text-xs px-3 py-2 rounded-lg border font-medium transition-all disabled:opacity-50 ${
                  schedule.interval_hours === opt.hours
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
