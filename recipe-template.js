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
  const units = ["cup","cups","tbsp","tsp","teaspoon","teaspoons","tablespoon","tablespoons","g","kg","ml","l","oz","lb","pound","pounds","clove","cloves","slice","slices","can","cans","package","packages","breast","breasts"];
  const descriptors = ["of","chopped","minced","diced","sliced","grated","shredded","fresh","ground","finely"];
  const amountWords = ["pinch","handful","dash","slice","clove","teaspoon","tablespoon"];

  function looksLikeAmount(word) {
    return /^\d+([\/\.]\d+)?$/.test(word) || amountWords.includes(word.toLowerCase());
  }

  ingList.innerHTML = data.ingredients.map(line => {
    // Split trailing notes after comma
    let [beforeComma, afterComma] = line.split(/,(.+)/); 
    beforeComma = beforeComma.trim();
    afterComma = afterComma ? afterComma.trim() : "";

    const parts = beforeComma.split(" ");
    let amount = "";
    let unit = "";
    const leadingDescriptors = [];

    // Detect amount
    if (parts.length && looksLikeAmount(parts[0])) amount = parts.shift();

    // Detect unit
    if (parts.length && units.includes(parts[0].toLowerCase())) unit = parts.shift();

    // Separate descriptors anywhere in the remaining parts
    const ingredientWords = [];
    parts.forEach(word => {
      if (descriptors.includes(word.toLowerCase())) {
        leadingDescriptors.push(word);
      } else {
        ingredientWords.push(word);
      }
    });

    const ingredient = ingredientWords.join(" ");

    // Handle trailing descriptors after the comma (keep them outside the span)
    let trailing = "";
    if (afterComma) {
      // Optionally, you could split afterComma and filter descriptors if needed
      trailing = ", " + afterComma.trim();
    }

    // Build HTML
    let html = `<li>`;
    if (amount) html += amount + " ";
    if (unit) html += unit + " ";
    if (leadingDescriptors.length) html += leadingDescriptors.join(" ") + " ";
    if (ingredient) html += `<span class="ingredient-tag">${ingredient}</span>`;
    html += trailing;
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
