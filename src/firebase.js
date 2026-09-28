import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBXPskQPKEa39pBVtGnATtG3oYf2UyKPks",
  authDomain: "platinum-fitness-gym.firebaseapp.com",
  projectId: "platinum-fitness-gym",
  storageBucket: "platinum-fitness-gym.firebasestorage.app",
  messagingSenderId: "820796652011",
  appId: "1:820796652011:web:47fe348f353d32830801ae"
}

export const firebaseReady = Object.values(firebaseConfig).every(Boolean)

let auth = null
let db = null
if (firebaseReady) {
  const app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
}

export { auth, db }
