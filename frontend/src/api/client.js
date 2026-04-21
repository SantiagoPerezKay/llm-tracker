// Usa URLs relativas: Vite proxy en dev, nginx proxy en Docker
async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  if (res.status === 204) return null

  const data = await res.json().catch(() => ({ detail: res.statusText }))

  if (!res.ok) {
    throw new Error(data.detail || `Error ${res.status}`)
  }

  return data
}

export const api = {
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

  // ── Analyses ──────────────────────────────────────────
  createAnalysis: (businessId) =>
    request('/api/analyses', {
      method: 'POST',
      body: JSON.stringify({ business_id: businessId }),
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
}
