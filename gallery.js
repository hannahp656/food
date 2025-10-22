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
    // --- NEW FILTER ELEMENTS ---
  const mealBoxes = document.querySelectorAll(".meal-filter");
  const typeBoxes = document.querySelectorAll(".type-filter");
  const cuisineBoxes = document.querySelectorAll(".cuisine-filter");
  const timeSlider = document.getElementById("timeSlider");
  const timeLabel = document.getElementById("timeLabel");
  const leftoverCheckbox = document.getElementById("leftoverCheckbox");

  // update time label as user slides
  timeSlider.addEventListener("input", () => {
    timeLabel.textContent = timeSlider.value;
  });

  // Apply filters when slider or leftover changes
  timeSlider.addEventListener("change", applyFilters);
  leftoverCheckbox.addEventListener("change", applyFilters);


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

  // --- Clear filters ---
  clearBtn.addEventListener("click", () => {
    titleSearch.value = "";
    selectedIngredients = [];
    renderSelectedIngredients();
    applyFilters();
  });
}

// --- Apply filtering logic ---
function applyFilters() {
  const titleQuery = document.getElementById("titleSearch").value.toLowerCase().trim();
  const timeLimit = parseInt(document.getElementById("timeSlider").value);
  const leftoverOnly = document.getElementById("leftoverCheckbox").checked;

  // collect selected checkboxes
  const selectedMeals = [...document.querySelectorAll(".meal-filter:checked")].map(el => el.value.toLowerCase());
  const selectedTypes = [...document.querySelectorAll(".type-filter:checked")].map(el => el.value.toLowerCase());
  const selectedCuisines = [...document.querySelectorAll(".cuisine-filter:checked")].map(el => el.value.toLowerCase());

  filteredRecipes = allRecipes.filter(r => {
    const matchesTitle = r.title.toLowerCase().includes(titleQuery);
    const matchesIngredients = selectedIngredients.every(ing =>
      r.ingredientsLower && r.ingredientsLower.some(i => i.includes(ing))
    );

    // time filtering
    const recipeTime = r.time ? parseInt(r.time) : 999;
    const matchesTime = recipeTime <= timeLimit;

    // tag-based filtering
    const tags = r.tags.map(t => t.toLowerCase());
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
