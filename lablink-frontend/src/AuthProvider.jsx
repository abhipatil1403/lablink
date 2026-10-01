import { useCallback, useEffect, useState } from 'react'
import { getMyProfile } from './services/authService'
import { token } from './services/sessionAuth'
import { AuthContext } from './authContext'
export function AuthProvider({ children }) { const [profile,setProfile]=useState(null); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const refreshProfile=useCallback(async()=>{try{const p=await getMyProfile();setProfile(p);setError('');return p}catch(e){setProfile(null);setError(e.message);throw e}},[]); useEffect(()=>{if(token())refreshProfile().catch(()=>{}).finally(()=>setLoading(false));else setLoading(false)},[refreshProfile]); return <AuthContext.Provider value={{user:profile,profile,loading,error,refreshProfile}}>{children}</AuthContext.Provider> }
