
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// REMPLACEZ CES VALEURS PAR CELLES DE VOTRE CONSOLE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyA1fBjKkNhCpoBroBC4d8agQuGIZsCS1v4",
  authDomain: "reviz-ia.firebaseapp.com",
  projectId: "reviz-ia",
  storageBucket: "reviz-ia.firebasestorage.app",
  messagingSenderId: "56976039928",
  appId: "1:56976039928:web:513031bca009e45f5b400d",
  measurementId: "G-1HQY41HN1V"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
