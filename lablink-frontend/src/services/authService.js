import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth'
import { auth } from './firebase'
import { apiRequest } from './api'

function requireAuth() {
  if (!auth) throw new Error('Firebase is not configured. Set the VITE_FIREBASE values in .env.')
  return auth
}

export async function login(email, password) {
  return signInWithEmailAndPassword(requireAuth(), email, password)
}

export async function register(name, email, password) {
  const credentials = await createUserWithEmailAndPassword(requireAuth(), email, password)
  await updateProfile(credentials.user, { displayName: name })
  await apiRequest('/api/users/register', { method: 'POST', body: JSON.stringify({ name }) })
  return credentials
}

export async function logout() {
  return signOut(requireAuth())
}

export function getMyProfile() {
  return apiRequest('/api/users/me')
}

export function friendlyAuthError(error) {
  const messages = {
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/user-not-found': 'No account found for this email.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password must be at least six characters.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/network-request-failed': 'Unable to connect to Firebase Authentication.',
  }
  return messages[error.code] || error.message || 'Authentication failed.'
}
