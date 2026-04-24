import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import ScheduleSelector from '../components/ScheduleSelector'

/* ── Constantes ─────────────────────────────────────────── */
const CATEGORY_LABELS = {
  conocimiento:  'Conocimiento directo',
  recomendacion: 'Recomendación',
  comparativa:   'Comparativa',
  reputacion:    'Reputación',
  servicios:     'Servicios',
  precio:        'Precio',
}

const CATEGORY_COLORS = {
  conocimiento:  { bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-700 dark:text-blue-300',    border: 'border-blue-200 dark:border-blue-800/50',    dot: 'bg-blue-500' },
  recomendacion: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800/50', dot: 'bg-emerald-500' },
  comparativa:   { bg: 'bg-amber-50 dark:bg-amber-900/20',   text: 'text-amber-700 dark:text-amber-300',   border: 'border-amber-200 dark:border-amber-800/50',   dot: 'bg-amber-500' },
  reputacion:    { bg: 'bg-red-50 dark:bg-red-900/20',       text: 'text-red-700 dark:text-red-300',       border: 'border-red-200 dark:border-red-800/50',       dot: 'bg-red-500' },
  servicios:     { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800/50', dot: 'bg-purple-500' },
  precio:        { bg: 'bg-pink-50 dark:bg-pink-900/20',     text: 'text-pink-700 dark:text-pink-300',     border: 'border-pink-200 dark:border-pink-800/50',     dot: 'bg-pink-500' },
}

const PROGRESS_STEPS = [
  { key: 'pending',              label: 'Iniciando análisis' },
  { key: 'generating_questions', label: 'Procesando preguntas' },
  { key: 'querying_llms',        label: 'Consultando ChatGPT y Gemini en paralelo' },
  { key: 'analyzing',            label: 'Analizando respuestas con métricas' },
  { key: 'completed',            label: '¡Análisis completado!' },
]

/* ══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════════════ */
export default function NewAnalysisPage() {
  const navigate = useNavigate()
  const intervalRef = useRef(null)

  // Fases: 'form' → 'suggesting' → 'selecting' → 'progress' → 'error'
  const [phase, setPhase] = useState('form')
  const [errorMsg, setErrorMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Datos del negocio creado
  const [business, setBusiness] = useState(null)

  // Preguntas sugeridas: { category: string, questions: string[] }[]
  const [suggestions, setSuggestions] = useState([])

  // Estado de selección: { [category]: { [idx]: { prompt, selected, editing } } }
  const [selection, setSelection] = useState({})

  // Estado del análisis en curso
  const [currentStatus, setCurrentStatus] = useState('pending')

  // Schedule
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [scheduleHours, setScheduleHours] = useState(24)

  // Formulario
  const [form, setForm] = useState({
    name: '', city: '', sector: '', website: '', competitors: [''],
  })

  useEffect(() => () => clearTimeout(intervalRef.current), [])

  /* ── Helpers de formulario ── */
  const setField = (key) => (val) => setForm(f => ({ ...f, [key]: val }))
  const addCompetitor = () => setForm(f => ({ ...f, competitors: [...f.competitors, ''] }))
  const removeCompetitor = (i) => setForm(f => ({ ...f, competitors: f.competitors.filter((_, idx) => idx !== i) }))
  const setCompetitor = (i, val) => setForm(f => ({ ...f, competitors: f.competitors.map((c, idx) => idx === i ? val : c) }))

  /* ── Paso 1: Crear negocio y pedir sugerencias ── */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const competitors = form.competitors.filter(c => c.trim())
      const newBusiness = await api.createBusiness({
        name: form.name.trim(),
        city: form.city.trim(),
        sector: form.sector.trim(),
        website: form.website.trim() || null,
        competitors,
      })
      setBusiness(newBusiness)
      setPhase('suggesting')

      const result = await api.suggestQuestions(newBusiness.id)
      // Inicializar estado de selección: todas seleccionadas por defecto
      const initialSelection = {}
      for (const { category, questions } of result.suggestions) {
        initialSelection[category] = questions.map(prompt => ({
          prompt,
          selected: true,
          editing: false,
        }))
      }
      setSuggestions(result.suggestions)
      setSelection(initialSelection)
      setPhase('selecting')
    } catch (err) {
      setErrorMsg(err.message)
      setPhase('error')
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Helpers de selección ── */
  const toggleQuestion = (cat, idx) => {
    setSelection(prev => {
      const copy = { ...prev, [cat]: [...prev[cat]] }
      copy[cat][idx] = { ...copy[cat][idx], selected: !copy[cat][idx].selected }
      return copy
    })
  }

  const updatePrompt = (cat, idx, val) => {
    setSelection(prev => {
      const copy = { ...prev, [cat]: [...prev[cat]] }
      copy[cat][idx] = { ...copy[cat][idx], prompt: val }
      return copy
    })
  }

  const setEditing = (cat, idx, val) => {
    setSelection(prev => {
      const copy = { ...prev, [cat]: [...prev[cat]] }
      copy[cat][idx] = { ...copy[cat][idx], editing: val }
      return copy
    })
  }

  const addQuestion = (cat) => {
    setSelection(prev => ({
      ...prev,
      [cat]: [...(prev[cat] || []), { prompt: '', selected: true, editing: true }],
    }))
  }

  const removeQuestion = (cat, idx) => {
    setSelection(prev => {
      const copy = { ...prev, [cat]: prev[cat].filter((_, i) => i !== idx) }
      return copy
    })
  }

  const selectAll = (val) => {
    setSelection(prev => {
      const copy = {}
      for (const cat in prev) {
        copy[cat] = prev[cat].map(q => ({ ...q, selected: val }))
      }
      return copy
    })
  }

  const selectedQuestions = Object.entries(selection).flatMap(([cat, qs]) =>
    qs.filter(q => q.selected && q.prompt.trim()).map(q => ({ category: cat, prompt: q.prompt.trim() }))
  )

  /* ── Paso 2: Lanzar análisis con preguntas seleccionadas ── */
  const handleLaunchAnalysis = async () => {
    if (selectedQuestions.length === 0) return
    setSubmitting(true)
    try {
      const analysis = await api.createAnalysis(business.id, selectedQuestions)

      // Guardar schedule si está habilitado (en paralelo, no bloqueante)
      if (scheduleEnabled && scheduleHours > 0) {
        api.createSchedule(business.id, selectedQuestions, scheduleHours).catch(() => {})
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

  /* ════════════════════════════════════════════════════════
     RENDER POR FASE
  ════════════════════════════════════════════════════════ */

  /* ── Error ── */
  if (phase === 'error') {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Ocurrió un error</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">{errorMsg}</p>
        <button
          onClick={() => { setPhase('form'); setSubmitting(false); setBusiness(null) }}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700"
        >
          Intentar de nuevo
        </button>
      </div>
    )
  }

  /* ── Suggesting (IA generando preguntas) ── */
  if (phase === 'suggesting') {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">Generando preguntas personalizadas</h2>
        <p className="text-gray-400 dark:text-gray-500 text-sm">
          La IA está creando preguntas específicas para <strong className="text-gray-600 dark:text-gray-300">{business?.name}</strong>
          {' '}en el sector <strong className="text-gray-600 dark:text-gray-300">{form.sector}</strong>…
        </p>
        <div className="mt-8 flex justify-center gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  /* ── Progress (análisis en curso) ── */
  if (phase === 'progress') {
    const currentIdx = PROGRESS_STEPS.findIndex(s => s.key === currentStatus)
    return (
      <div className="max-w-lg mx-auto py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Analizando tu negocio</h2>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
            Enviamos {selectedQuestions.length} preguntas a ChatGPT y Gemini. Tardamos 1-2 minutos.
          </p>
        </div>
        <div className="space-y-3">
          {PROGRESS_STEPS.map((step, i) => {
            const done   = i < currentIdx
            const active = i === currentIdx
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
                  {done ? '✓' : active
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : i + 1}
                </div>
                <span className={`text-sm font-medium ${
                  done   ? 'text-emerald-700 dark:text-emerald-300'
                  : active ? 'text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-400 dark:text-gray-500'
                }`}>{step.label}</span>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-6">No cierres esta ventana.</p>
      </div>
    )
  }

  /* ── Selecting (revisar y seleccionar preguntas) ── */
  if (phase === 'selecting') {
    const totalSelected = selectedQuestions.length
    const totalAvailable = Object.values(selection).reduce((acc, qs) => acc + qs.length, 0)

    return (
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 mb-1">
            <span>Nuevo análisis</span>
            <span>/</span>
            <span className="text-gray-700 dark:text-gray-200 font-medium">{business?.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Revisá las preguntas sugeridas</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            La IA generó <strong>{totalAvailable}</strong> preguntas personalizadas para tu negocio.
            Seleccioná las que querés analizar, editá o agregá nuevas.
          </p>
        </div>

        {/* Barra de acción superior */}
        <div className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-5 py-3 mb-5 shadow-sm flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-bold text-indigo-600 dark:text-indigo-400 text-base">{totalSelected}</span>
              <span className="text-gray-400 dark:text-gray-500"> / {totalAvailable} seleccionadas</span>
            </span>
            <div className="flex gap-2">
              <button onClick={() => selectAll(true)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                Seleccionar todas
              </button>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <button onClick={() => selectAll(false)}
                className="text-xs text-gray-400 dark:text-gray-500 hover:underline">
                Deseleccionar todas
              </button>
            </div>
          </div>
          <button
            onClick={handleLaunchAnalysis}
            disabled={totalSelected === 0 || submitting}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {submitting ? 'Iniciando...' : `Lanzar análisis con ${totalSelected} preguntas →`}
          </button>
        </div>

        {/* Schedule */}
        <ScheduleSelector
          enabled={scheduleEnabled}
          onToggle={() => setScheduleEnabled(v => !v)}
          intervalHours={scheduleHours}
          onIntervalChange={setScheduleHours}
        />

        {/* Categorías con preguntas */}
        <div className="space-y-4 mt-2">
          {Object.entries(selection).map(([cat, questions]) => {
            const colors = CATEGORY_COLORS[cat] || CATEGORY_COLORS.conocimiento
            const selectedInCat = questions.filter(q => q.selected && q.prompt.trim()).length
            return (
              <div key={cat} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                {/* Cabecera de categoría */}
                <div className={`flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800 ${colors.bg}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                    <span className={`text-sm font-semibold ${colors.text}`}>
                      {CATEGORY_LABELS[cat] ?? cat}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-normal ml-1">
                      {selectedInCat}/{questions.length}
                    </span>
                  </div>
                  <button
                    onClick={() => addQuestion(cat)}
                    className={`text-xs font-medium ${colors.text} hover:opacity-70 flex items-center gap-1`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar
                  </button>
                </div>

                {/* Lista de preguntas */}
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {questions.map((q, idx) => (
                    <QuestionRow
                      key={idx}
                      question={q}
                      colors={colors}
                      onToggle={() => toggleQuestion(cat, idx)}
                      onEdit={(val) => updatePrompt(cat, idx, val)}
                      onStartEdit={() => setEditing(cat, idx, true)}
                      onStopEdit={() => setEditing(cat, idx, false)}
                      onRemove={() => removeQuestion(cat, idx)}
                    />
                  ))}
                  {questions.length === 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic px-5 py-4">
                      No hay preguntas. Usá "+ Agregar" para crear una.
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Botón inferior */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleLaunchAnalysis}
            disabled={totalSelected === 0 || submitting}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {submitting ? 'Iniciando...' : `Lanzar análisis con ${totalSelected} preguntas →`}
          </button>
        </div>
      </div>
    )
  }

  /* ── Form (paso inicial) ── */
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Nuevo análisis</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Completá los datos de tu negocio. La IA generará preguntas personalizadas que podrás
          revisar antes de lanzar el análisis.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Datos principales */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-sm uppercase tracking-wide">Datos del negocio</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nombre del negocio *" value={form.name} onChange={setField('name')}
              placeholder="Ej: Clínica Dental Bilbao" required />
            <Field label="Ciudad / Zona *" value={form.city} onChange={setField('city')}
              placeholder="Ej: Bilbao, Getxo" required />
          </div>
          <Field label="Sector / Rubro *" value={form.sector} onChange={setField('sector')}
            placeholder="Ej: Clínica dental / Odontología" required />
          <Field label="Sitio web (opcional)" value={form.website} onChange={setField('website')}
            placeholder="https://tusitio.com" type="url" />
        </div>

        {/* Competidores */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-sm uppercase tracking-wide">Competidores</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Mejora las preguntas comparativas.</p>
            </div>
            <button type="button" onClick={addCompetitor}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium">
              + Agregar
            </button>
          </div>
          {form.competitors.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input type="text" value={c} onChange={e => setCompetitor(i, e.target.value)}
                placeholder={`Competidor ${i + 1}`}
                className="flex-1 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-colors" />
              {form.competitors.length > 1 && (
                <button type="button" onClick={() => removeCompetitor(i)}
                  className="text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors px-2 text-xl leading-none">×</button>
              )}
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl p-4 flex gap-3">
          <div className="text-indigo-500 mt-0.5 flex-shrink-0">ℹ️</div>
          <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
            Primero la IA genera <strong>preguntas personalizadas</strong> para tu sector y zona.
            Luego podés <strong>seleccionar, editar o agregar</strong> las que quieras antes de lanzar el análisis.
          </p>
        </div>

        <button type="submit" disabled={submitting}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3.5 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
          {submitting ? 'Creando negocio...' : 'Generar preguntas con IA →'}
        </button>
      </form>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   SUB-COMPONENTES
══════════════════════════════════════════════════════════ */

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
    <div className={`flex items-start gap-3 px-5 py-3.5 transition-colors ${
      question.selected ? '' : 'opacity-50'
    }`}>
      {/* Checkbox */}
      <button
        type="button"
        onClick={onToggle}
        className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
          question.selected
            ? `${colors.dot} border-transparent`
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
        }`}
      >
        {question.selected && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Texto / Input */}
      <div className="flex-1 min-w-0">
        {question.editing ? (
          <input
            ref={inputRef}
            type="text"
            value={question.prompt}
            onChange={e => onEdit(e.target.value)}
            onBlur={onStopEdit}
            onKeyDown={e => { if (e.key === 'Enter') onStopEdit() }}
            className="w-full text-sm text-gray-800 dark:text-gray-200 border-b-2 border-indigo-400 outline-none bg-transparent pb-0.5"
            placeholder="Escribí la pregunta…"
          />
        ) : (
          <p
            onClick={onStartEdit}
            className="text-sm text-gray-700 dark:text-gray-300 cursor-text hover:text-gray-900 dark:hover:text-gray-100 leading-relaxed"
            title="Clic para editar"
          >
            {question.prompt || <span className="italic text-gray-400 dark:text-gray-500">Pregunta vacía — clic para editar</span>}
          </p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
        {!question.editing && (
          <button onClick={onStartEdit} title="Editar"
            className="p-1 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
        <button onClick={onRemove} title="Eliminar"
          className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, required, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-colors"
      />
    </div>
  )
}
