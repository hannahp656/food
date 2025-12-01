// -------------------------------
// firebase-sync.js
// Centralized sync for:
// mealPlan, shoppingListData, savedRecipes
// -------------------------------

import { db } from "./firebase-init.js"; 
import {
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Which keys we sync:
const SYNC_KEYS = ["mealPlan", "savedRecipes", "shoppingListData"];

// --------------------------------------------------
// 1. LOAD DATA FROM FIRESTORE ON LOGIN
// --------------------------------------------------
export async function loadUserData(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    console.log("No cloud data yet — using local data.");
    return null;
  }

  const cloud = snap.data();

  // Overwrite LOCAL data with CLOUD data
  SYNC_KEYS.forEach(key => {
    if (cloud[key] !== undefined) {
      localStorage.setItem(key, JSON.stringify(cloud[key]));
    }
  });

  console.log("Cloud data loaded and merged into localStorage:", cloud);
  return cloud;
}

// --------------------------------------------------
// 2. SAVE DATA TO FIRESTORE WHEN LOCAL CHANGES
// --------------------------------------------------
export async function saveUserData(uid) {
  const ref = doc(db, "users", uid);

  let dataToSave = {};

  SYNC_KEYS.forEach(key => {
    const val = localStorage.getItem(key);
    if (val !== null) {
      try {
        dataToSave[key] = JSON.parse(val);
      } catch {
        dataToSave[key] = val;
      }
    }
  });

  await setDoc(ref, dataToSave, { merge: true });

  console.log("Saved to cloud:", dataToSave);
}

// --------------------------------------------------
// 3. WATCH LOCAL CHANGES & AUTO-SAVE
// --------------------------------------------------
window.addEventListener("storage", () => {
  if (!window.currentUserUID) return;
  saveUserData(window.currentUserUID); 
});

// Allow manual saves from any file
export function manualSync() {
  if (window.currentUserUID) saveUserData(window.currentUserUID);
}
