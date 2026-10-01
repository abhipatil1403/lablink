const key = 'lablink-token'
export const token = () => localStorage.getItem(key)
export const saveToken = value => localStorage.setItem(key, value)
export const clearToken = () => localStorage.removeItem(key)
