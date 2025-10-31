document.addEventListener("DOMContentLoaded", () => {
  const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const meals = ["breakfast","lunch","dinner"];
  const overlay = document.getElementById("overlay");
  const closeOverlay = document.getElementById("closeOverlay");
  const recipeSearch = document.getElementById("recipeSearch");
  const searchResults = document.getElementById("searchResults");
  const customRecipe = document.getElementById("customRecipe");
  let activeMealBox = null;

  // build planner
  const planner = document.getElementById("planner");
  days.forEach(day => {
    const section = document.createElement("div");
    section.className = "day";
    section.innerHTML = `<h2>${day}</h2><div class="meals"></div>`;
    const mealsContainer = section.querySelector(".meals");
    // create meal boxes
    meals.forEach(meal => {
      const box = document.createElement("div");
      box.className = "meal-box";
      box.dataset.day = day.toLowerCase();
      box.dataset.meal = meal;
      box.innerHTML = `
        <div class="meal-header">
          <h3>${meal.charAt(0).toUpperCase() + meal.slice(1)}</h3>
          <div class="controls">
            <button class="add-btn">+</button>
          </div>
        </div>
        <ul class="meal-list"></ul>
      `;
      mealsContainer.appendChild(box);
    });
    // append day section???
    planner.appendChild(section);
  });

  // load saved data
  loadMeals();

  // build shopping list after initial load
  updateShoppingList();

  // add button -> open overlay
  document.querySelectorAll(".add-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      activeMealBox = e.target.closest(".meal-box");
      overlay.classList.remove("hidden");
      recipeSearch.value = "";
      customRecipe.value = "";
      searchResults.innerHTML = "";
    });
  });

  // close overlay
  closeOverlay.addEventListener("click", () => overlay.classList.add("hidden"));

  // search recipes
  recipeSearch.addEventListener("input", async () => {
    const query = recipeSearch.value.toLowerCase();
    searchResults.innerHTML = "";
    if (!query) return;
    // fetch recipes.html and parse for matching titles
    const res = await fetch("recipes.html");
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, "text/html");
    const cards = doc.querySelectorAll(".recipe-card");
    // filter cards by title match
    cards.forEach(card => {
      const title = card.querySelector("h3").textContent;
      const link = card.querySelector("a").getAttribute("href");
      if (title.toLowerCase().includes(query)) {
        const li = document.createElement("li");
        li.textContent = title;
        li.addEventListener("click", () => {
          addMealItem(title, link);
          overlay.classList.add("hidden");
        });
        searchResults.appendChild(li);
      }
    });
  });
  // add custom recipe
  customRecipe.addEventListener("keypress", e => {
    if (e.key === "Enter" && customRecipe.value.trim()) {
      addMealItem(customRecipe.value.trim(), null);
      overlay.classList.add("hidden");
    }
  });

  // add meal item to list
  function addMealItem(title, link, targetBox = activeMealBox) {
    if (!targetBox) return;
    const li = document.createElement("li");
    // if link provided, make title a link
    if (link) {
      const a = document.createElement("a");
      a.href = link;
      a.textContent = title;
      li.appendChild(a);
    } else {
      li.textContent = title;
    }
    // add delete button
    const del = document.createElement("button");
    del.textContent = "✕";
    del.className = "delete-btn";
    del.addEventListener("click", () => {
      li.remove();
      saveMeals();
    });
    li.appendChild(del);
    // append to list
    targetBox.querySelector(".meal-list").appendChild(li);
    saveMeals();
  }

  // save/load to localStorage
  function saveMeals() {
    const data = {};
    document.querySelectorAll(".meal-box").forEach(box => {
      const day = box.dataset.day;
      const meal = box.dataset.meal;
      if (!data[day]) data[day] = {};
      data[day][meal] = [];
      box.querySelectorAll("li").forEach(li => {
        const a = li.querySelector("a");
        data[day][meal].push({
          title: a ? a.textContent : li.childNodes[0].textContent,
          link: a ? a.href : null
        });
      });
    });
    localStorage.setItem("mealPlan", JSON.stringify(data));
    // regenerate shopping list whenever meal plan changes
    updateShoppingList();
  }
  function loadMeals() {
    const data = JSON.parse(localStorage.getItem("mealPlan") || "{}");
    Object.keys(data).forEach(day => {
      Object.keys(data[day]).forEach(meal => {
        const box = document.querySelector(`.meal-box[data-day="${day}"][data-meal="${meal}"]`);
        if (box) {
          const list = box.querySelector(".meal-list");
          data[day][meal].forEach(item => {
            const li = document.createElement("li");
            if (item.link) {
              const a = document.createElement("a");
              a.href = item.link;
              a.textContent = item.title;
              li.appendChild(a);
            } else {
              li.textContent = item.title;
            }
            const del = document.createElement("button");
            del.textContent = "✕";
            del.className = "delete-btn";
            del.addEventListener("click", () => {
              li.remove();
              saveMeals();
            });
            li.appendChild(del);
            list.appendChild(li);
          });
        }
      });
    });
    // after loading meals, rebuild shopping list
    updateShoppingList();
  }

  // ----- Shopping list functionality -----
  const shoppingContainer = document.getElementById('content2');
  // create shopping list UI if not present
  function ensureShoppingUI() {
    const existing = document.getElementById('shoppingListContainer');
    if (existing) return existing;
    const container = document.createElement('div');
    container.id = 'shoppingListContainer';
    container.className = 'container shopping-list-container';
    container.innerHTML = `
      <div class="shopping-actions" style="margin-bottom:12px;">
        <button id="clearChecked" class="button">Clear Checked</button>
        <button id="saveShoppingOrder" class="button button--secondary">Save Order</button>
      </div>
      <ul id="shoppingList" class="shopping-list"></ul>
    `;
    shoppingContainer.innerHTML = '';
    shoppingContainer.appendChild(container);
    return container;
  }

  // Storage for user modifications (order, checked state, edited names)
  const SHOPPING_KEY = 'shoppingState_v1';
  let shoppingState = JSON.parse(localStorage.getItem(SHOPPING_KEY) || '{}');

  function saveShoppingState() {
    localStorage.setItem(SHOPPING_KEY, JSON.stringify(shoppingState));
  }

  // simple ingredient parser: returns {name, amountUnit}
  function parseIngredient(line) {
    if (!line) return { name: line || '', amountUnit: '' };
    // split at comma to remove descriptors
    const [beforeComma] = line.split(/,(.+)/);
    const parts = beforeComma.trim().split(/\s+/);

    // amount detection: numbers, fractions like 1/2 or 2 1/2
    let amount = '';
    let unit = '';
    let idx = 0;
    if (/^(\d+([\/\.]\d+)?|\d+\s+\d+\/\d+)$/.test(parts[0])) {
      amount = parts[0]; idx = 1;
      if (parts[1] && /^\d+\/\d+$/.test(parts[1])) { amount += ' ' + parts[1]; idx = 2; }
    }
    const units = ["cup","cups","tbsp","tbs","tsp","teaspoon","teaspoons","tablespoon","tablespoons","g","kg","ml","l","oz","lb","pound","pounds","clove","cloves","slice","slices","can","cans","package","packages","breast","breasts","pinch","handful","dash"];
    if (parts[idx] && units.includes(parts[idx].toLowerCase())) { unit = parts[idx]; idx += 1; }

    const name = parts.slice(idx).join(' ').trim() || beforeComma.trim();
    const amountUnit = [amount, unit].filter(Boolean).join(' ').trim();
    return { name: name.toLowerCase(), displayName: name, amountUnit };
  }

  // Aggregate ingredients: returns Map keyed by normalized name -> {name, displayName, amounts:Set}
  async function aggregateIngredientsFromMealPlan() {
    const data = JSON.parse(localStorage.getItem('mealPlan') || '{}');
    const recipeCache = {}; // cache fetched recipe data by link
    const aggregated = new Map();

    const fetchRecipeJSON = async (href) => {
      if (!href) return null;
      if (recipeCache[href]) return recipeCache[href];
      try {
        const res = await fetch(href);
        if (!res.ok) return null;
        const text = await res.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const dataEl = doc.querySelector('#recipe-data');
        if (!dataEl) return null;
        const json = JSON.parse(dataEl.textContent);
        recipeCache[href] = json;
        return json;
      } catch (err) {
        console.warn('Failed to fetch recipe', href, err);
        return null;
      }
    };

    // iterate mealPlan structure
    for (const day of Object.keys(data)) {
      for (const meal of Object.keys(data[day])) {
        for (const item of data[day][meal]) {
          if (item.link) {
            const json = await fetchRecipeJSON(item.link);
            if (json && Array.isArray(json.ingredients)) {
              for (const line of json.ingredients) {
                const parsed = parseIngredient(line);
                const key = parsed.name || parsed.displayName || line;
                if (!aggregated.has(key)) aggregated.set(key, { displayName: parsed.displayName || key, amounts: new Map() });
                const entry = aggregated.get(key);
                const am = parsed.amountUnit || line.trim();
                if (am) entry.amounts.set(am, (entry.amounts.get(am) || 0) + 1);
              }
            }
          } else {
            // custom recipe or text-only item: treat entire text as one ingredient line
            const parsed = parseIngredient(item.title || '');
            const key = parsed.name || parsed.displayName || item.title;
            if (!aggregated.has(key)) aggregated.set(key, { displayName: parsed.displayName || key, amounts: new Map() });
            const entry = aggregated.get(key);
            const am = parsed.amountUnit || '';
            if (am) entry.amounts.set(am, (entry.amounts.get(am) || 0) + 1);
          }
        }
      }
    }

    return aggregated;
  }

  // Render shopping list from aggregated map, preserving saved order and checked state
  async function updateShoppingList() {
    const ui = ensureShoppingUI();
    const listEl = document.getElementById('shoppingList');
    listEl.innerHTML = '<li style="color:var(--muted)">Updating shopping list...</li>';
    const aggregated = await aggregateIngredientsFromMealPlan();

    // build array of items
    const items = [];
    for (const [key, v] of aggregated.entries()) {
      const amounts = Array.from(v.amounts.keys());
      // format: if one amount -> name, amount ; if multiple -> name, amount1, amount2
      items.push({ key, name: v.displayName, amounts });
    }

    // sort by saved order if exists
    const savedOrder = shoppingState.order || [];
    const ordered = [];
    const remaining = [];
    items.forEach(it => {
      if (savedOrder.includes(it.key)) ordered.push(it);
      else remaining.push(it);
    });
    const finalList = [...ordered, ...remaining];

    // render
    listEl.innerHTML = '';
    finalList.forEach(it => {
      const li = document.createElement('li');
      li.className = 'shopping-item';
      li.draggable = true;
      li.dataset.key = it.key;
      const checked = shoppingState.checked && shoppingState.checked[it.key];
      li.innerHTML = `
        <label class="shopping-line">
          <input type="checkbox" class="shopping-checkbox" ${checked ? 'checked' : ''}>
          <span class="item-name" contenteditable="true">${escapeHtml(it.name)}</span>
          <span class="item-amounts">${it.amounts.map(a => escapeHtml(a)).join(', ')}</span>
        </label>
        <button class="drag-handle" title="Drag to reorder">☰</button>
      `;
      if (checked) {
        li.classList.add('checked');
        li.style.opacity = '0.6';
        li.style.textDecoration = 'line-through';
      }
      listEl.appendChild(li);
    });

    attachShoppingHandlers();
  }

  function escapeHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function attachShoppingHandlers() {
    const listEl = document.getElementById('shoppingList');
    // drag reorder
    let dragSrc = null;
    listEl.querySelectorAll('.shopping-item').forEach(li => {
      li.addEventListener('dragstart', e => { dragSrc = li; li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
      li.addEventListener('dragend', () => { if (dragSrc) dragSrc.classList.remove('dragging'); dragSrc = null; saveOrderFromDOM(); });
      li.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
      li.addEventListener('drop', e => {
        e.preventDefault();
        if (dragSrc && dragSrc !== li) {
          li.parentNode.insertBefore(dragSrc, li.nextSibling);
        }
      });
    });

    // checkboxes
    listEl.querySelectorAll('.shopping-checkbox').forEach(cb => {
      cb.addEventListener('change', e => {
        const li = e.target.closest('.shopping-item');
        const key = li.dataset.key;
        shoppingState.checked = shoppingState.checked || {};
        shoppingState.checked[key] = e.target.checked;
        if (e.target.checked) {
          li.classList.add('checked');
          li.style.opacity = '0.6';
          li.style.textDecoration = 'line-through';
          // move to bottom
          li.parentNode.appendChild(li);
        } else {
          li.classList.remove('checked');
          li.style.opacity = '';
          li.style.textDecoration = '';
          // move to top region (before first checked)
          const firstChecked = Array.from(li.parentNode.querySelectorAll('.shopping-item.checked'))[0];
          if (firstChecked) li.parentNode.insertBefore(li, firstChecked);
          else li.parentNode.insertBefore(li, li.parentNode.firstChild);
        }
        saveShoppingState();
        saveOrderFromDOM();
      });
    });

    // editable names
    listEl.querySelectorAll('.item-name').forEach(span => {
      span.addEventListener('blur', e => {
        const li = e.target.closest('.shopping-item');
        const key = li.dataset.key;
        shoppingState.edits = shoppingState.edits || {};
        shoppingState.edits[key] = e.target.textContent.trim();
        saveShoppingState();
      });
      // commit on Enter
      span.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); span.blur(); } });
    });

    // clear checked
    const clearBtn = document.getElementById('clearChecked');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      shoppingState.checked = {};
      saveShoppingState();
      // remove checked items from DOM
      const list = document.getElementById('shoppingList');
      Array.from(list.querySelectorAll('.shopping-item.checked')).forEach(li => li.remove());
      saveOrderFromDOM();
    });

    const saveOrderBtn = document.getElementById('saveShoppingOrder');
    if (saveOrderBtn) saveOrderBtn.addEventListener('click', saveOrderFromDOM);
  }

  function saveOrderFromDOM() {
    const list = document.getElementById('shoppingList');
    if (!list) return;
    const order = Array.from(list.querySelectorAll('.shopping-item')).map(li => li.dataset.key);
    shoppingState.order = order;
    saveShoppingState();
  }


  // render saved recipes
  function loadSavedRecipes() {
    const container = document.getElementById("savedRecipesList");
    container.innerHTML = "";
    const saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]");
    saved.forEach((recipe, index) => {
      const card = document.createElement("div");
      card.className = "recipe-card";
      card.draggable = true;
      card.dataset.index = index;
      // FIX WHATEVERS GOING ON WITH THE X - build card content
      card.innerHTML = `
        <img src="${recipe.image}" alt="${recipe.title}">
        <div class="content">
          <h3>${recipe.title}</h3>
          <div class="card-tags">${recipe.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}</div>
          <a href="${recipe.link}" target="_blank">View Recipe</a>
          <button class="delete-saved">✕</button>
        </div>
      `;
      // drag start
      card.addEventListener("dragstart", e => {
        e.dataTransfer.setData("application/json", JSON.stringify(recipe));
      });
      // delete saved recipe
      card.querySelector(".delete-saved").addEventListener("click", () => {
        let updated = JSON.parse(localStorage.getItem("savedRecipes") || "[]");
        updated.splice(index, 1);
        localStorage.setItem("savedRecipes", JSON.stringify(updated));
        loadSavedRecipes();
      });
      // append card
      container.appendChild(card);
    });
  }
  loadSavedRecipes();

  // print meal plan
  document.getElementById("printPlan").addEventListener("click", () => {
    const data = JSON.parse(localStorage.getItem("mealPlan") || "{}");
    let html = `
      <html>
        <head>
          <title>Printable Meal Plan</title>
          <style>
            body { font-family: Montserrat, sans-serif; padding: 20px; background: #f8fbf6; }
            h1 { text-align: center; color: #3a4d39; }
            .day { margin-bottom: 24px; background: #fff; padding: 16px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
            .day h2 { margin: 0 0 10px; color: #7a9d54; }
            .meal { margin-bottom: 8px; }
            .meal h3 { margin: 0 0 6px; color: #3a4d39; }
            ul { list-style: none; padding: 0; margin: 0 0 12px; }
            li { margin: 4px 0; }
            a { color: #7a9d54; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <h1>Weekly Meal Plan</h1>
    `;
    Object.keys(data).forEach(day => {
      html += `<div class="day"><h2>${day.charAt(0).toUpperCase() + day.slice(1)}</h2>`;
      Object.keys(data[day]).forEach(meal => {
        html += `<div class="meal"><h3>${meal.charAt(0).toUpperCase() + meal.slice(1)}</h3><ul>`;
        data[day][meal].forEach(item => {
          if (item.link) {
            html += `<li><a href="${item.link}" target="_blank">${item.title}</a></li>`;
          } else {
            html += `<li>${item.title}</li>`;
          }
        });
        html += `</ul></div>`;
      });
      html += `</div>`;
    });
    html += `</body></html>`;
    const newTab = window.open();
    newTab.document.write(html);
    newTab.document.close();
  });

  // make meal lists droppable
  document.querySelectorAll(".meal-list").forEach(list => {
    list.addEventListener("dragover", e => {
      e.preventDefault();
      list.style.background = "rgba(122,157,84,0.08)";
    });
    list.addEventListener("dragleave", () => {
      list.style.background = "";
    });
    list.addEventListener("drop", e => {
      e.preventDefault();
      list.style.background = "";
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      addMealItem(data.title, data.link, list.closest(".meal-box"));
    });
  });

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      // deactivate all tabs and content
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

      // activate clicked tab and corresponding content
      btn.classList.add("active");
      const tabId = btn.dataset.tab;
      document.getElementById(tabId).classList.add("active");
    });
  });

});
