// firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAvKuWusC_jMg23pB3PGSspHA7qAotb4Hc",
  authDomain: "recipes-372f8.firebaseapp.com",
  projectId: "recipes-372f8",
  storageBucket: "recipes-372f8.firebasestorage.app",
  messagingSenderId: "874512404094",
  appId: "1:874512404094:web:80e7143fbe47417d27d22f"
};

// Initialize
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Google provider
export const provider = new GoogleAuthProvider();
