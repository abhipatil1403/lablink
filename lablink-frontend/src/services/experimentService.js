import {apiRequest} from './api'
export const listExperiments=()=>apiRequest('/api/assignments')
export const getExperiment=id=>apiRequest('/api/assignments/'+encodeURIComponent(id))
