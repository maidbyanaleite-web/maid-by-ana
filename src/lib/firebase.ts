import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAM4K96HLPce8iRkcVZVWc3uS_T5c0gTX8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "my-ana-projet.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "my-ana-projet",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "my-ana-projet.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "207961899021",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:207961899021:web:148d6c819830f098f61544"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
