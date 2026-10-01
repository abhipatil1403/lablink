import {clearToken,saveToken,token} from './sessionAuth'
const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
async function auth(path,body) {
  const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  const data=await response.json()
  if(!response.ok)throw new Error(data.message || 'Authentication failed')
  saveToken(data.token)
  return data
}
export const login=(email,password)=>auth('/api/auth/login',{email,password})
export const register=(name,email,password)=>auth('/api/auth/register',{name,email,password})
export async function logout() {
  const accessToken=token()
  try {
    if(accessToken)await fetch(base+'/api/auth/logout',{method:'POST',signal:AbortSignal.timeout(3000),headers:{Authorization:'Bearer '+accessToken}}).catch(()=>{})
  } finally { if(token()===accessToken)clearToken() }
}
export async function getMyProfile() {
  const response=await fetch(base+'/api/auth/me',{headers:{Authorization:'Bearer '+token()}})
  const data=await response.json()
  if(!response.ok){if(response.status===401)clearToken();throw new Error(data.message || 'Session expired')}
  return data
}
export const friendlyAuthError=error=>error.message || 'Authentication failed'
