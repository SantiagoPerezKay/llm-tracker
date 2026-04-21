import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'

export default function HomePage() {
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.getBusinesses()
      .then(setBusinesses)
      .catch(() => setError('No se pudo conectar con el servidor. ¿Está corriendo el backend?'))
      .finally(() => setLoading(false))
  }, [])

  const handleNewAnalysis = async (businessId) => {
    try {
      const analysis = await api.createAnalysis(businessId)
      navigate(`/analisis/${analysis.id}`)
    } catch (e) {
      alert('Error al iniciar el análisis: ' + e.message)
    }
  }

  if (loading) return <LoadingSpinner />

  if (error) {
    return (
      <div className="text-center py-24">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-700 mb-2">Error de conexión</h2>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tus negocios</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {businesses.length} negocio{businesses.length !== 1 ? 's' : ''} registrado{businesses.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          to="/nuevo"
          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
        >
          + Nuevo análisis
        </Link>
      </div>

      {/* Empty state */}
      {businesses.length === 0 && (
        <div className="text-center py-24">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Sin negocios registrados</h2>
          <p className="text-gray-400 text-sm mb-6">
            Registrá tu primer negocio y descubrí cómo ChatGPT y Gemini te perciben.
          </p>
          <Link
            to="/nuevo"
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            Comenzar ahora
          </Link>
        </div>
      )}

      {/* Business grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {businesses.map(business => (
          <BusinessCard
            key={business.id}
            business={business}
            onNewAnalysis={() => handleNewAnalysis(business.id)}
          />
        ))}
      </div>
    </div>
  )
}

function BusinessCard({ business, onNewAnalysis }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="font-bold text-gray-900 truncate">{business.name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{business.city} · {business.sector}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {business.name.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Website */}
      {business.website && (
        <a
          href={business.website}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-indigo-500 hover:underline mb-3 truncate block"
        >
          {business.website.replace(/^https?:\/\//, '')}
        </a>
      )}

      {/* Competitors */}
      {business.competitors?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {business.competitors.slice(0, 3).map((c, i) => (
            <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
              {c}
            </span>
          ))}
          {business.competitors.length > 3 && (
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full">
              +{business.competitors.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-3">
        <Link
          to={`/negocio/${business.id}/historial`}
          className="flex-1 text-center text-sm border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Ver historial
        </Link>
        <button
          onClick={onNewAnalysis}
          className="flex-1 text-sm bg-indigo-50 text-indigo-700 py-2 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
        >
          Nuevo análisis
        </button>
      </div>
    </div>
  )
}
