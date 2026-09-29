import { useCallback, useEffect, useRef, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './services/firebase'
import { getMyProfile } from './services/authService'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(Boolean(auth))
  const [error, setError] = useState('')
  const profileRequest = useRef(0)

  const refreshProfile = useCallback(async () => {
    const requestId = ++profileRequest.current
    try {
      const data = await getMyProfile()
      if (requestId === profileRequest.current) { setProfile(data); setError('') }
      return data
    } catch (failure) {
      if (requestId === profileRequest.current) setError(failure.message)
      throw failure
    }
  }, [])

  useEffect(() => {
    if (!auth) return undefined
    return onAuthStateChanged(auth, async nextUser => {
      profileRequest.current++
      setUser(nextUser)
      setProfile(null)
      setError('')
      if (nextUser) {
        try { await refreshProfile() } catch { /* Error is shown by refreshProfile. */ }
      }
      setLoading(false)
    })
  }, [refreshProfile])

  return <AuthContext.Provider value={{ user, profile, loading, error, refreshProfile }}>{children}</AuthContext.Provider>
}
