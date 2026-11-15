import { clearToken, token } from './sessionAuth'
import { getApiBaseUrl } from './authService'

export async function apiRequest(path, options = {}) {
  const accessToken = token()
  if (!accessToken) throw new Error('Please log in to continue.')

  const baseUrl = getApiBaseUrl()
  if (!baseUrl) {
    throw new Error('Backend API URL is not configured. Please set VITE_API_BASE_URL in your Vercel project settings.')
  }

  let response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error(`Unable to connect to LabLink backend services at ${baseUrl}.`)
  }

  if (response.status === 204) return null

  const text = await response.text().catch(() => '')
  let body = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { rawText: text }
    }
  }

  if (!response.ok) {
    if (response.status === 401) clearToken()
    const message = body?.message || (typeof body?.rawText === 'string' && body.rawText.length < 120 ? body.rawText : null)
    throw new Error(message || `Request failed (${response.status})`)
  }

  return body
}
