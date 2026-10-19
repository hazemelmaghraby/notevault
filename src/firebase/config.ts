import { getApp, getApps, initializeApp } from 'firebase/app'
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
}

export const isFirebaseConfigured = Boolean(
  config.apiKey && config.authDomain && config.projectId && config.appId,
)

const app = isFirebaseConfigured && typeof window !== 'undefined'
  ? getApps().length > 0 ? getApp() : initializeApp(config)
  : null

export const firebaseAuth = app ? getAuth(app) : null
export const firestore = app ? getFirestore(app) : null

export function requireFirebase() {
  if (!firebaseAuth || !firestore) {
    throw new Error('Firebase is not configured. Add the VITE_FIREBASE settings and restart the app.')
  }
  return { auth: firebaseAuth, db: firestore }
}

export async function configurePersistentAuthSession() {
  const { auth } = requireFirebase()
  await setPersistence(auth, browserLocalPersistence)
}

export const FIREBASE_SETUP_MESSAGE =
  'Firebase is not connected yet. Copy .env.example to .env.local, add your Firebase web app settings, enable Email/Password sign-in, and create the Firestore database.'
