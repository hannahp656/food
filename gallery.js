// recipe files get loaded here to appear in the gallery
const recipeFiles = [
  "/food/recipes/recipe-baby-carrots.html",
  "/food/recipes/recipe-breakfast-potatoes.html",
  "/food/recipes/recipe-cereal.html",
  "/food/recipes/recipe-crunchy-beef-tacos.html",
  "/food/recipes/recipe-egg-whites.html",
  "/food/recipes/recipe-gogo-squeez.html",
  "/food/recipes/recipe-granny-smith-apple.html",
  "/food/recipes/recipe-moms-meatballs.html",
  "/food/recipes/recipe-peanut-butter-waffle.html",
  "/food/recipes/recipe-shanghai-scallion-oil-noodles-and-pork.html"
];

let allRecipes = [];          // Store all recipe data
let filteredRecipes = [];     // Store filtered view
let allIngredients = [];      // Store all unique ingredients
let selectedIngredients = []; // Ingredients selected for filtering

// load all recipes
async function loadRecipes() {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";
  for (let file of recipeFiles) {
    try {
      const res = await fetch(file);
      if (!res.ok) continue;
      const text = await res.text();
      const doc = new DOMParser().parseFromString(text, "text/html");
      const dataEl = doc.querySelector("#recipe-data");
      if (!dataEl) continue;
      const data = JSON.parse(dataEl.textContent); // get recipe JSON
      data.file = file;
      const parsed = data.parsedIngredients || []; // get parsed ingredients
      data.ingredientsLower = parsed.map(obj => obj.ingredient.toLowerCase());
      allIngredients.push(...data.ingredientsLower);
//      if (Array.isArray(parsed) && parsed.length > 0) {
//        // Use the 'ingredient' field from each parsed ingredient
//        data.ingredientsLower = parsed.map(obj => obj.ingredient.toLowerCase());
//        allIngredients.push(...data.ingredientsLower);
//      } else {
//        // fallback to original ingredients
//        const sourceIngredients = data.ingredients || [];
//        data.ingredientsLower = sourceIngredients.map(i => i.toLowerCase());
//        allIngredients.push(...data.ingredientsLower);
//      }
      allRecipes.push(data);
    } catch (err) {
      console.error("Error loading recipe:", file, err);
    }
  }
  allIngredients = [...new Set(allIngredients)].sort(); // delete duplicate ingredients
  filteredRecipes = [...allRecipes];
  renderGallery();
  setupSearchAndFilters();
}



// function to render gallery cards
function renderGallery() {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";
  if (filteredRecipes.length === 0) {
    gallery.innerHTML = "<p style='text-align:center;color:var(--muted)'>No recipes found.</p>";
    return;
  }
  const saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]"); //new
  filteredRecipes.forEach(data => {
    const isSaved = saved.some(r => r.link === data.link); //new
    const card = document.createElement("div");
    card.className = "recipe-card";
    card.innerHTML = `
      <div style="position:relative;">
        <img src="${data.image}" alt="${data.title}">
        <button id="saveRecipeBtn" class="button button--secondary" style="position:absolute;top:12px;right:12px;z-index:2;">
          <i class="fa-${isSaved ? "solid" : "regular"} fa-bookmark"></i>
        </button>
      </div>
      <div class="content">
        <h3>${data.title}</h3>
        <div class="card-tags">
          ${data.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}
        </div>
        <a href="${data.link}">View Recipe</a>
      </div>
    `;
    // clicking anywhere else goes to the recipe - new
    card.addEventListener("click", e => {
      if (!e.target.closest(".save-btn")) {
        window.location.href = data.link;
      }
    });
    const saveRecipeBtn = card.querySelector("#saveRecipeBtn");
    if (saveRecipeBtn) {
      const icon = saveRecipeBtn.querySelector("i");
      saveRecipeBtn.addEventListener("click", e => {
        e.stopPropagation(); // prevents navigating to recipe page
        let saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]");
        const isSaved = saved.some(r => r.link === data.link);

        if (isSaved) {
          saved = saved.filter(r => r.link !== data.link);
          icon.classList.remove("fa-solid");
          icon.classList.add("fa-regular");
        } else {
          saved.push(data);
          icon.classList.remove("fa-regular");
          icon.classList.add("fa-solid");
        }

        localStorage.setItem("savedRecipes", JSON.stringify(saved));
      });
    }
    gallery.appendChild(card);
  });
}

