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

  // load saved data (moved below after helper functions to avoid TDZ issues)

  // add button -> open overlay
  document.querySelectorAll(".add-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      activeMealBox = e.target.closest(".meal-box");
      if (overlay) overlay.classList.remove("hidden");
      if (recipeSearch) recipeSearch.value = "";
      if (customRecipe) customRecipe.value = "";
      if (searchResults) searchResults.innerHTML = "";
    });
  });

  // close overlay (if present)
  if (closeOverlay && overlay) {
    closeOverlay.addEventListener("click", () => overlay.classList.add("hidden"));
  }

  // cache for fetched recipe JSONs (keyed by href)
  const recipeTagCache = {};
  // cache parsed recipe index for inline suggestions
  let recipesCache = null;

  async function fetchRecipesIndex() {
    if (recipesCache) return recipesCache;
    try {
      const res = await fetch("recipes.html");
      if (!res.ok) return [];
      const text = await res.text();
      const doc = new DOMParser().parseFromString(text, "text/html");
      const cards = Array.from(doc.querySelectorAll(".recipe-card"));
      recipesCache = cards.map(card => {
        const title = card.querySelector("h3").textContent.trim();
        const link = card.querySelector("a").getAttribute("href");
        const priceEl = card.querySelector('.card-tags .tag');
        const price = priceEl ? priceEl.textContent.trim() : null;
        return { title, link, price };
      });
      return recipesCache;
    } catch (err) {
      console.warn('Failed to load recipes index for suggestions', err);
      return [];
    }
  }

  async function fetchFirstPriceTag(href) {
    if (!href) return null;
    if (recipeTagCache[href]) return recipeTagCache[href];
    try {
      const res = await fetch(href);
      if (!res.ok) return null;
      const text = await res.text();
      const doc = new DOMParser().parseFromString(text, "text/html");
      const dataEl = doc.querySelector("#recipe-data");
      if (!dataEl) return null;
      const json = JSON.parse(dataEl.textContent);
      const tag = Array.isArray(json.tags) ? json.tags.find(t => /^\$/.test(t)) : null;
      recipeTagCache[href] = tag || null;
      return recipeTagCache[href];
    } catch (err) {
      console.warn('Failed to fetch recipe for price tag', href, err);
      return null;
    }
  }

  // create a meal list <li> with cost, title/link, leftovers toggle, and delete button
  function createMealListItem(title, link, costTag, leftoversActive = false) {
    const li = document.createElement('li');
    li.dataset.title = title;
    if (link) li.dataset.link = link;

    // cost element (styled like a tag)
    const cost = document.createElement('span');
    cost.className = 'tag meal-cost';
    if (costTag) cost.textContent = costTag;
    // make cost editable: click to replace with input, Enter to save
    cost.addEventListener('click', (e) => {
      e.stopPropagation();
      const current = (cost.textContent || '').trim();
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'inline-cost-input';
      // strip leading $ when editing
      input.value = current && current.startsWith('$') ? current.slice(1) : (current === '$???' ? '' : current);
      input.style.width = '70px';
      cost.replaceWith(input);
      input.focus();
      input.select();
      const finish = () => {
        const v = input.value.trim();
        if (!v) {
          cost.textContent = '$???';
        } else {
          const n = parseFloat(v);
          if (!isNaN(n)) cost.textContent = '$' + n.toFixed(2);
          else cost.textContent = '$' + v;
        }
        input.replaceWith(cost);
        saveMeals();
        updateTotalCost();
      };
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') finish();
        if (ev.key === 'Escape') { input.replaceWith(cost); }
      });
      input.addEventListener('blur', finish);
    });
    li.appendChild(cost);

    // title element
    if (link) {
      const a = document.createElement('a');
      a.href = link;
      a.textContent = title;
      li.appendChild(a);
    } else {
      const txt = document.createTextNode(title);
      li.appendChild(txt);
    }

    // leftovers toggle
    const leftovers = document.createElement('span');
    leftovers.className = 'leftovers';
    leftovers.textContent = 'leftovers';
    leftovers.style.cursor = 'pointer';
    if (leftoversActive) {
      leftovers.classList.add('active');
      leftovers.style.color = '';
    } else {
      leftovers.style.color = 'var(--muted)';
    }
    leftovers.addEventListener('click', () => {
      if (leftovers.classList.contains('active')) {
        leftovers.classList.remove('active');
        leftovers.style.color = 'var(--muted)';
      } else {
        leftovers.classList.add('active');
        leftovers.style.color = '';
      }
      // persist immediately
      saveMeals();
      updateTotalCost();
    });
    li.appendChild(leftovers);

    // delete button
    const del = document.createElement('button');
    del.textContent = '✕';
    del.className = 'delete-btn';
    del.addEventListener('click', () => {
      li.remove();
      saveMeals();
      updateTotalCost();
    });
    li.appendChild(del);

    // if we have a cost immediately, set and update total
    if (costTag) {
      cost.textContent = costTag;
      updateTotalCost();
    }
    // if cost missing and we have a link, fetch it async and update total when it arrives
    if (!costTag && link) {
      fetchFirstPriceTag(link).then(tag => { if (tag) { cost.textContent = tag; updateTotalCost(); } });
    }

    return li;
  }

  // add meal item to list (costTag optional)
  function addMealItem(title, link, costTag = null, targetBox = activeMealBox, leftoversActive = false) {
    if (!targetBox) return;
    const li = createMealListItem(title, link, costTag, leftoversActive);
    targetBox.querySelector('.meal-list').appendChild(li);
    saveMeals();
    updateTotalCost();
  }

  // start an inline add row in the given meal box
  async function startInlineAdd(box) {
    if (!box) return;
    // avoid duplicates
    if (box.querySelector('.inline-add')) {
      const input = box.querySelector('.inline-add input');
      if (input) input.focus();
      return;
    }
    const list = box.querySelector('.meal-list');
    const li = document.createElement('li');
    li.className = 'inline-add';
    li.innerHTML = `<input class="inline-add-input" placeholder="Add item or search recipes..." /><ul class="inline-suggestions"></ul>`;
    list.appendChild(li);
    const input = li.querySelector('.inline-add-input');
    const sugg = li.querySelector('.inline-suggestions');
    let matches = [];
    input.focus();

    const updateSuggestions = async (query) => {
      sugg.innerHTML = '';
      if (!query) return;
      matches = (await fetchRecipesIndex()).filter(r => r.title.toLowerCase().includes(query.toLowerCase()));
      matches.slice(0,8).forEach(m => {
        const s = document.createElement('li');
        s.textContent = m.title + (m.price ? ` (${m.price})` : '');
        s.addEventListener('click', () => {
          addMealItem(m.title, m.link, m.price, box);
          li.remove();
        });
        sugg.appendChild(s);
      });
      // add the insert-without-recipe option
      const insert = document.createElement('li');
      insert.className = 'insert-without-recipe';
      insert.textContent = `Insert "${query}" without a recipe`;
      insert.addEventListener('click', () => {
        addMealItem(query, null, '$???', box);
        li.remove();
      });
      sugg.appendChild(insert);
    };

    input.addEventListener('input', e => updateSuggestions(e.target.value));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const val = input.value.trim();
        if (!val) { li.remove(); return; }
        // if there is at least one match and the typed text exactly matches the first match, choose it
        if (matches.length && matches[0].title.toLowerCase() === val.toLowerCase()) {
          addMealItem(matches[0].title, matches[0].link, matches[0].price, box);
        } else {
          addMealItem(val, null, '$???', box);
        }
        li.remove();
      } else if (e.key === 'Escape') {
        li.remove();
      }
    });

    // if the input loses focus and is empty, remove the inline row
    input.addEventListener('blur', () => {
      setTimeout(() => { if (!li.contains(document.activeElement)) { if (!input.value.trim()) li.remove(); } }, 150);
    });
  }

  // parse a cost tag like '$4', '$.5', '$1.50 each' and return number (float) or null
  function parseCostTag(tag) {
    if (!tag) return null;
    // find number like 1 or .5 or 1.50
    const m = tag.toString().match(/(\d+(?:\.\d+)?|\.\d+)/);
    if (!m) return null;
    const n = parseFloat(m[0]);
    return isNaN(n) ? null : n;
  }

  // update the total cost display by summing all .meal-cost values in the planner
  function updateTotalCost() {
    const totalEl = document.getElementById('totalCost');
    if (!totalEl) return;
    let total = 0;
    document.querySelectorAll('.meal-list li').forEach(li => {
      const costEl = li.querySelector('.meal-cost');
      if (!costEl) return;
      const tag = costEl.textContent && costEl.textContent.trim();
      const num = parseCostTag(tag);
      if (num !== null) total += num;
    });
    totalEl.textContent = `Total: $${total.toFixed(2)}`;
  }

  // search recipes
  if (recipeSearch && searchResults) {
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
          const priceEl = card.querySelector('.card-tags .tag');
          const price = priceEl ? priceEl.textContent.trim() : null;
          addMealItem(title, link, price);
          if (overlay) overlay.classList.add("hidden");
        });
        searchResults.appendChild(li);
      }
    });
  });
  }
  // add custom recipe (if input exists)
  if (customRecipe) {
    customRecipe.addEventListener("keypress", e => {
      if (e.key === "Enter" && customRecipe.value.trim()) {
        addMealItem(customRecipe.value.trim(), null, null);
        if (overlay) overlay.classList.add("hidden");
      }
    });
  }

  // (addMealItem defined later after helper functions)

  // save/load to localStorage
  function saveMeals() {
    const data = {};
    document.querySelectorAll(".meal-box").forEach(box => {
      const day = box.dataset.day;
      const meal = box.dataset.meal;
      if (!data[day]) data[day] = {};
      data[day][meal] = [];
      box.querySelectorAll("li").forEach(li => {
        // title, link, and leftovers stored on dataset / DOM by createMealListItem
        const leftoversEl = li.querySelector('.leftovers');
        const costEl = li.querySelector('.meal-cost');
        data[day][meal].push({
          title: li.dataset.title || '',
          link: li.dataset.link || null,
          leftovers: !!(leftoversEl && leftoversEl.classList.contains('active')),
          cost: costEl ? costEl.textContent.trim() : null
        });
      });
    });
    localStorage.setItem("mealPlan", JSON.stringify(data));
    // (helpers live at top-level)
  }
  function loadMeals() {
    const data = JSON.parse(localStorage.getItem("mealPlan") || "{}");
    Object.keys(data).forEach(day => {
      Object.keys(data[day]).forEach(meal => {
        const box = document.querySelector(`.meal-box[data-day="${day}"][data-meal="${meal}"]`);
        if (box) {
          const list = box.querySelector(".meal-list");
          data[day][meal].forEach(item => {
            const li = createMealListItem(item.title, item.link, item.cost || null, !!item.leftovers);
            list.appendChild(li);
          });
        }
      });
    });
    // update totals after initial render (some costs may still populate async)
    updateTotalCost();
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
  // now that helpers exist, load saved meal plan and saved recipes
  loadMeals();
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
      const price = data.tags && data.tags.find(t => /^\$/.test(t)) || null;
      addMealItem(data.title, data.link, price, list.closest(".meal-box"));
    });
  });

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      activeMealBox = e.target.closest(".meal-box");
      // start inline add row instead of opening overlay
      startInlineAdd(activeMealBox);
      btn.classList.add("active");
      const tabId = btn.dataset.tab;
      document.getElementById(tabId).classList.add("active");
    });
  });

});
