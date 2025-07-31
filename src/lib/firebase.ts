import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Configure auth to use browser persistence and avoid using Google APIs
(async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    console.error("Error setting auth persistence:", error);
  }
})();

// Use local emulators in development
if (import.meta.env.DEV) {
  // Uncomment these lines if you're using Firebase emulators
  // connectAuthEmulator(auth, "http://localhost:9099");
  // connectFirestoreEmulator(db, "localhost", 8080);
}

const db = getFirestore(app);

export { app, auth, db };
