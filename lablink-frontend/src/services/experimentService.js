import { apiRequest } from './api'

export const listExperiments = () => apiRequest('/api/experiments')
export const getExperiment = id => apiRequest(`/api/experiments/${encodeURIComponent(id)}`)
