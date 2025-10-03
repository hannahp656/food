document.addEventListener("DOMContentLoaded", () => {
  const dataEl = document.getElementById("recipe-data");
  if (!dataEl) return;
  const data = JSON.parse(dataEl.textContent);

  // set document title
  document.title = `${data.title} - Hannah's Recipes`;
  
  // insert title
  const h1 = document.querySelector("header.hero h1");
  if (h1) h1.textContent = data.title;
  // CHECK AND SEE WHAT HAPPENS IF I DELETE THIS - insert hero image (if your hero has one)
  const heroImg = document.querySelector("header.hero img");
  if (heroImg && data.cover) {
    heroImg.src = data.cover;
    heroImg.alt = data.title;
  }
  // setup save button
  const saveBtn = document.getElementById("saveRecipeBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      // get existing saved recipes
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
  // insert tags
  const recipeTags = document.querySelector(".recipe-tags");
  if (recipeTags && data.tags) {
    recipeTags.innerHTML = data.tags.map(tag => {
      if (/\bmin\b|\bhour\b/i.test(tag)) {
        return `<span class="chip chip--soft"><i class="fa-regular fa-clock"></i> ${tag}</span>`;
      }
      return `<span class="chip chip--soft">${tag}</span>`;
    }).join("");
  }

  // insert video if available
  const videoContainer = document.querySelector('.video-container');
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

  // insert ingredients
  const ingredientTags = []; // store actual ingredient phrases
  const ingList = document.querySelector(".ingredients-list");
  if (ingList && data.ingredients) {
    const units = ["cup","cups","tbsp","tsp","teaspoon","teaspoons","tablespoon","tablespoons","g","kg","ml","l","oz","lb","pound","pounds","clove","cloves","slice","slices","can","cans","package","packages","breast","breasts"];
    const descriptors = ["of","chopped","minced","diced","sliced","grated","shredded","fresh","ground","finely"];
    const amountWords = ["pinch","handful","dash","slice","clove","teaspoon","tablespoon"];
    // function to check if a word looks like an amount (number, fraction, or common words)
    function looksLikeAmount(word) {
      return /^\d+([\/\.]\d+)?$/.test(word) || amountWords.includes(word.toLowerCase());
    }
    // parse each ingredient line
    ingList.innerHTML = data.ingredients.map(line => {
      // split trailing notes after comma
      let [beforeComma, afterComma] = line.split(/,(.+)/); 
      beforeComma = beforeComma.trim();
      afterComma = afterComma ? afterComma.trim() : "";
      // split by spaces to analyze parts
      const parts = beforeComma.split(" ");
      let amount = "";
      let unit = "";
      const leadingDescriptors = [];
      // detect amount
      if (parts.length && looksLikeAmount(parts[0])) amount = parts.shift();
      // detect unit
      if (parts.length && units.includes(parts[0].toLowerCase())) unit = parts.shift();
      // separate descriptors anywhere in the remaining parts
      const ingredientWords = [];
      parts.forEach(word => {
        if (descriptors.includes(word.toLowerCase())) {
          leadingDescriptors.push(word);
        } else {
          ingredientWords.push(word);
        }
      });
      // remaining words are the ingredient
      const ingredient = ingredientWords.join(" ");
      // keep track of ingredient for highlighting in instructions
      if (ingredient) ingredientTags.push(ingredient);
      // CHECK IF I NEED THIS AND SPLIT TRAILING NOTES STUFF ABOVE - handle trailing descriptors after the comma
      let trailing = "";
      if (afterComma) {
        // WHAT DOES THIS DO??? - Optionally, you could split afterComma and filter descriptors if needed
        trailing = ", " + afterComma.trim();
      }
      // build HTML
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

  // insert instructions
  const stepsList = document.querySelector(".instructions-list");
  if (stepsList && data.instructions) {
    stepsList.innerHTML = data.instructions.map(step => {
      let stepText = step;
      // sort ingredientTags by length descending to avoid partial matches
      ingredientTags
        .sort((a, b) => b.length - a.length)
        .forEach(ingredient => {
          // use regex to match whole words or phrases, case-insensitive
          const regex = new RegExp(`\\b${ingredient.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, "gi");
          stepText = stepText.replace(regex, `<strong>${ingredient}</strong>`);
        });
      return `<li>${stepText}</li>`;
    }).join("");
  }
});