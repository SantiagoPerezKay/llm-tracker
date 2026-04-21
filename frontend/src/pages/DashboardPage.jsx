import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'
import ScoreCard from '../components/ScoreCard'
import MetricBar from '../components/MetricBar'
import StatusBadge from '../components/StatusBadge'
import TopicCloud from '../components/TopicCloud'

const TABS = [
  { key: 'resumen',     label: 'Resumen' },
  { key: 'comparativa', label: 'Comparativa ChatGPT vs Gemini' },
  { key: 'respuestas',  label: 'Respuestas crudas' },
]

const INTENT_COLORS = {
  recomendar: 'bg-emerald-100 text-emerald-700',
  informar:   'bg-blue-100 text-blue-700',
  comparar:   'bg-amber-100 text-amber-700',
  advertir:   'bg-orange-100 text-orange-700',
  disuadir:   'bg-red-100 text-red-700',
  desconocer: 'bg-gray-100 text-gray-600',
}

const CATEGORY_LABELS = {
  conocimiento:  'Conocimiento directo',
  recomendacion: 'Recomendación',
  comparativa:   'Comparativa',
  reputacion:    'Reputación',
  servicios:     'Servicios',
  precio:        'Precio',
}

const CATEGORY_COLORS = {
  conocimiento:  'bg-blue-50 text-blue-700',
  recomendacion: 'bg-emerald-50 text-emerald-700',
  comparativa:   'bg-amber-50 text-amber-700',
  reputacion:    'bg-red-50 text-red-600',
  servicios:     'bg-purple-50 text-purple-700',
  precio:        'bg-pink-50 text-pink-700',
}

