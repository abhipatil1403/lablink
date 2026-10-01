const key = 'lablink-token'
export const token = () => sessionStorage.getItem(key)
function changed() { window.dispatchEvent(new Event('lablink-auth-change')) }
export function saveToken(value) { sessionStorage.setItem(key,value); changed() }
export function clearToken() { sessionStorage.removeItem(key); localStorage.removeItem(key); changed() }
