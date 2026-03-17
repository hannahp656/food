document.addEventListener("DOMContentLoaded", () => {
  const dataEl = document.getElementById("recipe-data");
  if (!dataEl) return;
  const data = JSON.parse(dataEl.textContent);

  // Helper function to parse ingredients (copied from build-recipes.js)
  function parseIngredient(line) {
    if (!line) return { amount: "", unit: "", ingredient: "", descriptors: "" };
    // descriptors
    const [beforeComma, afterComma] = line.split(/,(.+)/);
    const descriptors = afterComma ? afterComma.trim() : "";
    // parts before comma
    const parts = beforeComma.trim().split(/\s+/);
    // amount
    let amount = "";
    if (parts.length > 0 && /^(\d+([\/\.]\d+)?|\d+\s+\d+\/\d+)$/.test(parts[0])) {
      amount = parts.shift();
      if (parts.length && /^\d+\/\d+$/.test(parts[0])) {
        amount += " " + parts.shift();
      }
    }
    // units
    const units = [
      "cup","cups","tbsp","tsp","teaspoon","teaspoons","tablespoon","tablespoons",
      "g","kg","ml","l","oz","lb","pound","pounds","clove","cloves","slice","slices",
      "can","cans","package","packages","breast","breasts","pinch","handful","dash", "head", "heads", "bunch", "bunches"
    ];
    let unit = "";
    if (parts.length > 0 && units.includes(parts[0].toLowerCase())) {
      unit = parts.shift();
    }
    // ingredient
    const ingredient = parts.join(" ").trim();
    // return parsed ingredient line
    return { amount, unit, ingredient, descriptors };
  }

  // set document title
  document.title = `${data.title} - Hannah's Recipes`;

  // Update back link with filter parameters
  const backLink = document.querySelector(".back-link");
  if (backLink) {
    const filterState = JSON.parse(sessionStorage.getItem("recipeFilters") || "{}");
    const params = new URLSearchParams();
    if (filterState.titleQuery) params.set("q", filterState.titleQuery);
    if (filterState.selectedIngredients && filterState.selectedIngredients.length > 0) {
      params.set("ingredients", filterState.selectedIngredients.join(","));
    }
    if (filterState.selectedMealTypes && filterState.selectedMealTypes.length > 0) {
      params.set("mealTypes", filterState.selectedMealTypes.join(","));
    }
    if (filterState.selectedOtherTags && filterState.selectedOtherTags.length > 0) {
      params.set("otherTags", filterState.selectedOtherTags.join(","));
    }
    if (filterState.timeLimit) {
      params.set("timeLimit", filterState.timeLimit);
      params.set("timeRange", filterState.timeRange);
    }
    if (filterState.maxCost) params.set("maxCost", filterState.maxCost);
    if (filterState.leftoverOnly) params.set("leftoverOnly", "true");
    const queryString = params.toString();
    if (queryString) {
      backLink.href = "../recipes.html?" + queryString;
    }
  }

  // insert title
  const h1 = document.querySelector("header.hero h1");
  if (h1) h1.textContent = data.title;

  // insert hero image - is this used??
  //const heroImg = document.querySelector("header.hero img");
 // if (heroImg && data.cover) {
  //  heroImg.src = data.cover;
  //  heroImg.alt = data.title;
  //}
  // insert hero image
  const imgContainer = document.querySelector(".image-container");
  if (data.image) {
    const img = document.createElement("img");
    img.src = data.image;
    img.alt = data.title;
    img.style.width = "100%";
    img.style.display = "block";
    imgContainer.appendChild(img);
  }

  // setup "view original recipe" button
  const viewBtn = document.getElementById("viewOriginalBtn");
  if (viewBtn && data.original) {
    viewBtn.style.display = "inline-block";
    viewBtn.addEventListener("click", () => {
      window.open(data.original, "_blank");
    });
  }

  // setup save button(s)
  document.querySelectorAll(".saveRecipeBtn").forEach(saveBtn => {
    const icon = saveBtn.querySelector("i");
    function updateBookmarkIcon(isSaved) {
      if (isSaved) {
        icon.classList.remove("fa-regular");
        icon.classList.add("fa-solid");
      } else {
        icon.classList.remove("fa-solid");
        icon.classList.add("fa-regular");
      }
    }
    let saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]");
    let isSaved = saved.some(r => r.link === data.link);
    updateBookmarkIcon(isSaved);
    saveBtn.addEventListener("click", () => {
      saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]");
      isSaved = saved.some(r => r.link === data.link);
      if (isSaved) {
        saved = saved.filter(r => r.link !== data.link);
        localStorage.setItem("savedRecipes", JSON.stringify(saved));
        updateBookmarkIcon(false);
      } else {
        saved.push(data);
        localStorage.setItem("savedRecipes", JSON.stringify(saved));
        updateBookmarkIcon(true);
      }
      window.dispatchEvent(new Event("savedRecipesUpdated"));
    });
    function syncBookmarkIcon() {
      const saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]");
      const isSavedNow = saved.some(r => r.link === data.link);
      updateBookmarkIcon(isSavedNow);
    }
    window.addEventListener("storage", (ev) => {
      if (ev.key === "savedRecipes") syncBookmarkIcon();
    });
    window.addEventListener("savedRecipesUpdated", syncBookmarkIcon);
  });


  // insert tags
  const recipeTags = document.querySelector(".tags");
  if (recipeTags && data.tags) {
    const firstLine = data.tags.slice(0, 3).map(tag => {
      if (/\bmin\b|\bhour\b/i.test(tag)) {
        return `<span class="tag"><i class="fa-regular fa-clock"></i> ${tag}</span>`;
      }
      else if (/\$/.test(tag)) {
        return `<span class="tag"><i class="fa-regular fa-money-bill-1"></i> ${tag}</span>`;
      }
      else return `<span class="tag"><i class="fa-solid fa-bell-concierge"></i> ${tag}</span>`;
    }).join("");
    const secondLine = data.tags.slice(3).map(tag => {
      return `<span class="tag">${tag}</span>`;
    }).join("");
    let extraTagsLine = "";
    if (data["extra-tags"] && data["extra-tags"].length > 0) {
      extraTagsLine = `<div>${data["extra-tags"].map(tag => `<span class="tag">${tag}</span>`).join("")}</div>`;
    }
    recipeTags.innerHTML = `<div>${firstLine}</div>${secondLine ? `<div>${secondLine}</div>` : ""}${extraTagsLine}`;
  }

  // insert video if available
  const videoSection = document.querySelector(".video-section");
  const videoContainer = document.querySelector(".video-container");
  if (data.video) {
    const videoElement = document.createElement("video");
    videoElement.src = data.video;
    videoElement.poster = data.cover;
    videoElement.setAttribute("controls", "");
    videoElement.setAttribute("playsinline", "");
    videoElement.style.width = "100%";
    videoElement.style.display = "block";
    const overlay = document.createElement("div");
    overlay.className = "video-overlay";
    const playButton = document.createElement("div");
    playButton.className = "play-button";
    overlay.appendChild(playButton);
    overlay.addEventListener("click", () => {
      videoElement.play();
      overlay.style.display = "none";
    });
    videoContainer.appendChild(videoElement);
    videoContainer.appendChild(overlay);
  } else {
    videoSection.style.display = "none";
  }

  // insert ingredients list
  const ingredientTags = (data.parsedIngredients || []).map(i => i.ingredient.toLowerCase().trim());
  const ingList = document.querySelector(".ingredients-list");
  const servingsInput = document.getElementById("servings-input");
  const servingsBtns = document.querySelectorAll(".servings-arrow");

  // Initialize servings
  let currentServings = parseInt(data.servings) || 1;
  const urlServings = parseInt(new URLSearchParams(window.location.search).get('servings'));
  if (!Number.isNaN(urlServings) && urlServings >= 0 && urlServings <= 10) {
    currentServings = urlServings;
  }
  if (servingsInput) {
    servingsInput.value = currentServings;
  }

  // Function to scale ingredient amounts
  function scaleIngredient(line, scaleFactor) {
    const parsed = parseIngredient(line);
    if (!parsed.amount) return line;

    // Parse amount (handle fractions and mixed numbers)
    let totalAmount = 0;
    const amountParts = parsed.amount.split(/\s+/);
    for (const part of amountParts) {
      if (part.includes('/')) {
        const [num, den] = part.split('/').map(Number);
        totalAmount += num / den;
      } else {
        totalAmount += parseFloat(part) || 0;
      }
    }

    // Scale the amount
    const scaledAmount = totalAmount * scaleFactor;

    // Format back to readable amount
    let formattedAmount;
    if (scaledAmount % 1 === 0) {
      formattedAmount = scaledAmount.toString();
    } else if (scaledAmount < 1) {
      // Convert to fraction for amounts less than 1
      const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
      const denominator = 8; // Use 1/8 as smallest unit
      const numerator = Math.round(scaledAmount * denominator);
      const divisor = gcd(numerator, denominator);
      formattedAmount = `${numerator/divisor}/${denominator/divisor}`;
    } else {
      // Round to 2 decimal places for amounts >= 1
      formattedAmount = Math.round(scaledAmount * 100) / 100;
      if (formattedAmount % 1 === 0) {
        formattedAmount = formattedAmount.toString();
      } else {
        formattedAmount = formattedAmount.toFixed(2);
      }
    }

    // Reconstruct the line
    const parts = [];
    if (formattedAmount) parts.push(formattedAmount);
    if (parsed.unit) parts.push(parsed.unit);
    parts.push(parsed.ingredient);
    if (parsed.descriptors) parts.push(',', parsed.descriptors);

    return parts.join(' ');
  }

  // Function to update ingredients display
  function updateIngredients() {
    const scaleFactor = currentServings / (data.servings || 1);
    ingList.innerHTML = data.ingredients.map(line => {
      const scaledLine = scaleIngredient(line, scaleFactor);
      let displayLine = scaledLine;
      for (const ingr of ingredientTags.sort((a, b) => b.length - a.length)) {
        const regex = new RegExp(`\\b${ingr.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
        if (regex.test(displayLine)) {
          displayLine = displayLine.replace(regex, `<span class="ingredient-tag">${ingr}</span>`);
          break;
        }
      }
      return `<li>${displayLine}</li>`;
    }).join("");
  }

  // Initialize ingredients
  updateIngredients();

  // Handle servings controls
  function syncServingsControls() {
    if (servingsInput) {
      servingsInput.value = currentServings;
    }
    if (servingsBtns.length >= 2) {
      servingsBtns[0].disabled = currentServings <= 0;
      servingsBtns[1].disabled = currentServings >= 10;
    }
  }

  if (servingsBtns.length > 0) {
    servingsBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const direction = parseInt(btn.dataset.direction, 10);
        if (!Number.isNaN(direction)) {
          currentServings = Math.max(0, Math.min(10, currentServings + direction));
          syncServingsControls();
          updateIngredients();
        }
      });
    });
  }

  if (servingsInput) {
    servingsInput.addEventListener("input", () => {
      const val = parseInt(servingsInput.value, 10);
      if (!Number.isNaN(val)) {
        currentServings = Math.max(0, Math.min(10, val));
        syncServingsControls();
        updateIngredients();
      }
    });
  }

  syncServingsControls();

  // insert prep steps
  //const prepSection = document.querySelector(".prep-section");
  //const prepList = document.querySelector(".prep-list");
  //if (data.prep && Array.isArray(data.prep) && data.prep.length > 0) {
  //  prepSection.style.display = "block";
  //  data.prep.forEach(item => {
  //    let itemText = item;
  //    (ingredientTags || []).sort((a, b) => b.length - a.length).forEach(ingredient => {
  //      const regex = new RegExp(`\\b${ingredient.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}s?\\b`, "gi");
  //      itemText = itemText.replace(regex, `<strong>${ingredient}</strong>`);
  //    });
  //    const li = document.createElement("li");
  //    li.innerHTML = itemText;
 //     prepList.appendChild(li);
 //   });
 // } else {
//    prepSection.style.display = "none";
//}

  const prepSection = document.querySelector(".prep-section");
  const prepList = document.querySelector(".prep-list");

  if (prepSection && prepList && Array.isArray(data.prep) && data.prep.length > 0) {
    prepList.innerHTML = data.prep.map((prep, index) => {
      if (typeof prep === "string") {
        const next = data.prep[index + 1];
        let prepText = prep;
        ingredientTags
          .sort((a, b) => b.length - a.length)
          .forEach(ingredient => {
            const regex = new RegExp(`\\b${ingredient.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "gi");
            prepText = prepText.replace(regex, `<strong>${ingredient}</strong>`);
          });
        if (next && typeof next === "object" && next.image) {
          const id = `img-${Math.random().toString(36).substr(2, 9)}`;
          return `
            <li>
              ${prepText}
              <button class="img-toggle" data-target="${id}">
                <i class="fa-solid fa-angle-right"></i>
              </button>
              <div id="${id}" class="instruction-img hidden">
                <img src="${next.image}" alt="Instruction image">
              </div>
            </li>
          `;
        }

        return `<li>${prepText}</li>`;
      }

      return "";
    }).join("");
