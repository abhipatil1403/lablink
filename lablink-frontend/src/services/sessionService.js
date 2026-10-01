import {apiRequest} from './api'
export const createSession=assignmentId=>apiRequest('/api/sessions',{method:'POST',body:JSON.stringify({assignmentId})})
export const getSession=id=>apiRequest('/api/sessions/'+encodeURIComponent(id))
export const listAttempts=()=>apiRequest('/api/sessions')
export const submitSession=id=>apiRequest('/api/sessions/'+encodeURIComponent(id)+'/submit',{method:'POST'})
export const listSubmissions=()=>apiRequest('/api/submissions')
export const getSubmission=id=>apiRequest('/api/submissions/'+encodeURIComponent(id))
