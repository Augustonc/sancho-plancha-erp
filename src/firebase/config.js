import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAFl5q6u4WYsv60wOJk0-DJp4vtUYUBqgo",
  authDomain: "sancho-plancha.firebaseapp.com",
  projectId: "sancho-plancha",
  storageBucket: "sancho-plancha.firebasestorage.app",
  messagingSenderId: "112778410330",
  appId: "1:112778410330:web:0ddaeb69f8b1f7b7ce5b63"
};
const app = initializeApp(firebaseConfig);

// AGREGAMOS 'export' A ESTAS DOS por que si no da el error de la pantalla en blanco:
export const auth = getAuth(app);
export const db = getFirestore(app);

// Esta línea de appId la dejamos pero
// por ahora no la necesitamos para los roles.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';