// handle image toggles
    prepList.querySelectorAll(".img-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetId = btn.dataset.target;
        const target = document.getElementById(targetId);
        const icon = btn.querySelector("i");

        if (target.classList.contains("hidden")) {
          target.classList.remove("hidden");
          icon.style.transform = "rotate(90deg)";
        } else {
          target.classList.add("hidden");
          icon.style.transform = "rotate(0deg)";
        }
      });
    });
  } else if (prepSection) {
    prepSection.style.display = "none";
  }

  // insert instructions
  const stepsSection = document.querySelector(".instructions");
  const stepsList = document.querySelector(".instructions-list");

  if (stepsSection && stepsList && Array.isArray(data.instructions) && data.instructions.length > 0) {
    stepsList.innerHTML = data.instructions.map((step, index) => {
      if (typeof step === "string") {
        const next = data.instructions[index + 1];
        let stepText = step;

        ingredientTags
          .sort((a, b) => b.length - a.length)
          .forEach(ingredient => {
            const regex = new RegExp(`\\b${ingredient.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "gi");
            stepText = stepText.replace(regex, `<strong>${ingredient}</strong>`);
          });

        if (next && typeof next === "object" && next.image) {
          const id = `img-${Math.random().toString(36).substr(2, 9)}`;
          return `
            <li>
              ${stepText}
              <button class="img-toggle" data-target="${id}">
                <i class="fa-solid fa-angle-right"></i>
              </button>
              <div id="${id}" class="instruction-img hidden">
                <img src="${next.image}" alt="Instruction image">
              </div>
            </li>
          `;
        }

        return `<li>${stepText}</li>`;
      }

      return "";
    }).join("");

    // handle image toggles
    stepsList.querySelectorAll(".img-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetId = btn.dataset.target;
        const target = document.getElementById(targetId);
        const icon = btn.querySelector("i");

        if (target.classList.contains("hidden")) {
          target.classList.remove("hidden");
          icon.style.transform = "rotate(90deg)";
        } else {
          target.classList.add("hidden");
          icon.style.transform = "rotate(0deg)";
        }
      });
    });
  } else if (stepsSection) {
    // hide the whole section if no instructions
    stepsSection.parentElement.style.display = "none";
  }
});
