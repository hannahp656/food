// ADD NEW RECIPE FILES HERE TO HAVE THEM APPEAR IN THE GALLERY
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

let allRecipes = [];       // Store all recipe data
let filteredRecipes = [];  // Store filtered view
let allIngredients = [];   // Store all unique ingredients
let selectedIngredients = [];

// --- Load all recipes ---
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

      const data = JSON.parse(dataEl.textContent);
      data.file = file;

      // Keep track of ingredients (lowercased for matching)
      const sourceIngredients = data.cleanedIngredients || data.ingredients || [];
      if (Array.isArray(sourceIngredients)) {
        data.ingredientsLower = sourceIngredients.map(i => i.toLowerCase());
        allIngredients.push(...data.ingredientsLower);
      }

      allRecipes.push(data);
    } catch (err) {
      console.error("Error loading recipe:", file, err);
    }
  }

  // Deduplicate ingredient list
  allIngredients = [...new Set(allIngredients)].sort();

  filteredRecipes = [...allRecipes];
  renderGallery();
  setupSearchAndFilters();
}

// --- Render gallery cards ---
function renderGallery() {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";

  if (filteredRecipes.length === 0) {
    gallery.innerHTML = "<p style='text-align:center;color:var(--muted)'>No recipes found.</p>";
    return;
  }

  filteredRecipes.forEach(data => {
    const card = document.createElement("div");
    card.className = "recipe-card";
    card.innerHTML = `
      <img src="${data.image}" alt="${data.title}">
      <div class="content">
        <h3>${data.title}</h3>
        <div class="card-tags">
          ${data.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}
        </div>
        <a href="${data.link}">View Recipe</a>
      </div>
    `;
    card.addEventListener("click", () => {
      window.location.href = data.link;
    });
    gallery.appendChild(card);
  });
}

