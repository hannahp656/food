// shopping-list.js

// --- Utility functions ---

// singularize basic plurals (e.g. "eggs" → "egg", "tomatoes" → "tomato")
function singularize(word) {
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("es")) return word.slice(0, -2);
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
}

// remove descriptors and lowercase the name
function cleanName(name) {
  return name.split(",")[0].split("(")[0].trim().toLowerCase();
}

// load recipe data from recipe files
async function loadAllRecipes() {
  const recipes = {};
  const fetches = recipeFiles.map(file =>
    fetch(file)
      .then(res => res.text())
      .then(html => {
        const match = html.match(/<script id="recipe-data"[^>]*>([\s\S]*?)<\/script>/);
        if (match) {
          try {
            const data = JSON.parse(match[1]);
            recipes[data.link || file] = data;
          } catch {}
        }
      })
      .catch(() => {})
  );
  await Promise.all(fetches);
  return recipes;
}

// get meal plan from localStorage
function getMealPlan() {
  try {
    return JSON.parse(localStorage.getItem("mealPlan") || "{}");
  } catch {
    return {};
  }
}

// --- Main logic ---

function parseAndCombineIngredients(recipes, mealPlan) {
  let allParsed = [];

  // 1. collect all ingredients from all meals in mealPlan
  Object.values(mealPlan).forEach(dayObj => {
    Object.values(dayObj).forEach(mealArr => {
      mealArr.forEach(item => {
        const recipe = Object.values(recipes).find(r => r.link === item.link);
        if (recipe && Array.isArray(recipe.parsedIngredients)) {
          allParsed.push(...recipe.parsedIngredients);
        }
      });
    });
  });

  // 2. strip descriptors
  allParsed = allParsed.map(i => ({
    amount: i.amount || "",
    unit: i.unit || "",
    ingredient: cleanName(i.ingredient || "")
  }));

  // 3. sort alphabetically by ingredient
  allParsed.sort((a, b) => a.ingredient.localeCompare(b.ingredient));

  // 4. combine amount+unit into one string "measurement"
  allParsed = allParsed.map(i => ({
    measurement: `${i.amount} ${i.unit}`.trim(),
    ingredient: i.ingredient
  }));

  // 5. merge duplicates (singular/plural)
  const combined = {};
  allParsed.forEach(i => {
    const singular = singularize(i.ingredient);
    if (!combined[singular]) combined[singular] = [];
    if (i.measurement) combined[singular].push(i.measurement);
  });

  // 6. format list
  return Object.entries(combined).map(([ingredient, measurements]) => ({
    ingredient: ingredient.charAt(0).toUpperCase() + ingredient.slice(1),
    measurement: measurements.join(", ")
  }));
}

// --- Render ---

function renderShoppingList(list) {
  const container = document.querySelector("#content2");
  if (!container) return;

  if (!list.length) {
    container.innerHTML = `<h2>Shopping List</h2><p>No meals selected.</p>`;
    return;
  }

  container.innerHTML = `
    <h2>Shopping List</h2>
    <ul class="shopping-list">
      ${list
        .map(
          item => `
        <li>
          <label>
            <input type="checkbox" class="check-item" />
            <span class="ingredient">${item.ingredient}</span>: 
            <span class="measurement">${item.measurement}</span>
          </label>
        </li>`
        )
        .join("")}
    </ul>
  `;

  // mark checked items and move them down
  const ul = container.querySelector(".shopping-list");
  ul.addEventListener("change", e => {
    if (e.target.classList.contains("check-item")) {
      const li = e.target.closest("li");
      li.classList.toggle("checked");
      if (li.classList.contains("checked")) {
        li.style.opacity = "0.6";
        ul.appendChild(li); // move to bottom
      } else {
        li.style.opacity = "1";
      }
    }
  });
}

// --- Update shopping list when needed ---

async function updateShoppingList() {
  const recipes = await loadAllRecipes();
  const mealPlan = getMealPlan();
  const list = parseAndCombineIngredients(recipes, mealPlan);
  renderShoppingList(list);
}

document.addEventListener("DOMContentLoaded", () => {
  // update when switching to Shopping List tab
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.tab === "content2") updateShoppingList();
    });
  });

  // update dynamically if meal plan changes
  window.addEventListener("mealPlanUpdated", updateShoppingList);
});