// function to set up search and filters
function setupSearchAndFilters() {
  const titleSearch = document.getElementById("titleSearch");
  const openBtn = document.getElementById("openFiltersBtn");
  const closeBtn = document.getElementById("closeFiltersBtn");
  const sidebar = document.getElementById("filterSidebar");
  const overlay = document.getElementById("overlay");
  const ingredientSearch = document.getElementById("ingredientSearch");
  const ingredientSuggestions = document.getElementById("ingredientSuggestions");
  const selectedContainer = document.getElementById("selectedIngredients");
  const mealBoxes = document.querySelectorAll(".meal-filter");
  const typeBoxes = document.querySelectorAll(".type-filter");
  const cuisineBoxes = document.querySelectorAll(".cuisine-filter");
  const timeSlider = document.getElementById("timeSlider");
  const timeLabel = document.getElementById("timeLabel");
  const leftoverCheckbox = document.getElementById("leftoverCheckbox");
  const applyBtn = document.getElementById("applyFiltersBtn");
  const clearBtn = document.getElementById("clearFiltersBtn");
  // time slider setup
  if (timeSlider && timeLabel) {
    timeSlider.addEventListener("input", () => { // update time label as user slides
      const value = parseInt(timeSlider.value, 10);
      timeLabel.textContent = formatTimeLabel(value);
    });
    timeSlider.addEventListener("change", applyFilters);  // apply filters when slider changes
  }
  // leftover checkbox setup
  if (leftoverCheckbox) leftoverCheckbox.addEventListener("change", applyFilters);
  // when any of the checkboxes change, reapply filters
  document.querySelectorAll(".meal-filter, .type-filter, .cuisine-filter").forEach(box => {
    box.addEventListener("change", applyFilters);
  });
  // title search setup
  if (titleSearch) titleSearch.addEventListener("input", () => applyFilters());
  // sidebar open/close
  if (openBtn) {
    openBtn.addEventListener("click", () => {
      sidebar.classList.add("active");
      overlay.classList.remove("hidden");
    });
  }
  if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
  overlay.addEventListener("click", closeSidebar);
  function closeSidebar() {
    sidebar.classList.remove("active");
    overlay.classList.add("hidden");
  }
  // ingredient search and filter
  if (ingredientSearch) {
    ingredientSearch.addEventListener("input", e => {
      const query = e.target.value.toLowerCase().trim();
      ingredientSuggestions.innerHTML = "";
      if (!query) {
        ingredientSuggestions.style.display = "none";
        return;
      }
      const matches = allIngredients.filter(ing => ing.includes(query) && !selectedIngredients.includes(ing));
      if (matches.length === 0) {
        ingredientSuggestions.style.display = "none";
        return;
      }
      ingredientSuggestions.innerHTML = matches.map(ing => `<li>${ing}</li>`).join("");
      ingredientSuggestions.style.display = "block";
    });
  }
  if (ingredientSuggestions) {  // clicking a suggestion to add an ingredient filter
    ingredientSuggestions.addEventListener("click", e => {
      if (e.target.tagName === "LI") {
        const ing = e.target.textContent;
        if (!selectedIngredients.includes(ing)) selectedIngredients.push(ing);
        ingredientSearch.value = "";
        ingredientSuggestions.style.display = "none";
        renderSelectedIngredients();
        applyFilters();
      }
    });
  }
  function renderSelectedIngredients() {  // render selected ingredient filters
    selectedContainer.innerHTML = selectedIngredients.map(ing => `
      <span class="tag">${ing}
        <button data-ing="${ing}" title="Remove">&times;</button>
      </span>
    `).join("");
  }
  selectedContainer.addEventListener("click", e => {  // remove selected ingredient filter when clicking its "x" button
    if (e.target.tagName === "BUTTON") {
      const ing = e.target.dataset.ing;
      selectedIngredients = selectedIngredients.filter(i => i !== ing);
      renderSelectedIngredients();
      applyFilters();
    }
  });
  // apply filters
  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      applyFilters();
      closeSidebar();
    });
  }
  // clear filters
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (titleSearch) titleSearch.value = "";  // Reset title
      selectedIngredients = []; // Reset ingredient inputs & tags
      if (ingredientSearch) ingredientSearch.value = "";
      if (selectedContainer) selectedContainer.innerHTML = "";
      document.querySelectorAll(".meal-filter, .type-filter, .cuisine-filter").forEach(box => box.checked = false); // Reset checkboxes
      if (leftoverCheckbox) leftoverCheckbox.checked = false; // Reset leftover checkbox
      if (timeSlider) { // Reset time slider to max (120) and label
        timeSlider.value = 120;
        if (timeLabel) timeLabel.textContent = "120";
      }
      applyFilters(); // Reapply filters and keep sidebar open so user can continue selecting
    });
  }
}

