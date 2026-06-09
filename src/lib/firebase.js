import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Replace with your own Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCQ0k8WPUC9Ifib7saD2dVs8jZGv0S-G20",
  authDomain: "qcm-live-class.firebaseapp.com",
  projectId: "qcm-live-class",
  storageBucket: "qcm-live-class.firebasestorage.app",
  messagingSenderId: "146385889892",
  appId: "1:146385889892:web:2fbf6e1c301b537782cd71"
}

export const isFirebaseConfigured = firebaseConfig.apiKey !== "VOTRE_API_KEY"

let app, auth, db

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
}

export { auth, db }

export async function signInAnon() {
  if (!isFirebaseConfigured || !auth) return null
  try {
    const cred = await signInAnonymously(auth)
    return cred.user
  } catch (e) {
    console.error('Firebase auth error:', e)
    return null
  }
}

export function onAuthChange(callback) {
  if (!isFirebaseConfigured || !auth) return () => {}
  return onAuthStateChanged(auth, callback)
}
