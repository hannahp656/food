// Use the shared recipe list

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
      allRecipes.push(data);
    } catch (err) {
      console.error("Error loading recipe:", file, err);
    }
  }
  allIngredients = [...new Set(allIngredients)].sort(); // delete duplicate ingredients
  console.log("allIngredients loaded:", allIngredients.length, allIngredients.slice(0, 10)); // debug: check if ingredients are loaded
  filteredRecipes = [...allRecipes];
  // expose in-memory recipe list for other scripts (planner inline search)
  try { window.allRecipes = allRecipes; } catch (err) { /* ignore in restrictive envs */ }
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
  filteredRecipes.forEach(data => {
    const card = document.createElement("div");
    card.className = "recipe-card";
    card.innerHTML = `
      <div style="position:relative;">
        <img src="${data.image}" alt="${data.title}">
        <button class="saveRecipeBtn button button--secondary" style="position:absolute;top:12px;right:12px;z-index:2;">
          <i class="fa-regular fa-bookmark"></i>
        </button>
      </div>
      <div class="content">
        <h3>${data.title}</h3>
        <div class="card-tags">
          ${data.tags.map(tag => {
            if (/\bmin\b|\bhour\b/i.test(tag)) {
              return `<span class="tag"><i class="fa-regular fa-clock"></i> ${tag}</span>`;
            }
            else if (/\$/.test(tag)) {
              return `<span class="tag"><i class="fa-regular fa-money-bill-1"></i> ${tag}</span>`;
            }
            else return `<span class="tag"><i class="fa-solid fa-bell-concierge"></i> ${tag}</span>`;
          }
          ).join("")}
        </div>
        <a href="${data.link}">View Recipe</a>
      </div>
    `;
    // clicking elsewhere on card goes to recipe page
    card.addEventListener("click", e => {
      // if click happened inside the save button, ignore navigation
      if (!e.target.closest(".saveRecipeBtn")) {
        window.location.href = data.link;
      }
    });
    // find the card's save button (scoped to this card)
    const saveBtn = card.querySelector(".saveRecipeBtn");
    const icon = saveBtn.querySelector("i");
    // initialize icon from localStorage
    let saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]");
    const currentlySaved = saved.some(r => r.link === data.link);
    icon.classList.toggle("fa-solid", currentlySaved);
    icon.classList.toggle("fa-regular", !currentlySaved);
    // toggle save on click (stop propagation so card click doesn't fire)
    saveBtn.addEventListener("click", e => {
      e.stopPropagation();
      saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]");
      const isSaved = saved.some(r => r.link === data.link);
      if (isSaved) {
        saved = saved.filter(r => r.link !== data.link);
        icon.classList.remove("fa-solid");
        icon.classList.add("fa-regular");
      } else {
        // Save a copy of the recipe date
        const toSave = {
          title: data.title,
          link: data.link,
          image: data.image,
          tags: data.tags,
          ingredients: data.ingredients || [],
          parsedIngredients: data.parsedIngredients || []
        };
        saved.push(toSave);
        icon.classList.remove("fa-regular");
        icon.classList.add("fa-solid");
      }
      localStorage.setItem("savedRecipes", JSON.stringify(saved));
      // update other parts of the app that care about saved recipes
      window.dispatchEvent(new CustomEvent("savedRecipesUpdated", { detail: { saved } }));
    });
    gallery.appendChild(card);
  });
}


