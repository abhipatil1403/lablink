import { apiRequest } from './api'

export const createSession = experimentId => apiRequest('/api/sessions', { method: 'POST', body: JSON.stringify({ experimentId }) })
export const getSession = id => apiRequest(`/api/sessions/${encodeURIComponent(id)}`)
export const submitSession = (id, result) => apiRequest(`/api/sessions/${encodeURIComponent(id)}/submit`, { method: 'POST', body: JSON.stringify({ result }) })
export const listSubmissions = () => apiRequest('/api/submissions')
export const getSubmission = id => apiRequest(`/api/submissions/${encodeURIComponent(id)}`)