// --- Setup search and filters ---
function setupSearchAndFilters() {
  const titleSearch = document.getElementById("titleSearch");
  const openBtn = document.getElementById("openFiltersBtn");
  const closeBtn = document.getElementById("closeFiltersBtn");
  const sidebar = document.getElementById("filterSidebar");
  const overlay = document.getElementById("overlay");
  const ingredientSearch = document.getElementById("ingredientSearch");
  const ingredientSuggestions = document.getElementById("ingredientSuggestions");
  const selectedContainer = document.getElementById("selectedIngredients");
  const applyBtn = document.getElementById("applyFiltersBtn");
  const clearBtn = document.getElementById("clearFiltersBtn");

  // --- NEW FILTER ELEMENTS ---
  const mealBoxes = document.querySelectorAll(".meal-filter");
  const typeBoxes = document.querySelectorAll(".type-filter");
  const cuisineBoxes = document.querySelectorAll(".cuisine-filter");
  const timeSlider = document.getElementById("timeSlider");
  const timeLabel = document.getElementById("timeLabel");
  const leftoverCheckbox = document.getElementById("leftoverCheckbox");

  // defensive: if slider/label missing, create no-op behavior
  if (timeSlider && timeLabel) {
    // update time label as user slides
    timeSlider.addEventListener("input", () => {
      const value = parseInt(timeSlider.value, 10);
      timeLabel.textContent = formatTimeLabel(value);
    });


    // Apply filters when slider changes
    timeSlider.addEventListener("change", applyFilters);
  }

  if (leftoverCheckbox) leftoverCheckbox.addEventListener("change", applyFilters);

  // When any of the meal/type/cuisine checkboxes change, reapply filters
  document.querySelectorAll(".meal-filter, .type-filter, .cuisine-filter").forEach(box => {
    box.addEventListener("change", applyFilters);
  });

  // --- Title search ---
  if (titleSearch) titleSearch.addEventListener("input", () => applyFilters());

  // --- Sidebar open/close ---
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

  // --- Ingredient search (autocomplete) ---
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

  // --- Click suggestion to add ingredient ---
  if (ingredientSuggestions) {
    ingredientSuggestions.addEventListener("click", e => {
      if (e.target.tagName === "LI") {
        const ing = e.target.textContent;
        if (!selectedIngredients.includes(ing)) selectedIngredients.push(ing);
        ingredientSearch.value = "";
        ingredientSuggestions.style.display = "none";
        renderSelectedIngredients();
        applyFilters(); // react immediately to new ingredient selection
      }
    });
  }

  // --- Render selected ingredient tags ---
  function renderSelectedIngredients() {
    selectedContainer.innerHTML = selectedIngredients.map(ing => `
      <span class="tag">${ing}
        <button data-ing="${ing}" title="Remove">&times;</button>
      </span>
    `).join("");
  }

  // --- Remove ingredient tag ---
  selectedContainer.addEventListener("click", e => {
    if (e.target.tagName === "BUTTON") {
      const ing = e.target.dataset.ing;
      selectedIngredients = selectedIngredients.filter(i => i !== ing);
      renderSelectedIngredients();
      applyFilters(); // react immediately when a tag is removed
    }
  });

  // --- Apply filters ---
  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      applyFilters();
      closeSidebar();
    });
  }

  // --- Clear filters ---
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      // Reset title
      if (titleSearch) titleSearch.value = "";

      // Reset ingredient inputs & tags
      selectedIngredients = [];
      if (ingredientSearch) ingredientSearch.value = "";
      if (selectedContainer) selectedContainer.innerHTML = "";

      // Reset checkboxes
      document.querySelectorAll(".meal-filter, .type-filter, .cuisine-filter").forEach(box => box.checked = false);

      // Reset leftover checkbox
      if (leftoverCheckbox) leftoverCheckbox.checked = false;

      // Reset time slider to max (120) and label
      if (timeSlider) {
        timeSlider.value = 120;
        if (timeLabel) timeLabel.textContent = "120";
      }

      // Reapply filters and keep sidebar open so user can continue selecting
      applyFilters();
    });
  }
}
function formatTimeLabel(minutes) {
  if (minutes === 0) return "0 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  if (hours === 1) return "1 hour";
  if (hours % 1 === 0.5) return `${hours} hours`; // e.g. 1.5 -> "1.5 hours"
  // For quarter-hour increments
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


// --- Apply filtering logic ---
function applyFilters() {
  const titleEl = document.getElementById("titleSearch");
  const titleQuery = titleEl ? titleEl.value.toLowerCase().trim() : "";

  const timeSlider = document.getElementById("timeSlider");
  const timeLimit = timeSlider ? parseInt(timeSlider.value, 10) : 999;

  const leftoverCheckbox = document.getElementById("leftoverCheckbox");
  const leftoverOnly = leftoverCheckbox ? leftoverCheckbox.checked : false;

  // collect selected checkboxes
  const selectedMeals = [...document.querySelectorAll(".meal-filter:checked")].map(el => el.value.toLowerCase());
  const selectedTypes = [...document.querySelectorAll(".type-filter:checked")].map(el => el.value.toLowerCase());
  const selectedCuisines = [...document.querySelectorAll(".cuisine-filter:checked")].map(el => el.value.toLowerCase());

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
      // attempt to pull a time tag like "40 min" from tags
      const timeTag = (r.tags || []).find(t => /\b\d+\s*min\b/i.test(t));
      if (timeTag) {
        const num = parseInt(timeTag.match(/(\d+)\s*min/i)[1], 10);
        if (!isNaN(num)) recipeTime = num;
      }
    }
    const matchesTime = recipeTime <= timeLimit;

    // tag-based filtering (lowercased)
    const tags = (r.tags || []).map(t => t.toLowerCase());
    const matchesMeal = selectedMeals.length === 0 || selectedMeals.some(m => tags.includes(m));
    const matchesType = selectedTypes.length === 0 || selectedTypes.some(t => tags.includes(t));
    const matchesCuisine = selectedCuisines.length === 0 || selectedCuisines.some(c => tags.includes(c));
    const matchesLeftover = !leftoverOnly || tags.includes("leftover-safe");

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
