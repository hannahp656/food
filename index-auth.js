// index-auth.js
import { auth, provider } from "./firebase-init.js";
import { loadUserData, saveUserData } from "./firebase-sync.js";
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const userIcon = document.querySelector(".user-icon");
  const signInText = document.querySelector(".sign-in-text");

  // If user button exists, add click handler
  if (userIcon) {
    userIcon.addEventListener("click", async () => {
      if (auth.currentUser) {
        await signOut(auth);
      } else {
        try {
          await signInWithPopup(auth, provider);
        } catch (err) {
          console.error("Sign-in failed:", err);
        }
      }
    });
  }

  // Always listen to auth state changes, even on pages without a user button
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      window.currentUserUID = user.uid;

      // Update UI if button exists
      if (userIcon && signInText) {
        userIcon.classList.add("signed-in");
        signInText.textContent = "Account";
      }

      // Load cloud data into localStorage
      await loadUserData(user.uid);

      // Push local changes to cloud
      await saveUserData(user.uid);

    } else {
      window.currentUserUID = null;

      if (userIcon && signInText) {
        userIcon.classList.remove("signed-in");
        signInText.textContent = "Sign In";
      }
    }
  });
});


