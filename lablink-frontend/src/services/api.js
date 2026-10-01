import { token } from './sessionAuth'

const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

export async function apiRequest(path, options = {}) {
  const accessToken = token()
  if (!accessToken) throw new Error('Please log in to continue.')
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
    throw new Error('Unable to connect to LabLink services.')
  }
  if (response.status === 204) return null
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.message || `Request failed (${response.status})`)
  return body
}