// function to set up search and filters
function setupSearchAndFilters() {
  const titleSearch = document.getElementById("titleSearch");
  const openBtn = document.getElementById("openFiltersBtn");
  const closeBtn = document.getElementById("closeFiltersBtn");
  const filterDropdown = document.getElementById("filterDropdown");
  const ingredientSearch = document.getElementById("ingredientSearch");
  const selectedContainer = document.getElementById("selectedIngredients");
  const maxCostInput = document.getElementById("maxCostInput");
  const leftoverCheckbox = document.getElementById("leftoverCheckbox");
  const applyBtn = document.getElementById("applyFiltersBtn");
  const clearBtn = document.getElementById("clearFiltersBtn");
  // tag groups
  const mealTypeTags = document.querySelectorAll('.meal-type .filter-tag');
  const timeTags = document.querySelectorAll('.time-tags .filter-tag');
  const otherTags = document.querySelectorAll('.other-tags .filter-tag');
  // tag click behavior
  const toggleTag = (btn) => btn.classList.toggle('active');
  mealTypeTags.forEach(btn => btn.addEventListener('click', () => { toggleTag(btn); }));
  timeTags.forEach(btn => btn.addEventListener('click', () => {
    // single-select time tags
    timeTags.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }));
  otherTags.forEach(btn => btn.addEventListener('click', () => { toggleTag(btn); }));

  // leftover checkbox setup
  if (leftoverCheckbox) leftoverCheckbox.addEventListener("change", applyFilters);
  // when ingredients change via selected list, applyFilters will be called
  // cost input: apply filters on blur or Enter
  if (maxCostInput) {
    maxCostInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyFilters(); });
    maxCostInput.addEventListener('blur', () => applyFilters());
  }
  // title search setup
  if (titleSearch) titleSearch.addEventListener("input", () => applyFilters());
  // dropdown open/close (no overlay: explicit toggle only)
  function openDropdown() { filterDropdown.classList.add('open'); if (openBtn) { openBtn.classList.add('open'); openBtn.setAttribute('aria-expanded','true'); } }
  function closeDropdown() { filterDropdown.classList.remove('open'); if (openBtn) { openBtn.classList.remove('open'); openBtn.setAttribute('aria-expanded','false'); } }
  if (openBtn) openBtn.addEventListener('click', () => { if (filterDropdown.classList.contains('open')) closeDropdown(); else openDropdown(); });
  if (closeBtn) closeBtn.addEventListener('click', closeDropdown);
  // ingredient search and filter
  let floatingSuggestions = null; // for floating suggestions
  let blurTimeout = null; // to delay hide on blur
  if (ingredientSearch) {
    ingredientSearch.addEventListener("input", e => {
      const query = e.target.value.toLowerCase().trim();
      console.log("ingredient search input:", query); // debug: check if input event fires
      // clear any pending blur timeout
      if (blurTimeout) clearTimeout(blurTimeout);
      // remove existing floating
      if (floatingSuggestions) {
        floatingSuggestions.remove();
        floatingSuggestions = null;
      }
      if (!query) {
        return;
      }
      const matches = allIngredients.filter(ing => ing.includes(query) && !selectedIngredients.includes(ing));
      console.log("matches found:", matches.length, matches.slice(0, 5)); // debug: check matches
      if (matches.length === 0) {
        return;
      }
      // create floating suggestions
      floatingSuggestions = document.createElement('ul');
      floatingSuggestions.className = 'inline-suggestions floating';
      floatingSuggestions.innerHTML = matches.map(ing => `<li role="option">${ing}</li>`).join("");
      document.body.appendChild(floatingSuggestions);
      // position it below the input
      const rect = ingredientSearch.getBoundingClientRect();
      floatingSuggestions.style.position = 'fixed';
      floatingSuggestions.style.left = rect.left + 'px';
      floatingSuggestions.style.top = (rect.bottom + 6) + 'px';
      floatingSuggestions.style.width = rect.width + 'px';
      floatingSuggestions.style.zIndex = '1000';
      // add click handler
      floatingSuggestions.addEventListener("click", e => {
        e.stopPropagation(); // prevent document click from hiding
        if (e.target.tagName === "LI") {
          const ing = e.target.textContent;
          if (!selectedIngredients.includes(ing)) selectedIngredients.push(ing);
          ingredientSearch.value = "";
          if (floatingSuggestions) {
            floatingSuggestions.remove();
            floatingSuggestions = null;
          }
          renderSelectedIngredients();
        }
      });
      // hide on outside click
      const hideSuggestions = () => {
        if (floatingSuggestions) {
          floatingSuggestions.remove();
          floatingSuggestions = null;
        }
      };
      document.addEventListener('click', hideSuggestions, { once: true });
      // delayed hide on blur
      ingredientSearch.addEventListener('blur', () => {
        blurTimeout = setTimeout(() => {
          hideSuggestions();
        }, 150); // small delay to allow click on li
      });
    });
    // allow keyboard selection
    ingredientSearch.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' && floatingSuggestions) {
        const first = floatingSuggestions.querySelector('li');
        if (first) first.focus();
      }
    });
  }
  function renderSelectedIngredients() {  // render selected ingredient filters
    selectedContainer.innerHTML = selectedIngredients.map(ing => `
      <span class="tag">${ing}
        <button data-ing="${ing}" title="Remove">&times;</button>
      </span>
    `).join("");
    // if dropdown is closed and there are selected ingredients, open it to show tags
    if (selectedIngredients.length && !filterDropdown.classList.contains('open')) openDropdown();
    applyFilters();
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
      closeDropdown();
    });
  }
  // clear filters
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (titleSearch) titleSearch.value = "";  // Reset title
      selectedIngredients = []; // Reset ingredient inputs & tags
      if (ingredientSearch) ingredientSearch.value = "";
      if (selectedContainer) selectedContainer.innerHTML = "";
      // reset tag groups
      document.querySelectorAll('.filter-tag').forEach(b => b.classList.remove('active'));
      if (maxCostInput) maxCostInput.value = '';
      if (leftoverCheckbox) leftoverCheckbox.checked = false; // Reset leftover checkbox
      applyFilters(); // Reapply filters and keep dropdown closed
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
function parsePrice(tag) {
    if (!tag) return null;
    const m = tag.toString().match(/(\d+(?:\.\d+)?|\.\d+)/);
    if (!m) return null;
    const n = parseFloat(m[0]);
    return isNaN(n) ? null : n;
  }

  function applyFilters() {
    const titleEl = document.getElementById("titleSearch");
    const titleQuery = titleEl ? titleEl.value.toLowerCase().trim() : "";
    const leftoverCheckbox = document.getElementById("leftoverCheckbox");
    const leftoverOnly = leftoverCheckbox ? leftoverCheckbox.checked : false;
    const maxCost = maxCostInput && maxCostInput.value ? parseFloat(maxCostInput.value) : null;
    const selectedMealTypes = Array.from(document.querySelectorAll('.meal-type .filter-tag.active')).map(b => b.dataset.value.toLowerCase());
    const selectedOtherTags = Array.from(document.querySelectorAll('.other-tags .filter-tag.active')).map(b => b.dataset.value.toLowerCase());
    const timeBtn = document.querySelector('.time-tags .filter-tag.active');
    const timeLimitObj = timeBtn ? { value: parseInt(timeBtn.dataset.value,10), range: timeBtn.dataset.range } : null;

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
      let matchesTime = true;
      if (timeLimitObj) {
        if (timeLimitObj.range === 'gte') matchesTime = recipeTime >= timeLimitObj.value;
        else matchesTime = recipeTime <= timeLimitObj.value;
      }

      const tags = (r.tags || []).map(t => t.toLowerCase());
      const matchesMealType = selectedMealTypes.length === 0 || selectedMealTypes.some(m => tags.includes(m));
      const matchesOtherTags = selectedOtherTags.length === 0 || selectedOtherTags.some(t => tags.includes(t));
      const matchesLeftover = !leftoverOnly || tags.includes("leftover-safe");

      // cost filtering: include recipes without a $ tag (treat as unknown price)
      let matchesCost = true;
      if (maxCost !== null) {
        const priceTag = (r.tags || []).find(t => /^\$/.test(t));
        const price = parsePrice(priceTag);
        matchesCost = (price === null) || (price <= maxCost);
      }

      // return filtered result
      return (
        matchesTitle &&
        matchesIngredients &&
        matchesTime &&
        matchesMealType &&
        matchesOtherTags &&
        matchesLeftover &&
        matchesCost
      );
    });
    renderGallery();
  }

// Load everything
loadRecipes();
