const TOKEN_KEY = 'llm_tracker_token'

function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

// Usa URLs relativas: Vite proxy en dev, nginx proxy en Docker
async function request(path, options = {}) {
  const token = getToken()

  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })

  // Token expirado o inválido → redirigir a login
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem('llm_tracker_user')
    window.location.href = '/login'
    return
  }

  if (res.status === 204) return null

  const data = await res.json().catch(() => ({ detail: res.statusText }))

  if (!res.ok) {
    throw new Error(data.detail || `Error ${res.status}`)
  }

  return data
}

export const api = {
  // ── Auth ──────────────────────────────────────────────
  login: (username, password) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  // ── Businesses ────────────────────────────────────────
  getBusinesses: () =>
    request('/api/businesses'),

  createBusiness: (data) =>
    request('/api/businesses', { method: 'POST', body: JSON.stringify(data) }),

  getBusiness: (id) =>
    request(`/api/businesses/${id}`),

  getBusinessHistory: (id) =>
    request(`/api/businesses/${id}/history`),

  deleteBusiness: (id) =>
    request(`/api/businesses/${id}`, { method: 'DELETE' }),

  // ── Questions ─────────────────────────────────────────
  suggestQuestions: (businessId) =>
    request('/api/questions/suggest', {
      method: 'POST',
      body: JSON.stringify({ business_id: businessId }),
    }),

  // ── Analyses ──────────────────────────────────────────
  // questions: array de { category, prompt } — si se omite, la IA los genera
  createAnalysis: (businessId, questions = null) =>
    request('/api/analyses', {
      method: 'POST',
      body: JSON.stringify({ business_id: businessId, questions }),
    }),

  getAnalysisStatus: (id) =>
    request(`/api/analyses/${id}/status`),

  getAnalysis: (id) =>
    request(`/api/analyses/${id}`),

  getAnalysisMetrics: (id) =>
    request(`/api/analyses/${id}/metrics`),

  getAnalysisResponses: (id) =>
    request(`/api/analyses/${id}/responses`),

  getAnalysisCompare: (id) =>
    request(`/api/analyses/${id}/compare`),

  // ── Schedules ─────────────────────────────────────────
  // Crea o reemplaza el schedule de un negocio
  createSchedule: (businessId, questions, intervalHours) =>
    request('/api/schedules', {
      method: 'POST',
      body: JSON.stringify({
        business_id: businessId,
        questions,
        interval_hours: intervalHours,
      }),
    }),

  getScheduleForBusiness: (businessId) =>
    request(`/api/schedules/business/${businessId}`),

  listSchedules: () =>
    request('/api/schedules'),

  updateSchedule: (scheduleId, data) =>
    request(`/api/schedules/${scheduleId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteSchedule: (scheduleId) =>
    request(`/api/schedules/${scheduleId}`, { method: 'DELETE' }),
}
