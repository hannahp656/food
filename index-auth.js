// index-auth.js
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Elements
const userIcon = document.querySelector(".user-icon");
const signInText = document.querySelector(".sign-in-text");

const auth = getAuth();
const provider = new GoogleAuthProvider();

// Click to sign in/out
userIcon.addEventListener("click", async () => {
  if (auth.currentUser) {
    await signOut(auth);
  } else {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed:", err);
    }
  }
});

// React to auth state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Signed in as:", user.displayName || user.email);
    userIcon.classList.add("signed-in");
    signInText.textContent = "Account";
  } else {
    console.log("Signed out");
    userIcon.classList.remove("signed-in");
    signInText.textContent = "Sign In";
  }
});
