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
        const recipe = Object.values(recipes).find(r =>
        item.link && (r.link === item.link || item.link.endsWith(r.link))
        );
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
          (item, i) => `
        <li draggable="true" data-index="${i}">
          <label>
            <input type="checkbox" class="check-item" />
            <span class="ingredient">${item.ingredient}</span>:
            <span class="measurement">${item.measurement}</span>
          </label>
          <button class="edit-btn" title="Edit"><i class="fa-solid fa-pen"></i></button>
        </li>`
        )
        .join("")}
    </ul>
  `;

  const ul = container.querySelector(".shopping-list");

  // ✅ check/uncheck items and move them down
  ul.addEventListener("change", e => {
    if (e.target.classList.contains("check-item")) {
      const li = e.target.closest("li");
      li.classList.toggle("checked");
      if (li.classList.contains("checked")) {
        li.style.opacity = "0.6";
        li.style.textDecoration = "line-through";
        ul.appendChild(li); // move to bottom
      } else {
        li.style.opacity = "1";
        li.style.textDecoration = "none";
      }
    }
  });

  // ✅ enable inline editing
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
            <input type="checkbox" class="check-item" ${li.classList.contains("checked") ? "checked" : ""}/>
            <span class="ingredient">${newIngredient}</span>: 
            <span class="measurement">${newMeasurement}</span>
          </label>
          <button class="edit-btn" title="Edit"><i class="fa-solid fa-pen"></i></button>
        `;
      };

      input.addEventListener("blur", saveEdit);
      input.addEventListener("keypress", e => {
        if (e.key === "Enter") {
          saveEdit();
        }
      });
    }
  });

  // ✅ drag-and-drop reordering
  let dragSrcEl = null;

  ul.addEventListener("dragstart", e => {
    if (e.target.tagName === "LI") {
      dragSrcEl = e.target;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", e.target.dataset.index);
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
    dragging.classList.remove("dragging");
  });

  ul.addEventListener("dragend", e => {
    e.target.classList.remove("dragging");
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
