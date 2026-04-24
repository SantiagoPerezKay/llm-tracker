/**
 * Flujo de nuevo análisis para un negocio YA EXISTENTE.
 * Salta el formulario y va directo a: sugerir preguntas → seleccionar → lanzar.
 */
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import LoadingSpinner from '../components/LoadingSpinner'
import ScheduleSelector from '../components/ScheduleSelector'

const CATEGORY_LABELS = {
  conocimiento:  'Conocimiento directo',
  recomendacion: 'Recomendación',
  comparativa:   'Comparativa',
  reputacion:    'Reputación',
  servicios:     'Servicios',
  precio:        'Precio',
}

const CATEGORY_COLORS = {
  conocimiento:  { bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-700 dark:text-blue-300',    dot: 'bg-blue-500' },
  recomendacion: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  comparativa:   { bg: 'bg-amber-50 dark:bg-amber-900/20',   text: 'text-amber-700 dark:text-amber-300',   dot: 'bg-amber-500' },
  reputacion:    { bg: 'bg-red-50 dark:bg-red-900/20',       text: 'text-red-700 dark:text-red-300',       dot: 'bg-red-500' },
  servicios:     { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
  precio:        { bg: 'bg-pink-50 dark:bg-pink-900/20',     text: 'text-pink-700 dark:text-pink-300',     dot: 'bg-pink-500' },
}

const PROGRESS_STEPS = [
  { key: 'pending',              label: 'Iniciando análisis' },
  { key: 'generating_questions', label: 'Procesando preguntas' },
  { key: 'querying_llms',        label: 'Consultando ChatGPT y Gemini en paralelo' },
  { key: 'analyzing',            label: 'Analizando respuestas con métricas' },
  { key: 'completed',            label: '¡Análisis completado!' },
]

export default function ReanalyzePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const intervalRef = useRef(null)

  // Fases: 'loading' → 'suggesting' → 'selecting' → 'progress' → 'error'
  const [phase, setPhase] = useState('loading')
  const [business, setBusiness] = useState(null)
  const [selection, setSelection] = useState({})
  const [currentStatus, setCurrentStatus] = useState('pending')
  const [errorMsg, setErrorMsg] = useState('')
  const [launching, setLaunching] = useState(false)

  // Schedule
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduleHours, setScheduleHours] = useState(24)

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      try {
        const b = await api.getBusiness(id)
        if (cancelled) return
        setBusiness(b)
        setPhase('suggesting')

        const result = await api.suggestQuestions(Number(id))
        if (cancelled) return

        const initialSelection = {}
        for (const { category, questions } of result.suggestions) {
          initialSelection[category] = questions.map(prompt => ({
            prompt, selected: true, editing: false,
          }))
        }
        setSelection(initialSelection)
        setPhase('selecting')
      } catch (err) {
        if (!cancelled) { setErrorMsg(err.message); setPhase('error') }
      }
    }
    init()
    return () => { cancelled = true; clearTimeout(intervalRef.current) }
  }, [id])

  /* ── Helpers de selección ── */
  const toggleQuestion = (cat, idx) =>
    setSelection(prev => ({ ...prev, [cat]: prev[cat].map((q, i) => i === idx ? { ...q, selected: !q.selected } : q) }))

  const updatePrompt = (cat, idx, val) =>
    setSelection(prev => ({ ...prev, [cat]: prev[cat].map((q, i) => i === idx ? { ...q, prompt: val } : q) }))

  const setEditing = (cat, idx, val) =>
    setSelection(prev => ({ ...prev, [cat]: prev[cat].map((q, i) => i === idx ? { ...q, editing: val } : q) }))

  const addQuestion = (cat) =>
    setSelection(prev => ({ ...prev, [cat]: [...(prev[cat] || []), { prompt: '', selected: true, editing: true }] }))

  const removeQuestion = (cat, idx) =>
    setSelection(prev => ({ ...prev, [cat]: prev[cat].filter((_, i) => i !== idx) }))

  const selectAll = (val) =>
    setSelection(prev => Object.fromEntries(Object.entries(prev).map(([cat, qs]) => [cat, qs.map(q => ({ ...q, selected: val }))])))

  const selectedQuestions = Object.entries(selection).flatMap(([cat, qs]) =>
    qs.filter(q => q.selected && q.prompt.trim()).map(q => ({ category: cat, prompt: q.prompt.trim() }))
  )

  /* ── Lanzar análisis ── */
  const handleLaunch = async () => {
    if (selectedQuestions.length === 0 || launching) return
    setLaunching(true)
    try {
      const analysis = await api.createAnalysis(Number(id), selectedQuestions)

      // Guardar schedule si está habilitado (en paralelo, no bloqueante)
      if (scheduleEnabled && scheduleHours > 0) {
        api.createSchedule(Number(id), selectedQuestions, scheduleHours).catch(() => {})
      }

      setCurrentStatus(analysis.status)
      setPhase('progress')

      const poll = async () => {
        try {
          const s = await api.getAnalysisStatus(analysis.id)
          setCurrentStatus(s.status)
          if (s.status === 'completed') {
            clearTimeout(intervalRef.current)
            setTimeout(() => navigate(`/analisis/${analysis.id}`), 1200)
          } else if (s.status === 'failed') {
            clearTimeout(intervalRef.current)
            setErrorMsg(s.error_message || 'El análisis falló.')
            setPhase('error')
          } else {
            intervalRef.current = setTimeout(poll, 3000)
          }
        } catch { intervalRef.current = setTimeout(poll, 3000) }
      }
      intervalRef.current = setTimeout(poll, 3000)
    } catch (err) {
      setErrorMsg(err.message)
      setPhase('error')
    } finally {
      setLaunching(false)
    }
  }

  /* ════ RENDERS POR FASE ════ */

  if (phase === 'error') return (
    <div className="max-w-md mx-auto text-center py-20">
      <div className="text-5xl mb-4">❌</div>
      <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Ocurrió un error</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{errorMsg}</p>
      <Link to={`/negocio/${id}/historial`} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700">
        ← Volver al historial
      </Link>
    </div>
  )

  if (phase === 'loading' || phase === 'suggesting') return (
    <div className="max-w-lg mx-auto py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">
        {phase === 'loading' ? 'Cargando negocio…' : 'Generando preguntas personalizadas'}
      </h2>
      {business && (
        <p className="text-gray-400 dark:text-gray-500 text-sm">
          Creando preguntas para <strong className="text-gray-600 dark:text-gray-300">{business.name}</strong> en <strong className="text-gray-600 dark:text-gray-300">{business.sector}</strong>…
        </p>
      )}
      <div className="mt-8 flex justify-center gap-1.5">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )

  if (phase === 'progress') {
    const currentIdx = PROGRESS_STEPS.findIndex(s => s.key === currentStatus)
    return (
      <div className="max-w-lg mx-auto py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Analizando {business?.name}</h2>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
            {selectedQuestions.length} preguntas enviadas a ChatGPT y Gemini. Tardamos 1-2 minutos.
          </p>
        </div>
        <div className="space-y-3">
          {PROGRESS_STEPS.map((step, i) => {
            const done = i < currentIdx, active = i === currentIdx
            return (
              <div key={step.key} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                done   ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50'
                : active ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50'
                : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
              }`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  done   ? 'bg-emerald-500 text-white'
                  : active ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                }`}>
                  {done ? '✓' : active ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : i + 1}
                </div>
                <span className={`text-sm font-medium ${
                  done   ? 'text-emerald-700 dark:text-emerald-300'
                  : active ? 'text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-6">No cierres esta ventana.</p>
      </div>
    )
  }

  /* ── Selecting ── */
  const totalSelected = selectedQuestions.length
  const totalAvailable = Object.values(selection).reduce((acc, qs) => acc + qs.length, 0)

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 mb-1">
          <Link to="/" className="hover:text-gray-600 dark:hover:text-gray-300">Inicio</Link>
          <span>/</span>
          <Link to={`/negocio/${id}/historial`} className="hover:text-gray-600 dark:hover:text-gray-300">{business?.name}</Link>
          <span>/</span>
          <span className="text-gray-700 dark:text-gray-200 font-medium">Nuevo análisis</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Revisá las preguntas sugeridas</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          La IA generó <strong>{totalAvailable}</strong> preguntas para <strong>{business?.name}</strong>.
          Seleccioná, editá o agregá preguntas antes de lanzar.
        </p>
      </div>

      {/* Barra de acción */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-5 py-3 mb-5 shadow-sm flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-base">{totalSelected}</span>
            <span className="text-gray-400 dark:text-gray-500"> / {totalAvailable} seleccionadas</span>
          </span>
          <div className="flex gap-2">
            <button onClick={() => selectAll(true)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium">Seleccionar todas</button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button onClick={() => selectAll(false)} className="text-xs text-gray-400 dark:text-gray-500 hover:underline">Ninguna</button>
          </div>
        </div>
        <button
          onClick={handleLaunch}
          disabled={totalSelected === 0 || launching}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {launching ? 'Iniciando…' : `Lanzar con ${totalSelected} preguntas →`}
        </button>
      </div>

      {/* Schedule */}
      <ScheduleSelector
        enabled={scheduleEnabled}
        onToggle={() => setScheduleEnabled(v => !v)}
        intervalHours={scheduleHours}
        onIntervalChange={setScheduleHours}
      />

      {/* Categorías */}
      <div className="space-y-4 mt-4">
        {Object.entries(selection).map(([cat, questions]) => {
          const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.conocimiento
          const selectedInCat = questions.filter(q => q.selected && q.prompt.trim()).length
          return (
            <div key={cat} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className={`flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800 ${colors.bg}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                  <span className={`text-sm font-semibold ${colors.text}`}>{CATEGORY_LABELS[cat] ?? cat}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-normal ml-1">{selectedInCat}/{questions.length}</span>
                </div>
                <button onClick={() => addQuestion(cat)} className={`text-xs font-medium ${colors.text} hover:opacity-70 flex items-center gap-1`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar
                </button>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {questions.map((q, idx) => (
                  <QuestionRow key={idx} question={q} colors={colors}
                    onToggle={() => toggleQuestion(cat, idx)}
                    onEdit={val => updatePrompt(cat, idx, val)}
                    onStartEdit={() => setEditing(cat, idx, true)}
                    onStopEdit={() => setEditing(cat, idx, false)}
                    onRemove={() => removeQuestion(cat, idx)}
                  />
                ))}
                {questions.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic px-5 py-4">Sin preguntas. Usá "+ Agregar" para crear una.</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <button onClick={handleLaunch} disabled={totalSelected === 0 || launching}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold px-8 py-3 rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity">
          {launching ? 'Iniciando…' : `Lanzar análisis con ${totalSelected} preguntas →`}
        </button>
      </div>
    </div>
  )
}

/* ── Fila de pregunta con edición inline ── */
function QuestionRow({ question, colors, onToggle, onEdit, onStartEdit, onStopEdit, onRemove }) {
  const inputRef = useRef(null)
  useEffect(() => {
    if (question.editing && inputRef.current) {
      inputRef.current.focus()
      const len = inputRef.current.value.length
      inputRef.current.setSelectionRange(len, len)
    }
  }, [question.editing])

  return (
    <div className={`flex items-start gap-3 px-5 py-3.5 transition-colors ${question.selected ? '' : 'opacity-50'}`}>
      <button type="button" onClick={onToggle}
        className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
          question.selected ? `${colors.dot} border-transparent` : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
        }`}>
        {question.selected && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        {question.editing ? (
          <input ref={inputRef} type="text" value={question.prompt}
            onChange={e => onEdit(e.target.value)}
            onBlur={onStopEdit}
            onKeyDown={e => { if (e.key === 'Enter') onStopEdit() }}
            className="w-full text-sm text-gray-800 dark:text-gray-200 border-b-2 border-indigo-400 outline-none bg-transparent pb-0.5"
            placeholder="Escribí la pregunta…" />
        ) : (
          <p onClick={onStartEdit} title="Clic para editar"
            className="text-sm text-gray-700 dark:text-gray-300 cursor-text hover:text-gray-900 dark:hover:text-gray-100 leading-relaxed">
            {question.prompt || <span className="italic text-gray-400 dark:text-gray-500">Vacía — clic para editar</span>}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
        {!question.editing && (
          <button onClick={onStartEdit} title="Editar" className="p-1 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
        <button onClick={onRemove} title="Eliminar" className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
