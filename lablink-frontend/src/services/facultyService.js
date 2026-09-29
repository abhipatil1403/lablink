import { apiRequest } from './api'

export const facultyDashboard = () => apiRequest('/api/faculty/dashboard')
export const facultySessions = query => apiRequest(`/api/faculty/sessions${query ? `?${query}` : ''}`)
export const facultySubmissions = () => apiRequest('/api/faculty/submissions')
export const facultySubmission = id => apiRequest(`/api/faculty/submissions/${encodeURIComponent(id)}`)
export const reviewSubmission = (id, grade, feedback) => apiRequest(`/api/faculty/submissions/${encodeURIComponent(id)}/review`, { method: 'PATCH', body: JSON.stringify({ grade: Number(grade), feedback }) })
export const createExperiment = experiment => apiRequest('/api/experiments', { method: 'POST', body: JSON.stringify(experiment) })
export const updateExperiment = (id, experiment) => apiRequest(`/api/experiments/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(experiment) })
export const setExperimentStatus = (id, status) => apiRequest(`/api/experiments/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
