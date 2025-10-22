// ADD NEW RECIPE FILES HERE TO HAVE THEM APPEAR IN THE GALLERY
const recipeFiles = [
  "/food/recipes/recipe-crunchy-beef-tacos.html",
  "/food/recipes/recipe-sausage-fajita-pasta.html"
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
  const timeSlider = document.getElementById("timeSlider");
  const timeLabel = document.getElementById("timeLabel");
  const leftoverCheckbox = document.getElementById("leftoverSafeCheckbox");

  // Keep track of checkbox selections by group
  const selectedFilters = {
    meal: new Set(),
    type: new Set(),
    cuisine: new Set()
  };

  // --- Title search ---
  titleSearch.addEventListener("input", () => applyFilters());

  // --- Sidebar open/close ---
  openBtn.addEventListener("click", () => {
    sidebar.classList.add("active");
    overlay.classList.remove("hidden");
  });
  closeBtn.addEventListener("click", closeSidebar);
  overlay.addEventListener("click", closeSidebar);
  function closeSidebar() {
    sidebar.classList.remove("active");
    overlay.classList.add("hidden");
  }

  // --- Ingredient search (autocomplete) ---
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

  // --- Click suggestion to add ingredient ---
  ingredientSuggestions.addEventListener("click", e => {
    if (e.target.tagName === "LI") {
      const ing = e.target.textContent;
      selectedIngredients.push(ing);
      ingredientSearch.value = "";
      ingredientSuggestions.style.display = "none";
      renderSelectedIngredients();
    }
  });

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
    }
  });

  // --- Apply filters ---
  applyBtn.addEventListener("click", () => {
    applyFilters();
    closeSidebar();
  });

  // --- Time slider live label ---
  if (timeSlider && timeLabel) {
    timeLabel.textContent = timeSlider.value;
    timeSlider.addEventListener('input', () => {
      timeLabel.textContent = timeSlider.value;
    });
  }

  // --- Checkbox group handling ---
  document.querySelectorAll('.filter-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const group = e.target.dataset.group;
      const val = e.target.value;
      if (!group) return;
      if (e.target.checked) selectedFilters[group].add(val);
      else selectedFilters[group].delete(val);
    });
  });

  // --- Clear filters ---
  clearBtn.addEventListener("click", () => {
    titleSearch.value = "";
    selectedIngredients = [];
    renderSelectedIngredients();
    // reset checkboxes
    document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = false);
    selectedFilters.meal.clear();
    selectedFilters.type.clear();
    selectedFilters.cuisine.clear();
    // reset slider and leftover
    if (timeSlider) { timeSlider.value = 120; timeLabel.textContent = timeSlider.value; }
    if (leftoverCheckbox) leftoverCheckbox.checked = false;
    applyFilters();
  });
}

// --- Apply filtering logic ---
function applyFilters() {
  const titleQuery = document.getElementById("titleSearch").value.toLowerCase().trim();
  const maxTime = (document.getElementById('timeSlider') && parseInt(document.getElementById('timeSlider').value, 10)) || 120;
  const requireLeftover = document.getElementById('leftoverSafeCheckbox') && document.getElementById('leftoverSafeCheckbox').checked;

  // read selected checkbox filters
  const mealChecks = Array.from(document.querySelectorAll('.filter-checkbox[data-group="meal"]:checked')).map(i => i.value);
  const typeChecks = Array.from(document.querySelectorAll('.filter-checkbox[data-group="type"]:checked')).map(i => i.value);
  const cuisineChecks = Array.from(document.querySelectorAll('.filter-checkbox[data-group="cuisine"]:checked')).map(i => i.value);

  filteredRecipes = allRecipes.filter(r => {
    const matchesTitle = r.title.toLowerCase().includes(titleQuery);
    const matchesIngredients = selectedIngredients.every(ing =>
      r.ingredientsLower && r.ingredientsLower.some(i => i.includes(ing))
    );
    // --- Tags matching ---
    const tags = Array.isArray(r.tags) ? r.tags.map(t => t.toString()) : [];

    // Meal filter: if any meal checkboxes are selected, recipe must have at least one of them
    const matchesMeal = mealChecks.length === 0 || mealChecks.some(m => tags.includes(m));

    // Type filter
    const matchesType = typeChecks.length === 0 || typeChecks.some(t => tags.includes(t));

    // Cuisine filter
    const matchesCuisine = cuisineChecks.length === 0 || cuisineChecks.some(c => tags.includes(c));

    // Leftover-safe filter
    const matchesLeftover = !requireLeftover || tags.some(t => t.toLowerCase() === 'leftover-safe');

    // Time filter: parse tags like '20 min', '1 hr', '1 hr 30 min', or '90 min'
    const recipeTime = parseTimeFromTags(tags);
    const matchesTime = (recipeTime === null) ? true : (recipeTime <= maxTime);

    return matchesTitle && matchesIngredients;
  });
  // further filter by tag-based filters (meal/type/cuisine/leftover/time)
  filteredRecipes = filteredRecipes.filter(r => {
    const tags = Array.isArray(r.tags) ? r.tags.map(t => t.toString()) : [];
    const requireLeftover = document.getElementById('leftoverSafeCheckbox') && document.getElementById('leftoverSafeCheckbox').checked;
    const mealChecks = Array.from(document.querySelectorAll('.filter-checkbox[data-group="meal"]:checked')).map(i => i.value);
    const typeChecks = Array.from(document.querySelectorAll('.filter-checkbox[data-group="type"]:checked')).map(i => i.value);
    const cuisineChecks = Array.from(document.querySelectorAll('.filter-checkbox[data-group="cuisine"]:checked')).map(i => i.value);
    const maxTimeLocal = (document.getElementById('timeSlider') && parseInt(document.getElementById('timeSlider').value, 10)) || 120;

    const matchesMeal = mealChecks.length === 0 || mealChecks.some(m => tags.includes(m));
    const matchesType = typeChecks.length === 0 || typeChecks.some(t => tags.includes(t));
    const matchesCuisine = cuisineChecks.length === 0 || cuisineChecks.some(c => tags.includes(c));
    const matchesLeftoverLocal = !requireLeftover || tags.some(t => t.toLowerCase() === 'leftover-safe');
    const recipeTime = parseTimeFromTags(tags);
    const matchesTimeLocal = (recipeTime === null) ? true : (recipeTime <= maxTimeLocal);

    return matchesMeal && matchesType && matchesCuisine && matchesLeftoverLocal && matchesTimeLocal;
  });

  renderGallery();
}

// Parse time in minutes from tags array. Returns integer minutes or null if none found.
function parseTimeFromTags(tags) {
  if (!Array.isArray(tags)) return null;
  for (let t of tags) {
    const s = t.toString().toLowerCase();
    // patterns: '20 min', '90 min', '1 hr', '1 hr 30 min', '1hr', '30mins'
    const hrMatch = s.match(/(\d+)\s*hr/);
    const minMatch = s.match(/(\d+)\s*min/);
    if (hrMatch && minMatch) {
      return parseInt(hrMatch[1],10) * 60 + parseInt(minMatch[1],10);
    } else if (hrMatch) {
      return parseInt(hrMatch[1],10) * 60;
    } else if (minMatch) {
      return parseInt(minMatch[1],10);
    }
    // also try numbers alone (e.g., '20') followed by optional 'min' omission
    const loneNum = s.match(/^(\d+)$/);
    if (loneNum) return parseInt(loneNum[1],10);
  }
  return null;
}

// Load everything
loadRecipes();
