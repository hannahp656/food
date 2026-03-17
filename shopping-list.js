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

  // helper to parse a numeric amount (including fractions/mixed)
  function parseAmount(amount) {
    if (!amount) return 0;
    const str = amount.toString().trim();
    if (!str) return 0;

    // mixed number like "1 1/2"
    const mixedMatch = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixedMatch) {
      return parseInt(mixedMatch[1], 10) + parseInt(mixedMatch[2], 10) / parseInt(mixedMatch[3], 10);
    }

    // simple fraction like "1/2"
    const fracMatch = str.match(/^(\d+)\/(\d+)$/);
    if (fracMatch) {
      return parseInt(fracMatch[1], 10) / parseInt(fracMatch[2], 10);
    }

    const n = parseFloat(str);
    return isNaN(n) ? 0 : n;
  }

  function formatAmount(n) {
    if (n === 0) return "";
    if (Number.isInteger(n)) return String(n);
    if (n < 1) {
      const denominator = 8;
      const numerator = Math.round(n * denominator);
      const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
      const divisor = gcd(numerator, denominator);
      return `${numerator / divisor}/${denominator / divisor}`;
    }
    const rounded = Math.round(n * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  }

  // 1. collect all ingredients from all meals in mealPlan
  Object.values(mealPlan).forEach(dayObj => {
    Object.values(dayObj).forEach(mealArr => {
      mealArr.forEach(item => {
        // skip items marked as leftovers
        if (item.leftovers) return;
        const recipe = Object.values(recipes).find(r =>
          item.link && (r.link === item.link || item.link.endsWith(r.link))
        );
        if (recipe && Array.isArray(recipe.parsedIngredients)) {
          const recipeServings = parseFloat(recipe.servings) || 1;
          const itemServings = parseFloat(item.servings) || recipeServings || 1;
          const scaleFactor = recipeServings > 0 ? itemServings / recipeServings : 1;

          recipe.parsedIngredients.forEach(i => {
            const parsed = {
              amount: i.amount || "",
              unit: i.unit || "",
              ingredient: i.ingredient || "",
              descriptors: i.descriptors || "",
            };
            const numeric = parseAmount(parsed.amount);
            const scaled = numeric * scaleFactor;
            parsed.amount = formatAmount(scaled);
            allParsed.push(parsed);
          });
        } else if (recipe && Array.isArray(recipe.ingredients)) {
          // Fallback: parse ingredients on the fly if parsedIngredients not available
          const recipeServings = parseFloat(recipe.servings) || 1;
          const itemServings = parseFloat(item.servings) || recipeServings || 1;
          const scaleFactor = recipeServings > 0 ? itemServings / recipeServings : 1;

          recipe.ingredients.forEach(ingLine => {
            const parsed = parseIngredient(ingLine);
            const numeric = parseAmount(parsed.amount);
            const scaled = numeric * scaleFactor;
            parsed.amount = formatAmount(scaled);
            allParsed.push(parsed);
          });
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

  // 5. merge duplicates (singular/plural) by summing amounts
  const combined = {};
  allParsed.forEach(i => {
    const singular = singularize(i.ingredient);
    if (!combined[singular]) {
      combined[singular] = { totalAmount: 0, unit: i.unit || "", measurements: [] };
    }

    // Parse and add the amount
    const amount = parseAmount(i.amount);
    combined[singular].totalAmount += amount;

    // Keep track of measurements for display
    if (i.measurement) combined[singular].measurements.push(i.measurement);
  });

  // 6. format list with summed amounts
  return Object.entries(combined).map(([ingredient, data]) => ({
    ingredient: ingredient.charAt(0).toUpperCase() + ingredient.slice(1),
    measurement: data.measurements.length > 1 ? formatAmount(data.totalAmount) + " " + data.unit : data.measurements[0] || ""
  }));
}

// --- Render ---

function renderShoppingList(list) {
  const container = document.querySelector("#content2");
  if (!container) return;

  // Try to restore from localStorage (with same ingredient names)
  const savedList = JSON.parse(localStorage.getItem("shoppingListState") || "[]");

  // Merge saved checked/edit state with new ingredient data
  list.forEach(item => {
    const match = savedList.find(saved => saved.ingredient === item.ingredient);
    if (match) {
      item.checked = match.checked || false;
      item.measurement = match.measurement || item.measurement;
    } else {
      item.checked = false;
    }
  });

  // Replace list with saved order if it matches same ingredients
  const savedIngredients = savedList.map(i => i.ingredient);
  if (
    savedIngredients.length &&
    savedIngredients.every(i => list.some(j => j.ingredient === i))
  ) {
    list.sort(
      (a, b) =>
        savedIngredients.indexOf(a.ingredient) -
        savedIngredients.indexOf(b.ingredient)
    );
  }

  // render
  container.innerHTML = `
  <div class="shopping-list-container">
    <h2>Shopping List</h2>
      <ul class="shopping-list">
        ${list
          .map(
            (item, i) => `
          <li draggable="true" data-index="${i}" class="${item.checked ? "checked" : ""}">
            <label>
              <input type="checkbox" class="check-item" ${item.checked ? "checked" : ""}/>
              <span class="ingredient">${item.ingredient}</span>:
              <span class="measurement">${item.measurement}</span>
            </label>
            <button class="edit-btn" title="Edit"><i class="fa-solid fa-pen"></i></button>
          </li>`
          )
          .join("")}
      </ul>
  </div>
  `;

  const ul = container.querySelector(".shopping-list");

  // 🔁 Save to localStorage
  function saveListState() {
    const listData = [...ul.querySelectorAll("li")].map(li => ({
      ingredient: li.querySelector(".ingredient").textContent,
      measurement: li.querySelector(".measurement").textContent,
      checked: li.querySelector(".check-item").checked
    }));
    localStorage.setItem("shoppingListState", JSON.stringify(listData));
  }

  // ✅ check/uncheck items
  ul.addEventListener("change", e => {
    if (e.target.classList.contains("check-item")) {
      const li = e.target.closest("li");
      li.classList.toggle("checked");
      if (li.classList.contains("checked")) {
        //li.style.opacity = "0.6";
        //li.style.textDecoration = "line-through";
        ul.appendChild(li); // move to bottom
      } else {
        li.style.opacity = "1";
        li.style.textDecoration = "none";
      }
      saveListState();
    }
  });

  // ✏️ edit item
  ul.addEventListener("click", e => {
    if (e.target.closest(".edit-btn")) {
      const li = e.target.closest("li");
      const ingredientSpan = li.querySelector(".ingredient");
      const measurementSpan = li.querySelector(".measurement");
      const currentText = `${ingredientSpan.textContent}: ${measurementSpan.textContent}`;

      const input = document.createElement("input");
      input.type = "text";
      input.value = currentText;
      input.className = "edit-input";
      input.style.width = "90%";

      li.querySelector("label").replaceWith(input);
      input.focus();

      const saveEdit = () => {
        const [ingredientPart, ...measurePart] = input.value.split(":");
        const newIngredient = ingredientPart.trim();
        const newMeasurement = measurePart.join(":").trim();
        li.innerHTML = `
          <label>
            <input type="checkbox" class="check-item" ${
              li.classList.contains("checked") ? "checked" : ""
            }/>
            <span class="ingredient">${newIngredient}</span>:
            <span class="measurement">${newMeasurement}</span>
          </label>
          <button class="edit-btn" title="Edit"><i class="fa-solid fa-pen"></i></button>
        `;
        saveListState();
      };

      input.addEventListener("blur", saveEdit);
      input.addEventListener("keypress", e => {
        if (e.key === "Enter") saveEdit();
      });
    }
  });

  // 🧲 drag-and-drop reordering
  let dragSrcEl = null;

  ul.addEventListener("dragstart", e => {
    if (e.target.tagName === "LI") {
      dragSrcEl = e.target;
      e.dataTransfer.effectAllowed = "move";
      e.target.classList.add("dragging");
    }
  });

  ul.addEventListener("dragover", e => {
    e.preventDefault();
    const afterElement = getDragAfterElement(ul, e.clientY);
    const dragging = ul.querySelector(".dragging");
    if (afterElement == null) {
      ul.appendChild(dragging);
    } else {
      ul.insertBefore(dragging, afterElement);
    }
  });

  ul.addEventListener("drop", e => {
    e.preventDefault();
    const dragging = ul.querySelector(".dragging");
    if (dragging) dragging.classList.remove("dragging");
    saveListState();
  });

  ul.addEventListener("dragend", e => {
    e.target.classList.remove("dragging");
    saveListState();
  });

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll("li:not(.dragging)")];
    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }

  // save initial state
  saveListState();
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