// function to format time label
function formatTimeLabel(minutes) {
  if (minutes === 0) return "0 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  if (hours === 1) return "1 hour";
  if (hours % 1 === 0.5) return `${hours} hours`; // e.g. 1.5 -> "1.5 hours"
  const fractionalHours = {
    0.25: "¼",
    0.5: "½",
    0.75: "¾"
  };
  const whole = Math.floor(hours);
  const fraction = hours - whole;
  const fracLabel = fractionalHours[fraction] || "";
  return `${whole}${fracLabel ? " " + fracLabel : ""} hours`;
}

// function to apply filters
function applyFilters() {
  const titleEl = document.getElementById("titleSearch");
  const titleQuery = titleEl ? titleEl.value.toLowerCase().trim() : "";
  const timeSlider = document.getElementById("timeSlider");
  const timeLimit = timeSlider ? parseInt(timeSlider.value, 10) : 999;
  const leftoverCheckbox = document.getElementById("leftoverCheckbox");
  const leftoverOnly = leftoverCheckbox ? leftoverCheckbox.checked : false;
  const selectedMeals = [...document.querySelectorAll(".meal-filter:checked")].map(el => el.value.toLowerCase());
  const selectedTypes = [...document.querySelectorAll(".type-filter:checked")].map(el => el.value.toLowerCase());
  const selectedCuisines = [...document.querySelectorAll(".cuisine-filter:checked")].map(el => el.value.toLowerCase());
  // filter recipes
  filteredRecipes = allRecipes.filter(r => {
    const matchesTitle = r.title.toLowerCase().includes(titleQuery);
    const matchesIngredients = selectedIngredients.every(ing =>
      r.ingredientsLower && r.ingredientsLower.some(i => i.includes(ing))
    );
    // time filtering — use r.time if present (try numbers inside tags as fallback)
    let recipeTime = 999;
    if (r.time) {
      const t = parseInt(r.time, 10);
      if (!isNaN(t)) recipeTime = t;
    } else {
      const timeTag = (r.tags || []).find(t => /\b\d+\s*min\b/i.test(t));
      if (timeTag) {
        const num = parseInt(timeTag.match(/(\d+)\s*min/i)[1], 10);
        if (!isNaN(num)) recipeTime = num;
      }
    }
    const matchesTime = recipeTime <= timeLimit;
    const tags = (r.tags || []).map(t => t.toLowerCase());
    const matchesMeal = selectedMeals.length === 0 || selectedMeals.some(m => tags.includes(m));
    const matchesType = selectedTypes.length === 0 || selectedTypes.some(t => tags.includes(t));
    const matchesCuisine = selectedCuisines.length === 0 || selectedCuisines.some(c => tags.includes(c));
    const matchesLeftover = !leftoverOnly || tags.includes("leftover-safe");
    // return filtered result
    return (
      matchesTitle &&
      matchesIngredients &&
      matchesTime &&
      matchesMeal &&
      matchesType &&
      matchesCuisine &&
      matchesLeftover
    );
  });
  renderGallery();
}

// Load everything
loadRecipes();
