document.addEventListener("DOMContentLoaded", () => {
  const dataEl = document.getElementById("recipe-data");
  if (!dataEl) return;

  const data = JSON.parse(dataEl.textContent);

  // Set document title dynamically
  document.title = `${data.title} - Hannah's Recipes`;
  
  // Insert title
  const h1 = document.querySelector("header.hero h1");
  if (h1) h1.textContent = data.title;

  // Insert hero image (if your hero has one)
  const heroImg = document.querySelector("header.hero img");
  if (heroImg && data.cover) {
    heroImg.src = data.cover;
    heroImg.alt = data.title;
  }

  const saveBtn = document.getElementById("saveRecipeBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      // Get existing saved recipes
      const saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]");

      // Check if already saved (avoid duplicates)
      if (!saved.some(r => r.link === data.link)) {
        saved.push(data);
        localStorage.setItem("savedRecipes", JSON.stringify(saved));
        alert(`${data.title} added to Saved Recipes!`);
      } else {
        alert(`${data.title} is already in your Saved Recipes.`);
      }
    });
  }
  const videoContainer = document.querySelector('.video-container');

    // Create and insert the video element
    if (data.video) {
        const videoElement = document.createElement('video');
        videoElement.src = data.video;
        videoElement.poster = data.cover;
        videoElement.setAttribute('controls', ''); // Adds playback controls
        videoElement.setAttribute('autoplay', ''); // Autoplays the video
        videoElement.setAttribute('muted', ''); // Mutes the video for autoplay
        videoElement.setAttribute('loop', ''); // Loops the video
        videoElement.setAttribute('playsinline', ''); // Allows playback in iOS without fullscreen
        videoContainer.appendChild(videoElement);
    }

  // Insert tags
  const recipeTags = document.querySelector(".recipe-tags");
if (recipeTags && data.tags) {
  recipeTags.innerHTML = data.tags.map(tag => {
    if (/\bmin\b|\bhour\b/i.test(tag)) {
      return `<span class="chip chip--soft"><i class="fa-regular fa-clock"></i> ${tag}</span>`;
    }
    return `<span class="chip chip--soft">${tag}</span>`;
  }).join("");
}



  // Insert ingredients
const ingList = document.querySelector(".ingredients-list");
if (ingList && data.ingredients) {
  ingList.innerHTML = data.ingredients.map(line => {
    // Split notes after first comma
    let [beforeComma, afterComma] = line.split(/,(.+)/); // splits once at first comma
    beforeComma = beforeComma.trim();
    afterComma = afterComma ? afterComma.trim() : "";

    const parts = beforeComma.split(" ");
    let amount = parts.shift(); // e.g. "1" or "1/2"
    let maybeUnit = "";
    let name = "";

    // If next token is a known unit
    const units = ["cup","cups","tbsp","tsp","teaspoon","teaspoons","tablespoon","tablespoons","g","kg","ml","l","oz","lb","pound","pounds","clove","cloves","slice","slices","can","cans","package","packages","breast","breasts"];
    if (parts.length > 1 && units.includes(parts[0].toLowerCase())) {
      maybeUnit = parts.shift();
    }

    // Everything left before the comma is the ingredient name
    name = parts.join(" ");

    // Build HTML
    let html = `<li>${amount}`;
    if (maybeUnit) html += ` ${maybeUnit}`;
    if (name) html += ` <span class="ingredient-tag">${name}</span>`;
    if (afterComma) html += `, ${afterComma}`;
    html += `</li>`;

    return html;
  }).join("");
}


  // Insert instructions
  const stepsList = document.querySelector(".instructions-list");
  if (stepsList && data.instructions) {
    stepsList.innerHTML = data.instructions
      .map(step => `<li>${step}</li>`)
      .join("");
  }
});
