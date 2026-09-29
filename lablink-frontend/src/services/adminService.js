import { apiRequest } from './api'

export const adminDashboard = () => apiRequest('/api/admin/dashboard')
export const adminUsers = () => apiRequest('/api/admin/users')
export const setUserStatus = (uid, status) => apiRequest(`/api/admin/users/${encodeURIComponent(uid)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
export const setUserRole = (uid, role) => apiRequest(`/api/admin/users/${encodeURIComponent(uid)}/role`, { method: 'PATCH', body: JSON.stringify({ role }) })
export const adminExperiments = () => apiRequest('/api/admin/experiments')
export const setAdminExperimentStatus = (id, status) => apiRequest(`/api/admin/experiments/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
export const adminServers = () => apiRequest('/api/admin/servers')
