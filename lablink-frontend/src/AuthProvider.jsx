import { useCallback, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './services/firebase'
import { getMyProfile } from './services/authService'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(Boolean(auth))
  const [error, setError] = useState('')

  const refreshProfile = useCallback(async () => {
    const data = await getMyProfile()
    setProfile(data)
    setError('')
    return data
  }, [])

  useEffect(() => {
    if (!auth) return undefined
    return onAuthStateChanged(auth, async nextUser => {
      setUser(nextUser)
      setProfile(null)
      setError('')
      if (nextUser) {
        try { await refreshProfile() } catch (failure) { setError(failure.message) }
      }
      setLoading(false)
    })
  }, [refreshProfile])

  return <AuthContext.Provider value={{ user, profile, loading, error, refreshProfile }}>{children}</AuthContext.Provider>
}
