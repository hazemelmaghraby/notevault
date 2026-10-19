import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  createUserWithEmailAndPassword, EmailAuthProvider, onAuthStateChanged,
  reauthenticateWithCredential, signInWithEmailAndPassword, signOut, updatePassword, updateProfile,
  type User,
} from 'firebase/auth'
import { configurePersistentAuthSession, firebaseAuth, isFirebaseConfigured, requireFirebase } from '@/firebase/config'

interface AuthContextValue {
  user: User | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  updateDisplayName: (name: string) => Promise<void>
  changeAccountPassword: (current: string, next: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function friendlyAuthError(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  const messages: Record<string, string> = {
    'auth/invalid-credential': 'That email and password combination was not recognized.',
    'auth/user-not-found': 'No account was found for that email address.',
    'auth/wrong-password': 'That password was not recognized.',
    'auth/email-already-in-use': 'An account already exists for this email.',
    'auth/weak-password': 'Choose a stronger password with at least 8 characters.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/too-many-requests': 'There have been too many attempts. Wait a little and try again.',
    'auth/requires-recent-login': 'For your security, sign in again before changing your password.',
    'auth/network-request-failed': 'Firebase could not be reached. Check your connection and try again.',
    'auth/operation-not-allowed': 'Email and password sign-in is not enabled in Firebase Authentication.',
  }
  if (messages[code]) return messages[code]
  return error instanceof Error ? error.message : 'Firebase could not complete that request.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(isFirebaseConfigured)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!firebaseAuth) return
    const auth = firebaseAuth
    let active = true
    let unsubscribe = () => {}
    configurePersistentAuthSession()
      .then(() => {
        if (!active) return
        unsubscribe = onAuthStateChanged(auth, nextUser => {
          setUser(nextUser)
          setLoading(false)
          setError(null)
        }, reason => {
          setError(friendlyAuthError(reason))
          setLoading(false)
        })
      })
      .catch(reason => {
        setError(friendlyAuthError(reason))
        setLoading(false)
      })
    return () => { active = false; unsubscribe() }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null)
    try {
      const { auth } = requireFirebase()
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (reason) {
      const message = friendlyAuthError(reason)
      setError(message)
      throw new Error(message, { cause: reason })
    }
  }, [])

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    setError(null)
    try {
      const { auth } = requireFirebase()
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)
      if (displayName.trim()) await updateProfile(credential.user, { displayName: displayName.trim() })
    } catch (reason) {
      const message = friendlyAuthError(reason)
      setError(message)
      throw new Error(message, { cause: reason })
    }
  }, [])

  const logout = useCallback(async () => {
    const { auth } = requireFirebase()
    await signOut(auth)
  }, [])

  const updateDisplayName = useCallback(async (name: string) => {
    if (!user) throw new Error('Sign in to update your profile.')
    try {
      await updateProfile(user, { displayName: name.trim() })
    } catch (reason) {
      throw new Error(friendlyAuthError(reason), { cause: reason })
    }
  }, [user])

  const changeAccountPassword = useCallback(async (current: string, next: string) => {
    if (!user?.email) throw new Error('This account cannot change its password here.')
    try {
      const credential = EmailAuthProvider.credential(user.email, current)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, next)
    } catch (reason) {
      throw new Error(friendlyAuthError(reason), { cause: reason })
    }
  }, [user])

  const value = useMemo(() => ({ user, loading, error, signIn, register, logout, updateDisplayName, changeAccountPassword }), [
    user, loading, error, signIn, register, logout, updateDisplayName, changeAccountPassword,
  ])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider.')
  return context
}
