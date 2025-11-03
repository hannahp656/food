// shopping-list.js

// Utility: Singularize ingredient names (basic, can be improved)
function singularize(word) {
  if (word.endsWith('es')) return word.slice(0, -2);
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

// Utility: Remove descriptors (e.g., "chopped", "fresh", "to taste")
function cleanIngredientName(name) {
  // Remove anything after a comma or parenthesis
  return name.split(',')[0].split('(')[0].trim().toLowerCase();
}

// Utility: Combine measurements for same ingredient
function combineIngredients(ingredients) {
  const combined = {};
  ingredients.forEach(ing => {
    const name = singularize(cleanIngredientName(ing.name));
    if (!combined[name]) {
      combined[name] = { amount: [], name: name };
    }
    if (ing.amount) {
      combined[name].amount.push(ing.amount);
    }
  });
  // Format output
  return Object.values(combined).map(ing => ({
    name: ing.name,
    amount: ing.amount.length ? ing.amount.join(', ') : ''
  }));
}

// Load all recipes listed in recipeFiles
async function loadAllRecipes() {
  const recipes = {};
  const fetches = recipeFiles.map(file =>
    fetch(file)
      .then(res => res.text())
      .then(html => {
        // Extract injected JSON from HTML
        const match = html.match(/<script id="recipeData".*?>([\s\S]*?)<\/script>/);
        if (match) {
          try {
            const data = JSON.parse(match[1]);
            recipes[data.slug || file] = data;
          } catch (e) {}
        }
      })
      .catch(() => {})
  );
  await Promise.all(fetches);
  return recipes;
}

// Get meal plan from localStorage
function getMealPlan() {
  try {
    const raw = localStorage.getItem('mealPlan');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
    return {};
  } catch {
    return {};
  }
}

// Aggregate all parsedIngredients from selected meals
function getShoppingList(recipes, mealPlan) {
  const allIngredients = [];
  Object.values(mealPlan).forEach(mealsObj => {
    Object.values(mealsObj).forEach(mealArr => {
      mealArr.forEach(item => {
        // Find recipe by link (or slug if available)
        const recipe = Object.values(recipes).find(r => r.link === item.link);
        if (recipe && Array.isArray(recipe.parsedIngredients)) {
          allIngredients.push(...recipe.parsedIngredients);
        }
      });
    });
  });
  return combineIngredients(allIngredients);
}

// Render shopping list in #content2
function renderShoppingList(list) {
  const container = document.querySelector('#content2');
  if (!container) return;
  container.innerHTML = `
    <h2>Shopping List</h2>
    ${list.length === 0 ? '<p>No meals selected.</p>' : `
      <ul class="shopping-list">
        ${list.map(item =>
          `<li><span class="ingredient">${item.name}</span>${item.amount ? ` <span class="amount">${item.amount}</span>` : ''}</li>`
        ).join('')}
      </ul>
    `}
  `;
}

// Main: Load recipes, get meal plan, render shopping list
async function updateShoppingList() {
  const recipes = await loadAllRecipes();
  const mealPlan = getMealPlan();
  const shoppingList = getShoppingList(recipes, mealPlan);
  renderShoppingList(shoppingList);
}

// Update shopping list on tab switch or meal plan change
document.addEventListener('DOMContentLoaded', () => {
  // If using tabs, update when Shopping List tab is shown
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      if (btn.dataset.tab === 'content2') updateShoppingList();
    });
  });
  // Optionally, update when meal plan changes
  window.addEventListener('mealPlanUpdated', updateShoppingList);
});