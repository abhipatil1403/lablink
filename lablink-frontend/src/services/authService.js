import { clearToken, saveToken, token } from './sessionAuth'

export function getApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const custom = window.localStorage.getItem('lablink_api_url')
    if (custom) return custom.trim().replace(/\/+$/, '')
  }
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.trim().replace(/\/+$/, '')
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || ''
    // Vercel / Netlify static hosting without backend API base configured
    if (host.endsWith('vercel.app') || host.endsWith('netlify.app')) {
      return ''
    }
    if (window.location.port !== '5173' && window.location.origin && !host.includes('localhost')) {
      return window.location.origin.replace(/\/+$/, '')
    }
  }
  return 'http://localhost:8081'
}

export function setCustomApiBaseUrl(url) {
  if (typeof window === 'undefined') return
  if (!url || !url.trim()) {
    window.localStorage.removeItem('lablink_api_url')
  } else {
    window.localStorage.setItem('lablink_api_url', url.trim().replace(/\/+$/, ''))
  }
}

async function parseResponseSafe(response) {
  const text = await response.text().catch(() => '')
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return { rawText: text }
  }
}

async function auth(path, body) {
  const base = getApiBaseUrl()
  if (!base) {
    throw new Error(
      'Backend API is not configured. Please set the VITE_API_BASE_URL environment variable in your Vercel project settings, or configure the server URL below.'
    )
  }

  let response
  try {
    response = await fetch(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch {
    throw new Error(`Cannot connect to backend server at ${base}. Please ensure the backend is running and CORS is configured.`)
  }

  const data = await parseResponseSafe(response)

  if (!response.ok) {
    if (response.status === 405 || response.status === 404) {
      throw new Error(`The backend endpoint returned HTTP ${response.status} at ${base}${path}. Ensure your backend server is running and VITE_API_BASE_URL points to it.`)
    }
    const message = data?.message || (typeof data?.rawText === 'string' && data.rawText.length < 120 ? data.rawText : null)
    throw new Error(message || `Authentication failed (${response.status})`)
  }

  if (!data?.token) {
    throw new Error('Authentication response was missing a valid session token.')
  }

  saveToken(data.token)
  return data
}

export const login = (email, password) => auth('/api/auth/login', { email, password })
export const register = (name, email, password) => auth('/api/auth/register', { name, email, password })

export async function logout() {
  const base = getApiBaseUrl()
  const accessToken = token()
  try {
    if (accessToken && base) {
      await fetch(base + '/api/auth/logout', {
        method: 'POST',
        signal: AbortSignal.timeout(3000),
        headers: { Authorization: 'Bearer ' + accessToken }
      }).catch(() => {})
    }
  } finally {
    if (token() === accessToken) clearToken()
  }
}

export async function getMyProfile() {
  const base = getApiBaseUrl()
  const accessToken = token()
  if (!base || !accessToken) return null

  let response
  try {
    response = await fetch(base + '/api/auth/me', {
      headers: { Authorization: 'Bearer ' + accessToken }
    })
  } catch {
    throw new Error('Unable to connect to authentication server.')
  }

  const data = await parseResponseSafe(response)

  if (!response.ok) {
    if (response.status === 401) clearToken()
    const message = data?.message || (typeof data?.rawText === 'string' && data.rawText.length < 120 ? data.rawText : null)
    throw new Error(message || 'Session expired')
  }

  return data
}

export const friendlyAuthError = error => error?.message || 'Authentication failed'
