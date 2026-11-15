import { clearToken, token } from './sessionAuth'
import { getApiBaseUrl } from './authService'
import { handleMockApiRequest } from './mockBackend'

export async function apiRequest(path, options = {}) {
  const accessToken = token()
  if (!accessToken) throw new Error('Please log in to continue.')

  const baseUrl = getApiBaseUrl()
  if (!baseUrl) {
    return handleMockApiRequest(path, options)
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
    return handleMockApiRequest(path, options)
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
    if (response.status === 404 || response.status === 405) {
      return handleMockApiRequest(path, options)
    }
    if (response.status === 401) clearToken()
    const message = body?.message || (typeof body?.rawText === 'string' && body.rawText.length < 120 ? body.rawText : null)
    throw new Error(message || `Request failed (${response.status})`)
  }

  return body
}
