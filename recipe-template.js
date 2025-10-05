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
  // setup "view original recipe" button
  const viewBtn = document.getElementById("viewOriginalBtn");
  if (viewBtn && data.original) {
    viewBtn.style.display = "inline-block";
    viewBtn.addEventListener("click", () => {
      window.open(data.original, "_blank");
    });
  }
  // WORK ON THIS SO IT CHANGES ONCE SMTH HAS BEEN SAVED - setup save button
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
    const firstLine = data.tags.slice(0, 3).map(tag => {
      if (/\bmin\b|\bhour\b/i.test(tag)) {
        return `<span class="chip chip--soft"><i class="fa-regular fa-clock"></i> ${tag}</span>`;
      }
      return `<span class="chip chip--soft">${tag}</span>`;
    }).join("");

    const secondLine = data.tags.slice(3).map(tag => {
      return `<span class="chip chip--soft">${tag}</span>`;
    }).join("");

    recipeTags.innerHTML = `<div>${firstLine}</div>${secondLine ? `<div>${secondLine}</div>` : ""}`;
  }

  // insert video if available, cover image if not
  const videoContainer = document.querySelector('.video-container');
  if (data.video) {
    const videoElement = document.createElement('video');
    videoElement.src = data.video;
    videoElement.poster = data.cover;
    videoElement.setAttribute('controls', '');
    videoElement.setAttribute('playsinline', '');
    videoElement.style.width = '100%';
    videoElement.style.display = 'block';

    const overlay = document.createElement('div');
    overlay.className = 'video-overlay';
    const playButton = document.createElement('div');
    playButton.className = 'play-button';
    overlay.appendChild(playButton);

    overlay.addEventListener('click', () => {
      videoElement.play();
      overlay.style.display = 'none';
    });

    videoContainer.appendChild(videoElement);
    videoContainer.appendChild(overlay);
  } else if (data.cover) {
    // fallback: just show static image
    const img = document.createElement('img');
    img.src = data.cover;
    img.alt = data.title;
    img.style.width = '100%';
    img.style.display = 'block';
    videoContainer.appendChild(img);
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
      if (typeof step === "string") {
        let stepText = step;
        ingredientTags
          .sort((a, b) => b.length - a.length)
          .forEach(ingredient => {
            const regex = new RegExp(`\\b${ingredient.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, "gi");
            stepText = stepText.replace(regex, `<strong>${ingredient}</strong>`);
          });
        return `<li>${stepText}</li>`;
      } else if (step.image) {
        // Collapsible image block
        const id = `img-${Math.random().toString(36).substr(2, 9)}`;
        return `
          <li class="instruction-image">
            <details>
              <summary><i class="fa-solid fa-angle-right"></i> View Image</summary>
              <img src="${step.image}" alt="Instruction step image" style="max-width:100%;margin-top:8px;">
            </details>
          </li>`;
      }
    }).join("");
  }
});