export default function DashboardPage() {
  const { id } = useParams()
  const intervalRef = useRef(null)

  const [status, setStatus]     = useState(null)
  const [metrics, setMetrics]   = useState(null)
  const [compare, setCompare]   = useState(null)
  const [responses, setResponses] = useState(null)
  const [activeTab, setActiveTab] = useState('resumen')
  const [loading, setLoading]   = useState(true)
  const [tabLoading, setTabLoading] = useState(false)

  useEffect(() => {
    // Flag para cancelar operaciones async si el componente se desmonta o cambia el id
    let cancelled = false

    const schedulePoll = () => {
      intervalRef.current = setTimeout(() => poll(), 3000)
    }

    const poll = async () => {
      try {
        const s = await api.getAnalysisStatus(id)
        if (cancelled) return
        setStatus(s)
        if (s.status === 'completed') {
          const m = await api.getAnalysisMetrics(id)
          if (cancelled) return
          setMetrics(m)
          // Polling terminado — no se agenda otro tick
        } else if (s.status === 'failed') {
          // Polling terminado
        } else {
          schedulePoll()
        }
      } catch {
        if (!cancelled) schedulePoll()
      }
    }

    const loadInitial = async () => {
      try {
        const s = await api.getAnalysisStatus(id)
        if (cancelled) return
        setStatus(s)
        if (s.status === 'completed') {
          const m = await api.getAnalysisMetrics(id)
          if (cancelled) return
          setMetrics(m)
        } else if (s.status !== 'failed') {
          schedulePoll()
        }
      } catch {
        /* error handled by status being null */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    // Reset state al cambiar de análisis
    setLoading(true)
    setMetrics(null)
    setStatus(null)
    setCompare(null)
    setResponses(null)

    loadInitial()

    return () => {
      cancelled = true
      clearTimeout(intervalRef.current)
    }
  }, [id])

  const handleTabChange = async (tab) => {
    setActiveTab(tab)
    if (tab === 'comparativa' && !compare) {
      setTabLoading(true)
      try { setCompare(await api.getAnalysisCompare(id)) }
      catch { /* show empty */ }
      finally { setTabLoading(false) }
    }
    if (tab === 'respuestas' && !responses) {
      setTabLoading(true)
      try { setResponses(await api.getAnalysisResponses(id)) }
      catch { /* show empty */ }
      finally { setTabLoading(false) }
    }
  }

  /* ── Loading ── */
  if (loading) return <LoadingSpinner />

  /* ── Error de red ── */
  if (!status) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">No se pudo cargar el análisis #{id}.</p>
        <Link to="/" className="text-indigo-600 hover:underline text-sm mt-2 block">← Volver al inicio</Link>
      </div>
    )
  }

  /* ── Failed ── */
  if (status.status === 'failed') {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-xl font-bold text-red-700">El análisis falló</h2>
        <p className="text-sm text-gray-500 mt-2">{status.error_message || 'Error desconocido'}</p>
        <Link to="/" className="mt-6 inline-block text-indigo-600 hover:underline text-sm">
          ← Volver al inicio
        </Link>
      </div>
    )
  }

  /* ── En progreso ── */
  if (!metrics) {
    return (
      <div className="text-center py-20">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 font-medium">El análisis está en progreso...</p>
        <p className="text-xs text-gray-400 mt-1 capitalize">{status.status?.replace(/_/g, ' ')}</p>
      </div>
    )
  }

  const business = metrics.business
  const gs = metrics.global_scores
  const openaiLlm = metrics.by_llm?.find(l => l.provider === 'openai')
  const geminiLlm = metrics.by_llm?.find(l => l.provider === 'gemini')

  const avgRankings = [openaiLlm?.avg_ranking_position, geminiLlm?.avg_ranking_position].filter(Boolean)
  const combinedRanking = avgRankings.length
    ? avgRankings.reduce((a, b) => a + b, 0) / avgRankings.length
    : null

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1 text-sm text-gray-400">
            <Link to="/" className="hover:text-gray-600">Inicio</Link>
            <span>/</span>
            <Link to={`/negocio/${business.id}/historial`} className="hover:text-gray-600">
              {business.name}
            </Link>
            <span>/</span>
            <span>Análisis #{id}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
          <p className="text-gray-500 text-sm">{business.city} · {business.sector}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <StatusBadge status="completed" />
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
            {metrics.total_questions} preguntas · 2 LLMs · {metrics.total_questions * 2} respuestas
          </span>
        </div>
      </div>

      {/* ── Score cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <ScoreCard
          title="Sentimiento"
          value={gs.sentiment_score}
          unit="/100"
          color="emerald"
          sub={gs.sentiment_score >= 70 ? 'Positivo' : gs.sentiment_score >= 40 ? 'Neutro' : 'Negativo'}
        />
        <ScoreCard
          title="Visibilidad"
          value={gs.visibility_score}
          unit="%"
          color="blue"
          sub={`${Math.round((gs.visibility_score ?? 0) * metrics.total_questions / 100)}/${metrics.total_questions} preguntas`}
        />
        <ScoreCard
          title="Ranking medio"
          value={combinedRanking ? `#${combinedRanking.toFixed(1)}` : null}
          color="purple"
          sub="Posición en listas"
        />
        <ScoreCard
          title="Precisión"
          value={gs.accuracy_score}
          unit="%"
          color="amber"
          sub={gs.hallucination_rate > 0 ? `${gs.hallucination_rate?.toFixed(0)}% alucinaciones` : 'Sin alucinaciones'}
        />
      </div>

      {/* ── Tabs ── */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-0 -mb-px overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => handleTabChange(t.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === t.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tabLoading && <LoadingSpinner text="Cargando datos..." />}

      {/* ── RESUMEN ── */}
      {activeTab === 'resumen' && !tabLoading && (
        <ResumenTab metrics={metrics} openaiLlm={openaiLlm} geminiLlm={geminiLlm} gs={gs} />
      )}

      {/* ── COMPARATIVA ── */}
      {activeTab === 'comparativa' && !tabLoading && (
        <ComparativaTab compare={compare} />
      )}

      {/* ── RESPUESTAS ── */}
      {activeTab === 'respuestas' && !tabLoading && (
        <RespuestasTab responses={responses} />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   RESUMEN TAB
═══════════════════════════════════════════ */
function ResumenTab({ metrics, openaiLlm, geminiLlm, gs }) {
  return (
    <div className="space-y-6">
      {/* LLM Comparison panels */}
      <div className="grid md:grid-cols-2 gap-5">
        <LLMPanel provider="openai" llm={openaiLlm} />
        <LLMPanel provider="gemini" llm={geminiLlm} />
      </div>

      {/* Score extra: recommendation & consistency */}
      <div className="grid sm:grid-cols-3 gap-4">
        <MiniStat label="Tasa de recomendación" value={`${gs.recommendation_rate?.toFixed(0) ?? '—'}%`}
          sub="Veces que la IA te recomienda activamente" color="violet" />
        <MiniStat label="Consistencia entre LLMs" value={`${gs.llm_consistency?.toFixed(0) ?? '—'}/100`}
          sub="Cuán alineados están ChatGPT y Gemini" color="teal" />
        <MiniStat label="Profundidad de conocimiento" value={`${gs.knowledge_depth?.toFixed(0) ?? '—'}/100`}
          sub="Nivel de detalle que tiene la IA sobre vos" color="indigo" />
      </div>

      {/* Hallucination alert */}
      {gs.hallucination_rate > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
          <h3 className="font-bold text-sm text-red-800 flex items-center gap-2 mb-3">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Alertas de información incorrecta
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {openaiLlm?.hallucination_rate > 0 && (
              <AlertItem
                provider="ChatGPT"
                color="emerald"
                text={`ChatGPT generó información potencialmente inventada en el ${openaiLlm.hallucination_rate?.toFixed(0)}% de sus respuestas.`}
              />
            )}
            {geminiLlm?.hallucination_rate > 0 && (
              <AlertItem
                provider="Gemini"
                color="blue"
                text={`Gemini generó información potencialmente inventada en el ${geminiLlm.hallucination_rate?.toFixed(0)}% de sus respuestas.`}
              />
            )}
          </div>
          <p className="text-xs text-red-600 mt-3">
            Revisá la pestaña <strong>Respuestas crudas</strong> para ver exactamente qué se dijo.
          </p>
        </div>
      )}

      {/* Topic cloud */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Temas que asocia la IA a tu negocio</h3>
        <TopicCloud topics={metrics.top_topics} max={20} />

        {metrics.all_competitor_mentions?.length > 0 && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Competidores mencionados junto a vos</p>
            <div className="flex flex-wrap gap-2">
              {metrics.all_competitor_mentions.map((c, i) => (
                <span key={i} className="px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-medium">{c}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {metrics.recommendations?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Recomendaciones para mejorar tu presencia en LLMs</h3>
          <div className="space-y-3">
            {metrics.recommendations.map((rec, i) => (
              <div key={i} className="flex gap-3 bg-indigo-50 rounded-xl p-4">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-sm text-indigo-800 leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function LLMPanel({ provider, llm }) {
  const isOpenAI = provider === 'openai'
  const color    = isOpenAI ? 'emerald' : 'blue'
  const label    = isOpenAI ? 'ChatGPT (GPT-4.1)' : 'Gemini (2.5 Pro)'
  const headerBg = isOpenAI ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'
  const dotCls   = isOpenAI ? 'bg-emerald-500' : 'bg-blue-500'
  const textCls  = isOpenAI ? 'text-emerald-800' : 'text-blue-800'

  if (!llm) return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden">
      <div className={`px-5 py-3 flex items-center gap-2 border-b ${headerBg}`}>
        <div className={`w-5 h-5 rounded-full ${dotCls}`} />
        <span className={`font-semibold text-sm ${textCls}`}>{label}</span>
      </div>
      <div className="p-5 text-sm text-gray-400">Sin datos disponibles</div>
    </div>
  )

  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden">
      <div className={`px-5 py-3 flex items-center gap-2 border-b ${headerBg}`}>
        <div className={`w-5 h-5 rounded-full ${dotCls}`} />
        <span className={`font-semibold text-sm ${textCls}`}>{label}</span>
      </div>
      <div className="p-5 space-y-4">
        <MetricBar label="Sentimiento"  value={llm.sentiment_score}      color={color} />
        <MetricBar label="Visibilidad"  value={llm.visibility_score}     color={color} />
        <MetricBar label="Precisión"    value={llm.accuracy_score}       color={color} />
        <MetricBar label="Alucinaciones" value={llm.hallucination_rate}  inverted />

        {llm.dominant_intent && (
          <div className="pt-2">
            <p className="text-xs text-gray-400 mb-2">Intención predominante</p>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${INTENT_COLORS[llm.dominant_intent] ?? 'bg-gray-100 text-gray-600'}`}>
              {llm.dominant_intent}
            </span>
          </div>
        )}

        {llm.top_topics?.length > 0 && (
          <div className="pt-2">
            <p className="text-xs text-gray-400 mb-2">Temas asociados</p>
            <div className="flex flex-wrap gap-1.5">
              {llm.top_topics.slice(0, 6).map((t, i) => (
                <span key={i} className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                  isOpenAI ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                }`}>{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MiniStat({ label, value, sub, color }) {
  const COLORS = {
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    teal:   'bg-teal-50 text-teal-700 border-teal-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  }
  return (
    <div className={`rounded-xl border p-4 ${COLORS[color] ?? COLORS.indigo}`}>
      <div className="text-xs font-medium uppercase tracking-wide mb-1 opacity-70">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-1 opacity-60">{sub}</div>
    </div>
  )
}

function AlertItem({ provider, color, text }) {
  return (
    <div className="flex items-start gap-3 bg-white rounded-lg p-3">
      <div className={`w-4 h-4 rounded-full bg-${color}-500 flex-shrink-0 mt-0.5`} />
      <p className="text-xs text-gray-600 leading-relaxed"><strong>{provider}:</strong> {text}</p>
    </div>
  )
}

/* ═══════════════════════════════════════════
   COMPARATIVA TAB
═══════════════════════════════════════════ */
function ComparativaTab({ compare }) {
  const [filter, setFilter] = useState('todas')

  if (!compare) {
    return <div className="text-center py-12 text-gray-400">Sin datos de comparativa.</div>
  }

  const categories = ['todas', ...new Set(compare.questions.map(q => q.category))]
  const filtered = filter === 'todas'
    ? compare.questions
    : compare.questions.filter(q => q.category === filter)

  return (
    <div className="space-y-5">
      {/* LLM metric summary */}
      <div className="grid sm:grid-cols-2 gap-4">
        <CompactLLMSummary provider="openai" llm={compare.openai_metrics} />
        <CompactLLMSummary provider="gemini" llm={compare.gemini_metrics} />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat === 'todas' ? 'Todas' : CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {/* Question comparisons */}
      <div className="space-y-4">
        {filtered.map(q => (
          <QuestionComparison key={q.question_id} question={q} />
        ))}
      </div>
    </div>
  )
}

function CompactLLMSummary({ provider, llm }) {
  const isOpenAI = provider === 'openai'
  const dotCls   = isOpenAI ? 'bg-emerald-500' : 'bg-blue-500'
  const label    = isOpenAI ? 'ChatGPT' : 'Gemini'

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
      <div className={`w-8 h-8 rounded-full ${dotCls} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-800">{label}</p>
        <div className="flex gap-4 mt-1">
          <span className="text-xs text-gray-500">Sent: <strong>{llm?.sentiment_score?.toFixed(0) ?? '—'}</strong></span>
          <span className="text-xs text-gray-500">Vis: <strong>{llm?.visibility_score?.toFixed(0) ?? '—'}%</strong></span>
          <span className="text-xs text-gray-500">Prec: <strong>{llm?.accuracy_score?.toFixed(0) ?? '—'}%</strong></span>
        </div>
      </div>
    </div>
  )
}

function QuestionComparison({ question }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Question header */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[question.category] ?? 'bg-gray-100 text-gray-600'}`}>
          {CATEGORY_LABELS[question.category] ?? question.category}
        </span>
        <p className="text-sm text-gray-700 font-medium">{question.question_text}</p>
      </div>

      {/* Side by side */}
      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
        <ResponseCell response={question.openai} provider="openai" />
        <ResponseCell response={question.gemini} provider="gemini" />
      </div>
    </div>
  )
}

function ResponseCell({ response, provider }) {
  const isOpenAI = provider === 'openai'
  const label    = isOpenAI ? 'ChatGPT' : 'Gemini'
  const dotCls   = isOpenAI ? 'bg-emerald-500' : 'bg-blue-500'
  const tagCls   = isOpenAI ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'

  if (!response) {
    return (
      <div className="p-4">
        <div className={`flex items-center gap-1.5 mb-2`}>
          <div className={`w-3 h-3 rounded-full ${dotCls}`} />
          <span className="text-xs font-semibold text-gray-500">{label}</span>
        </div>
        <p className="text-xs text-gray-400 italic">Sin respuesta</p>
      </div>
    )
  }

  const sentColor = response.sentiment >= 70 ? 'text-emerald-600' : response.sentiment >= 40 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className={`w-3 h-3 rounded-full ${dotCls}`} />
          <span className="text-xs font-semibold text-gray-600">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {response.sentiment !== null && (
            <span className={`text-xs font-bold ${sentColor}`}>
              {response.sentiment?.toFixed(0)}/100
            </span>
          )}
          {response.has_hallucination && (
            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">⚠️ alucinación</span>
          )}
          {response.is_mentioned && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${tagCls}`}>mencionado</span>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-600 leading-relaxed line-clamp-5">
        {response.raw_response || <span className="italic text-gray-400">Sin respuesta</span>}
      </p>
      {response.topics?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {response.topics.slice(0, 4).map((t, i) => (
            <span key={i} className={`px-1.5 py-0.5 rounded text-xs ${tagCls}`}>{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════
   RESPUESTAS TAB
═══════════════════════════════════════════ */
function RespuestasTab({ responses }) {
  const [expanded, setExpanded] = useState(new Set())

  if (!responses) {
    return <div className="text-center py-12 text-gray-400">Sin respuestas disponibles.</div>
  }

  const toggle = (id) => {
    setExpanded(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500">
          {responses.total_questions} preguntas · {responses.total_responses} respuestas en total
        </p>
        <button
          onClick={() => setExpanded(
            expanded.size ? new Set() : new Set(responses.questions.map(q => q.id))
          )}
          className="text-xs text-indigo-600 hover:underline"
        >
          {expanded.size ? 'Colapsar todo' : 'Expandir todo'}
        </button>
      </div>

      {responses.questions.map(question => (
        <div key={question.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header */}
          <button
            onClick={() => toggle(question.id)}
            className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
          >
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${CATEGORY_COLORS[question.category] ?? 'bg-gray-100 text-gray-600'}`}>
              {CATEGORY_LABELS[question.category] ?? question.category}
            </span>
            <p className="text-sm text-gray-800 flex-1 text-left">{question.prompt}</p>
            <svg
              className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${expanded.has(question.id) ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Expanded */}
          {expanded.has(question.id) && (
            <div className="border-t border-gray-100 grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              {['openai', 'gemini'].map(provider => {
                const r = question.responses?.find(r => r.llm_provider === provider)
                return <FullResponseCell key={provider} response={r} provider={provider} />
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function FullResponseCell({ response, provider }) {
  const isOpenAI = provider === 'openai'
  const label    = isOpenAI ? 'ChatGPT (GPT-4.1)' : 'Gemini (2.5 Pro)'
  const dotCls   = isOpenAI ? 'bg-emerald-500' : 'bg-blue-500'
  const tagCls   = isOpenAI ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'

  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-4 h-4 rounded-full ${dotCls}`} />
        <span className="text-xs font-semibold text-gray-600">{label}</span>
        {response?.response_time_ms && (
          <span className="text-xs text-gray-400 ml-auto">{response.response_time_ms}ms</span>
        )}
      </div>

      {!response ? (
        <p className="text-xs text-gray-400 italic">Sin respuesta registrada</p>
      ) : (
        <>
          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">
            {response.raw_response || <span className="italic text-gray-400">Respuesta vacía</span>}
          </p>

          {/* Metrics row */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
            {response.sentiment !== null && (
              <Tag label="Sent" value={`${response.sentiment?.toFixed(0)}/100`} cls={tagCls} />
            )}
            {response.accuracy !== null && (
              <Tag label="Prec" value={`${response.accuracy?.toFixed(0)}%`} cls={tagCls} />
            )}
            {response.intent && (
              <Tag label="Intent" value={response.intent} cls={INTENT_COLORS[response.intent] ?? tagCls} />
            )}
            {response.is_mentioned !== null && (
              <Tag label="" value={response.is_mentioned ? '✓ mencionado' : '✗ no mencionado'}
                cls={response.is_mentioned ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'} />
            )}
            {response.has_hallucination && (
              <Tag label="" value="⚠️ alucinación" cls="bg-red-50 text-red-600" />
            )}
          </div>

          {response.topics?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {response.topics.map((t, i) => (
                <span key={i} className={`px-2 py-0.5 rounded text-xs font-medium ${tagCls}`}>{t}</span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Tag({ label, value, cls }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {label ? `${label}: ${value}` : value}
    </span>
  )
}
