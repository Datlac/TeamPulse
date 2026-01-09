import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCjqy1rVTNc4F6donZNfw8333og_g8qdVA",
  authDomain: "teampulse-81443.firebaseapp.com",
  projectId: "teampulse-81443",
  storageBucket: "teampulse-81443.firebasestorage.app",
  messagingSenderId: "347554357556",
  appId: "1:347554357556:web:61b73f9ee09a6b2d0b4561",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
