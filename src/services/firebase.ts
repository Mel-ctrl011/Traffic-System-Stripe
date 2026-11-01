
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCcj7eBah4tE30icEb3lXgLOCHK6LAvqg8",
  authDomain: "schoolprojcet.firebaseapp.com",
  projectId: "schoolprojcet",
  storageBucket: "schoolprojcet.firebasestorage.app",
  messagingSenderId: "161894342641",
  appId: "1:161894342641:web:5356bc6874dda4ecc36e50",
  measurementId: "G-RYSBWN8EGJ",
};

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);

/* Cloud Functions for card payments. Region must match functions/src/index.ts */
export const functions = getFunctions(app, "us-central1");
