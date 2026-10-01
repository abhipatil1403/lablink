import {useCallback,useEffect,useState} from 'react'
import {getMyProfile} from './services/authService'
import {token} from './services/sessionAuth'
import {AuthContext} from './authContext'

export function AuthProvider({children}) {
  const [profile,setProfile]=useState(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const refreshProfile=useCallback(async()=>{
    const current=token()
    if(!current){setProfile(null);setError('');return null}
    try {
      const user=await getMyProfile()
      if(token()===current){setProfile(user);setError('')}
      return user
    }catch(failure){if(token()===current){setProfile(null);setError(failure.message)}throw failure}
  },[])
  useEffect(()=>{
    refreshProfile().catch(()=>{}).finally(()=>setLoading(false))
    const change=()=>{if(!token()){setProfile(null);setError('')}}
    window.addEventListener('lablink-auth-change',change)
    return ()=>window.removeEventListener('lablink-auth-change',change)
  },[refreshProfile])
  return <AuthContext.Provider value={{user:profile,profile,loading,error,refreshProfile}}>{children}</AuthContext.Provider>
}
