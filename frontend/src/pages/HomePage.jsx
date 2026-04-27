import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'

export default function HomePage() {
  const [businesses, setBusinesses] = useState([])
  const [spending, setSpending] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      api.getBusinesses(),
      api.getSpending().catch(() => null),
    ])
      .then(([biz, spend]) => {
        setBusinesses(biz)
        setSpending(spend)
      })
      .catch(() => setError('No se pudo conectar con el servidor. ¿Está corriendo el backend?'))
      .finally(() => setLoading(false))
  }, [])

  const handleNewAnalysis = (businessId) => navigate(`/negocio/${businessId}/nuevo`)

  if (loading) return <LoadingSpinner />

  if (error) {
    return (
      <div className="text-center py-24">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Error de conexión</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{error}</p>
      </div>
    )
  }

  const formatCost = (usd) => {
    if (!usd) return '$0.00'
    if (usd < 0.001) return '< $0.001'
    if (usd < 1) return `$${usd.toFixed(4)}`
    return `$${usd.toFixed(2)}`
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50">Tus negocios</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            Supervisá cómo los LLMs perciben cada marca
          </p>
        </div>
        <Link
          to="/nuevo"
          className="flex-shrink-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-medium text-sm hover:opacity-90 active:scale-95 transition-all shadow-sm whitespace-nowrap"
        >
          + Nuevo
        </Link>
      </div>

      {/* Stats row — only when there's data */}
      {spending && spending.total_analyses > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <StatCard
            label="Negocios"
            value={businesses.length}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
            color="indigo"
          />
          <StatCard
            label="Análisis"
            value={spending.total_analyses}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            color="purple"
          />
          <StatCard
            label="Invertido"
            value={formatCost(spending.total_cost_usd)}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="amber"
          />
        </div>
      )}

      {/* Empty state */}
      {businesses.length === 0 && (
        <div className="text-center py-20 sm:py-28">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Sin negocios registrados</h2>
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-8 max-w-sm mx-auto">
            Registrá tu primer negocio y descubrí cómo ChatGPT y Gemini te perciben.
          </p>
          <Link to="/nuevo"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 active:scale-95 transition-all shadow-md">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Comenzar ahora
          </Link>
        </div>
      )}

      {/* Business grid */}
      {businesses.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {businesses.map(business => (
            <BusinessCard
              key={business.id}
              business={business}
              onNewAnalysis={() => handleNewAnalysis(business.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Stat card ──────────────────────────────────────────────────────────────
const COLOR_MAP = {
  indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
  purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  amber:  'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${COLOR_MAP[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 dark:text-gray-500 leading-none mb-1">{label}</p>
        <p className="font-bold text-gray-900 dark:text-gray-50 text-sm sm:text-base truncate">{value}</p>
      </div>
    </div>
  )
}

// ── Business card ──────────────────────────────────────────────────────────
const SECTOR_COLORS = [
  'from-indigo-400 to-purple-500',
  'from-emerald-400 to-teal-500',
  'from-pink-400 to-rose-500',
  'from-amber-400 to-orange-500',
  'from-sky-400 to-blue-500',
  'from-violet-400 to-indigo-500',
]

function avatarGradient(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return SECTOR_COLORS[Math.abs(h) % SECTOR_COLORS.length]
}

function BusinessCard({ business, onNewAnalysis }) {
  const gradient = avatarGradient(business.name)

  return (
    <div className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg dark:hover:shadow-gray-900/60 hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden">

      {/* Top accent bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${gradient}`} />

      <div className="p-5 sm:p-6 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-sm`}>
            {business.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 dark:text-gray-50 truncate leading-tight">{business.name}</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
              {[business.city, business.sector].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        {/* Website */}
        {business.website && (
          <a
            href={business.website}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:underline mb-3 truncate"
          >
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span className="truncate">{business.website.replace(/^https?:\/\//, '')}</span>
          </a>
        )}

        {/* Competitors */}
        {business.competitors?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {business.competitors.slice(0, 3).map((c, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full border border-gray-200 dark:border-gray-700">
                {c}
              </span>
            ))}
            {business.competitors.length > 3 && (
              <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-full border border-gray-200 dark:border-gray-700">
                +{business.competitors.length - 3} más
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-3 border-t border-gray-50 dark:border-gray-800">
          <Link
            to={`/negocio/${business.id}/historial`}
            className="flex-1 text-center text-xs sm:text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Historial
          </Link>
          <button
            onClick={onNewAnalysis}
            className="flex-1 text-xs sm:text-sm font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 py-2 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 active:scale-95 transition-all"
          >
            Analizar
          </button>
        </div>
      </div>
    </div>
  )
}
