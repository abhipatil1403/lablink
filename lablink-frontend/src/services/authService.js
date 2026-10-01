import { clearToken, saveToken, token } from './sessionAuth'
const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
async function auth(path, body) { const r = await fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const d = await r.json(); if (!r.ok) throw new Error(d.message || 'Authentication failed.'); saveToken(d.token); return { user: d.user } }
export const login = (email,password) => auth('/api/auth/login',{email,password})
export const register = (name,email,password) => auth('/api/auth/register',{name,email,password})
export const logout = async () => clearToken()
export async function getMyProfile(){const r=await fetch(`${base}/api/auth/me`,{headers:{Authorization:`Bearer ${token()}`}});const d=await r.json();if(!r.ok)throw new Error(d.message||'Session expired.');return d}
export const friendlyAuthError = e => e.message || 'Authentication failed.'
