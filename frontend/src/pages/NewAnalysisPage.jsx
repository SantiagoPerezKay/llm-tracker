import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

const STEPS = [
  { key: 'pending',               label: 'Iniciando análisis' },
  { key: 'generating_questions',  label: 'Generando 24 preguntas con IA' },
  { key: 'querying_llms',         label: 'Consultando ChatGPT y Gemini en paralelo' },
  { key: 'analyzing',             label: 'Analizando 48 respuestas con métricas' },
  { key: 'completed',             label: '¡Análisis completado!' },
]

export default function NewAnalysisPage() {
  const navigate = useNavigate()
  const intervalRef = useRef(null)

  const [phase, setPhase] = useState('form')   // 'form' | 'progress' | 'error'
  const [currentStatus, setCurrentStatus] = useState('pending')
  const [errorMsg, setErrorMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    name: '',
    city: '',
    sector: '',
    website: '',
    competitors: [''],
  })

  useEffect(() => () => clearTimeout(intervalRef.current), [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const competitors = form.competitors.filter(c => c.trim())
      const business = await api.createBusiness({
        name: form.name.trim(),
        city: form.city.trim(),
        sector: form.sector.trim(),
        website: form.website.trim() || null,
        competitors,
      })

      const analysis = await api.createAnalysis(business.id)
      setCurrentStatus(analysis.status)
      setPhase('progress')

      // Polling con setTimeout encadenado para evitar múltiples intervalos (StrictMode safe)
      const poll = async () => {
        try {
          const s = await api.getAnalysisStatus(analysis.id)
          setCurrentStatus(s.status)

          if (s.status === 'completed') {
            clearTimeout(intervalRef.current)
            setTimeout(() => navigate(`/analisis/${analysis.id}`), 1200)
          } else if (s.status === 'failed') {
            clearTimeout(intervalRef.current)
            setErrorMsg(s.error_message || 'El análisis falló. Revisá las API keys en el .env')
            setPhase('error')
          } else {
            intervalRef.current = setTimeout(poll, 3000)
          }
        } catch {
          intervalRef.current = setTimeout(poll, 3000)
        }
      }
      intervalRef.current = setTimeout(poll, 3000)
    } catch (err) {
      setErrorMsg(err.message)
      setPhase('error')
    } finally {
      setSubmitting(false)
    }
  }

  const setField = (key) => (val) => setForm(f => ({ ...f, [key]: val }))
  const addCompetitor = () => setForm(f => ({ ...f, competitors: [...f.competitors, ''] }))
  const removeCompetitor = (i) =>
    setForm(f => ({ ...f, competitors: f.competitors.filter((_, idx) => idx !== i) }))
  const setCompetitor = (i, val) =>
    setForm(f => ({ ...f, competitors: f.competitors.map((c, idx) => idx === i ? val : c) }))

  /* ── Error ── */
  if (phase === 'error') {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-xl font-bold text-red-700 mb-2">Error en el análisis</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">{errorMsg}</p>
        <button
          onClick={() => { setPhase('form'); setSubmitting(false) }}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700"
        >
          Intentar de nuevo
        </button>
      </div>
    )
  }

  /* ── Progress ── */
  if (phase === 'progress') {
    const currentIdx = STEPS.findIndex(s => s.key === currentStatus)
    return (
      <div className="max-w-lg mx-auto py-16">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Analizando tu negocio</h2>
          <p className="text-gray-400 text-sm mt-2">
            Enviamos 24 preguntas a ChatGPT y Gemini. Tardamos 1-2 minutos.
          </p>
        </div>

        <div className="space-y-3">
          {STEPS.map((step, i) => {
            const done   = i < currentIdx
            const active = i === currentIdx
            return (
              <div
                key={step.key}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  done   ? 'bg-emerald-50 border-emerald-100' :
                  active ? 'bg-indigo-50 border-indigo-200' :
                           'bg-white border-gray-100'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  done   ? 'bg-emerald-500 text-white' :
                  active ? 'bg-indigo-600 text-white' :
                           'bg-gray-100 text-gray-400'
                }`}>
                  {done ? '✓' : active ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : i + 1}
                </div>
                <span className={`text-sm font-medium ${
                  done ? 'text-emerald-700' : active ? 'text-indigo-700' : 'text-gray-400'
                }`}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-gray-400 text-center mt-6">No cierres esta ventana.</p>
      </div>
    )
  }

  /* ── Form ── */
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Nuevo análisis</h1>
        <p className="text-gray-500 text-sm mt-1">
          Completá los datos de tu negocio. Lanzaremos 24 preguntas a ChatGPT y Gemini y analizaremos cada respuesta.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Datos principales */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Datos del negocio</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="Nombre del negocio *"
              value={form.name}
              onChange={setField('name')}
              placeholder="Ej: Veterinaria San Marcos"
              required
            />
            <Field
              label="Ciudad / Zona *"
              value={form.city}
              onChange={setField('city')}
              placeholder="Ej: Madrid, Chamberí"
              required
            />
          </div>

          <Field
            label="Sector / Rubro *"
            value={form.sector}
            onChange={setField('sector')}
            placeholder="Ej: Veterinaria / Cuidado animal"
            required
          />

          <Field
            label="Sitio web (opcional)"
            value={form.website}
            onChange={setField('website')}
            placeholder="https://tusitio.com"
            type="url"
          />
        </div>

        {/* Competidores */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Competidores</h2>
              <p className="text-xs text-gray-400 mt-0.5">Opcional, pero mejora el análisis comparativo.</p>
            </div>
            <button
              type="button"
              onClick={addCompetitor}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              + Agregar
            </button>
          </div>

          {form.competitors.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={c}
                onChange={e => setCompetitor(i, e.target.value)}
                placeholder={`Nombre del competidor ${i + 1}`}
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
              />
              {form.competitors.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCompetitor(i)}
                  className="text-gray-300 hover:text-red-400 transition-colors px-2 text-xl leading-none"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3">
          <div className="text-indigo-500 mt-0.5 flex-shrink-0">ℹ️</div>
          <p className="text-xs text-indigo-700 leading-relaxed">
            El análisis genera <strong>24 preguntas</strong> en 6 categorías, las consulta en paralelo
            a <strong>ChatGPT (GPT-4.1)</strong> y <strong>Gemini (2.5 Pro)</strong>, y extrae
            12 métricas por respuesta. Costo estimado: ~$0.34 por análisis.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3.5 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {submitting ? 'Iniciando...' : 'Lanzar análisis →'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, required, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-colors"
      />
    </div>
  )
}
