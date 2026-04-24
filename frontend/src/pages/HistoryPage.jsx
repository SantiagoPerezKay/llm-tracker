import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { api } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'
import StatusBadge from '../components/StatusBadge'
import { useTheme } from '../context/ThemeContext'

export default function HistoryPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { dark }  = useTheme()
  const [business, setBusiness] = useState(null)
  const [history, setHistory]   = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([api.getBusiness(id), api.getBusinessHistory(id)])
      .then(([b, h]) => { setBusiness(b); setHistory(h) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const handleNewAnalysis = () => navigate(`/negocio/${id}/nuevo`)

  if (loading) return <LoadingSpinner />
  if (!business) return (
    <div className="text-center py-20 text-gray-400 dark:text-gray-500">
      Negocio no encontrado.
      <Link to="/" className="block text-indigo-600 dark:text-indigo-400 hover:underline mt-2 text-sm">← Inicio</Link>
    </div>
  )

  const completed  = history.filter(a => a.status === 'completed')
  const chartData  = [...completed].reverse().map(a => ({
    fecha: new Date(a.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    'Score total': a.total_score    ? Math.round(a.total_score)    : null,
    'Sentimiento': a.sentiment_score ? Math.round(a.sentiment_score) : null,
    'Visibilidad': a.visibility_score ? Math.round(a.visibility_score) : null,
  }))

  const axisColor   = dark ? '#6b7280' : '#9ca3af'
  const gridColor   = dark ? '#1f2937' : '#f0f0f0'
  const tooltipStyle = dark
    ? { borderRadius: 12, border: '1px solid #374151', fontSize: 12, backgroundColor: '#111827', color: '#f9fafb' }
    : { borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 sm:mb-8 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1 text-sm text-gray-400 dark:text-gray-500">
            <Link to="/" className="hover:text-gray-600 dark:hover:text-gray-300">Inicio</Link>
            <span>/</span>
            <span className="text-gray-700 dark:text-gray-300">{business.name}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50">{business.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{business.city} · {business.sector}</p>
        </div>
        <button onClick={handleNewAnalysis}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap">
          + Nuevo análisis
        </button>
      </div>

      {/* Stats */}
      {completed.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">{completed.length}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Análisis completados</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {completed[0]?.total_score?.toFixed(0) ?? '—'}
              <span className="text-base sm:text-lg">/100</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Último score</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3 sm:p-4 text-center">
            {completed.length >= 2 ? (
              <>
                <div className={`text-2xl sm:text-3xl font-bold ${
                  (completed[0]?.total_score ?? 0) > (completed[1]?.total_score ?? 0)
                    ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                }`}>
                  {(completed[0]?.total_score ?? 0) > (completed[1]?.total_score ?? 0) ? '↑' : '↓'}
                  {Math.abs((completed[0]?.total_score ?? 0) - (completed[1]?.total_score ?? 0)).toFixed(1)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">vs. anterior</div>
              </>
            ) : (
              <>
                <div className="text-2xl sm:text-3xl font-bold text-gray-300 dark:text-gray-600">—</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sin comparativa</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length >= 2 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 sm:p-6 mb-6">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-5">Evolución temporal</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: axisColor }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: axisColor }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: axisColor }} />
              <Line type="monotone" dataKey="Score total" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} connectNulls />
              <Line type="monotone" dataKey="Sentimiento" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} connectNulls />
              <Line type="monotone" dataKey="Visibilidad"  stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {chartData.length === 1 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl p-4 text-sm text-indigo-700 dark:text-indigo-300 mb-6 flex items-center gap-2">
          <span>📈</span>
          <span>Completá al menos 2 análisis para ver la evolución temporal.</span>
        </div>
      )}

      {/* History list */}
      <h2 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Todos los análisis</h2>

      {history.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p>No hay análisis para este negocio todavía.</p>
          <button onClick={handleNewAnalysis} className="mt-4 text-indigo-600 dark:text-indigo-400 hover:underline text-sm">
            Lanzar el primer análisis →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((analysis, i) => (
            <div key={analysis.id}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 sm:p-5 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <StatusBadge status={analysis.status} />
                  {i === 0 && analysis.status === 'completed' && (
                    <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                      Más reciente
                    </span>
                  )}
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(analysis.created_at).toLocaleDateString('es-ES', {
                      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
                {analysis.status === 'completed' && (
                  <div className="flex gap-4 sm:gap-5 mt-2 flex-wrap">
                    <Stat label="Score total" value={`${analysis.total_score?.toFixed(0) ?? '—'}/100`} />
                    <Stat label="Sentimiento" value={`${analysis.sentiment_score?.toFixed(0) ?? '—'}/100`} />
                    <Stat label="Visibilidad" value={`${analysis.visibility_score?.toFixed(0) ?? '—'}%`} />
                  </div>
                )}
              </div>
              {analysis.status === 'completed' && (
                <Link to={`/analisis/${analysis.id}`}
                  className="text-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors font-medium whitespace-nowrap">
                  Ver dashboard →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-400 dark:text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{value}</div>
    </div>
  )
}
