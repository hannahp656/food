import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } 
  from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } 
  from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// YOUR Firebase config goes here ↓↓↓
const firebaseConfig = {
  apiKey: "YOUR_KEY_HERE",
  authDomain: "YOUR_DOMAIN.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "123",
  appId: "YOUR_APP_ID"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
