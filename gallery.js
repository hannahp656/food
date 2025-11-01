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
  "/food/recipes/recipe-shanghai-scallion-oil-noodles-and-pork.html",
  "/food/recipes/recipe-example.html"
];

let allRecipes = [];
let filteredRecipes = [];
let allIngredients = [];
let selectedIngredients = [];

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

      const data = JSON.parse(dataEl.textContent);
      data.file = file;

      const parsed = data.parsedIngredients || [];
      data.ingredientsLower = parsed.map(obj => obj.ingredient.toLowerCase());
      allIngredients.push(...data.ingredientsLower);

      allRecipes.push(data);
    } catch (err) {
      console.error("Error loading recipe:", file, err);
    }
  }

  allIngredients = [...new Set(allIngredients)].sort();
  filteredRecipes = [...allRecipes];
  renderGallery();
  setupSearchAndFilters();
}

// render gallery cards
function renderGallery() {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";

  if (filteredRecipes.length === 0) {
    gallery.innerHTML = "<p style='text-align:center;color:var(--muted)'>No recipes found.</p>";
    return;
  }

  const saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]");

  filteredRecipes.forEach(data => {
    const isSaved = saved.some(r => r.link === data.link);

    const card = document.createElement("div");
    card.className = "recipe-card";

    card.innerHTML = `
      <div style="position:relative;">
        <img src="${data.image}" alt="${data.title}">
        <button class="save-btn" style="position:absolute;top:12px;right:12px;z-index:2;">
          <i class="fa-${isSaved ? "solid" : "regular"} fa-bookmark"></i>
        </button>
      </div>
      <div class="content">
        <h3>${data.title}</h3>
        <div class="card-tags">
          ${data.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}
        </div>
      </div>
    `;

    // clicking anywhere else goes to the recipe
    card.addEventListener("click", e => {
      if (!e.target.closest(".save-btn")) {
        window.location.href = data.link;
      }
    });

    // save button toggle
    const saveBtn = card.querySelector(".save-btn");
    const icon = saveBtn.querySelector("i");

    saveBtn.addEventListener("click", e => {
      e.stopPropagation(); // stop from opening recipe page

      let saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]");
      const isAlreadySaved = saved.some(r => r.link === data.link);

      if (isAlreadySaved) {
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

    gallery.appendChild(card);
  });
}

// filtering + search logic (unchanged except reset fix)
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

  if (timeSlider && timeLabel) {
    timeSlider.addEventListener("input", () => {
      const value = parseInt(timeSlider.value, 10);
      timeLabel.textContent = `Max: ${formatTimeLabel(value)}`;
    });
    timeSlider.addEventListener("change", applyFilters);
  }

  if (leftoverCheckbox) leftoverCheckbox.addEventListener("change", applyFilters);

  document.querySelectorAll(".meal-filter, .type-filter, .cuisine-filter").forEach(box => {
    box.addEventListener("change", applyFilters);
  });

  if (titleSearch) titleSearch.addEventListener("input", () => applyFilters());

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

  if (ingredientSuggestions) {
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

  function renderSelectedIngredients() {
    selectedContainer.innerHTML = selectedIngredients
      .map(ing => `<span class="tag">${ing}<button data-ing="${ing}" title="Remove">&times;</button></span>`)
      .join("");
  }

  selectedContainer.addEventListener("click", e => {
    if (e.target.tagName === "BUTTON") {
      const ing = e.target.dataset.ing;
      selectedIngredients = selectedIngredients.filter(i => i !== ing);
      renderSelectedIngredients();
      applyFilters();
    }
  });

  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      applyFilters();
      closeSidebar();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (titleSearch) titleSearch.value = "";
      selectedIngredients = [];
      if (ingredientSearch) ingredientSearch.value = "";
      if (selectedContainer) selectedContainer.innerHTML = "";
      document.querySelectorAll(".meal-filter, .type-filter, .cuisine-filter").forEach(box => (box.checked = false));
      if (leftoverCheckbox) leftoverCheckbox.checked = false;
      if (timeSlider) {
        timeSlider.value = 120;
        if (timeLabel) timeLabel.textContent = `Max: ${formatTimeLabel(120)}`;
      }
      applyFilters();
    });
  }
}

// same as before
function formatTimeLabel(minutes) {
  if (minutes === 0) return "0 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  const fractionalHours = { 0.25: "¼", 0.5: "½", 0.75: "¾" };
  const whole = Math.floor(hours);
  const fraction = hours - whole;
  const fracLabel = fractionalHours[fraction] || "";
  return `${whole}${fracLabel ? " " + fracLabel : ""} hours`;
}

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

  filteredRecipes = allRecipes.filter(r => {
    const matchesTitle = r.title.toLowerCase().includes(titleQuery);
    const matchesIngredients = selectedIngredients.every(ing =>
      r.ingredientsLower && r.ingredientsLower.some(i => i.includes(ing))
    );
    let recipeTime = 999;
    const timeTag = (r.tags || []).find(t => /\b\d+\s*min\b/i.test(t));
    if (timeTag) {
      const num = parseInt(timeTag.match(/(\d+)\s*min/i)[1], 10);
      if (!isNaN(num)) recipeTime = num;
    }
    const matchesTime = recipeTime <= timeLimit;
    const tags = (r.tags || []).map(t => t.toLowerCase());
    const matchesMeal = selectedMeals.length === 0 || selectedMeals.some(m => tags.includes(m));
    const matchesType = selectedTypes.length === 0 || selectedTypes.some(t => tags.includes(t));
    const matchesCuisine = selectedCuisines.length === 0 || selectedCuisines.some(c => tags.includes(c));
    const matchesLeftover = !leftoverOnly || tags.includes("leftover-safe");
    return matchesTitle && matchesIngredients && matchesTime && matchesMeal && matchesType && matchesCuisine && matchesLeftover;
  });

  renderGallery();
}

// start everything
loadRecipes();
