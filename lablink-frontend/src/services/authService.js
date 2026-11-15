import { clearToken, saveToken, token } from './sessionAuth'
import { handleMockApiRequest } from './mockBackend'

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
    if (host.endsWith('vercel.app') || host.endsWith('netlify.app')) {
      return ''
    }
    if (window.location.port !== '5173' && window.location.origin && !host.includes('localhost')) {
      return window.location.origin.replace(/\/+$/, '')
    }
  }
  return ''
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
    const data = await handleMockApiRequest(path, {
      method: 'POST',
      body: JSON.stringify(body)
    })
    saveToken(data.token)
    return data
  }

  let response
  try {
    response = await fetch(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } catch {
    const data = await handleMockApiRequest(path, {
      method: 'POST',
      body: JSON.stringify(body)
    })
    saveToken(data.token)
    return data
  }

  const data = await parseResponseSafe(response)

  if (!response.ok) {
    if (response.status === 405 || response.status === 404) {
      const mockData = await handleMockApiRequest(path, {
        method: 'POST',
        body: JSON.stringify(body)
      })
      saveToken(mockData.token)
      return mockData
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
    if (base && accessToken) {
      await fetch(base + '/api/auth/logout', {
        method: 'POST',
        signal: AbortSignal.timeout(3000),
        headers: { Authorization: 'Bearer ' + accessToken }
      }).catch(() => {})
    } else {
      await handleMockApiRequest('/api/auth/logout')
    }
  } finally {
    if (token() === accessToken) clearToken()
  }
}

export async function getMyProfile() {
  const base = getApiBaseUrl()
  const accessToken = token()
  if (!accessToken) return null

  if (!base) {
    return handleMockApiRequest('/api/auth/me')
  }

  let response
  try {
    response = await fetch(base + '/api/auth/me', {
      headers: { Authorization: 'Bearer ' + accessToken }
    })
  } catch {
    return handleMockApiRequest('/api/auth/me')
  }

  const data = await parseResponseSafe(response)

  if (!response.ok) {
    if (response.status === 401) clearToken()
    return handleMockApiRequest('/api/auth/me')
  }

  return data
}

export const friendlyAuthError = error => error?.message || 'Authentication failed'
