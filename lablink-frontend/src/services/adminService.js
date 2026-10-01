import {apiRequest} from './api'
export const adminDashboard=()=>apiRequest('/api/admin/dashboard')
export const adminUsers=query=>apiRequest('/api/admin/users'+(query?'?'+query:''))
export const setUserStatus=(id,status)=>apiRequest('/api/admin/users/'+id+'/status',{method:'PATCH',body:JSON.stringify({status})})
export const createFaculty=body=>apiRequest('/api/admin/faculty',{method:'POST',body:JSON.stringify(body)})
export const adminExperiments=()=>apiRequest('/api/admin/assignments')
export const adminServers=()=>apiRequest('/api/admin/servers')
export const setServerStatus=(id,status)=>apiRequest('/api/admin/servers/'+id+'/status',{method:'PATCH',body:JSON.stringify({status})})
export const adminAudit=()=>apiRequest('/api/admin/audit')
