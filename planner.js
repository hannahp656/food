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

  // add button -> start inline add row
  document.querySelectorAll(".add-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      activeMealBox = e.target.closest(".meal-box");
      startInlineAdd(activeMealBox);
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
    // Prefer in-memory gallery data if gallery.js has populated it
    try {
      if (window.allRecipes && Array.isArray(window.allRecipes) && window.allRecipes.length) {
        recipesCache = window.allRecipes.map(r => ({ title: r.title, link: r.link, price: (Array.isArray(r.tags) ? r.tags.find(t => /^\$/.test(t)) : null) }));
        return recipesCache;
      }
    } catch (err) {
      // ignore and fall back to fetching recipes.html
    }
    try {
      // If recipeFiles exists, fetch each recipe page and extract its #recipe-data JSON for reliable title lookup
      const files = (window.recipeFiles || recipeFiles || []);
      if (Array.isArray(files) && files.length) {
        const fetches = files.map(async file => {
          try {
            const r = await fetch(file);
            if (!r.ok) return null;
            const t = await r.text();
            const d = new DOMParser().parseFromString(t, 'text/html');
            const dataEl = d.querySelector('#recipe-data');
            if (!dataEl) return null;
            const json = JSON.parse(dataEl.textContent);
            const price = Array.isArray(json.tags) ? json.tags.find(tg => /^\$/.test(tg)) : null;
            return { title: json.title, link: file, price };
          } catch (err) { return null; }
        });
        const results = (await Promise.all(fetches)).filter(Boolean);
        recipesCache = results;
        return recipesCache;
      }
      // fallback: parse recipes.html cards
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

    // leftovers toggle (icon)
    const leftovers = document.createElement('button');
    leftovers.type = 'button';
    leftovers.className = 'leftovers';
    leftovers.title = 'Leftover-safe';
    leftovers.setAttribute('aria-pressed', leftoversActive ? 'true' : 'false');
    leftovers.innerHTML = '<i class="fa-solid fa-rotate-left" aria-hidden="true"></i>';
    if (leftoversActive) leftovers.classList.add('active');
    leftovers.addEventListener('click', () => {
      const active = leftovers.classList.toggle('active');
      leftovers.setAttribute('aria-pressed', active ? 'true' : 'false');
      // persist immediately
      saveMeals();
      updateTotalCost();
    });
    li.appendChild(leftovers);

    // delete button
    //const del = document.createElement('button');
    //del.textContent = '✕';
    //del.className = 'delete-btn';
    const del = document.createElement('i');
    del.className = 'fa-solid fa-xmark delete-btn';
    del.style.color = 'red';
    del.style.marginRight = '5px';
    del.addEventListener('click', () => {
      li.remove();
      saveMeals();
      updateTotalCost();
    });
    li.appendChild(del)

    

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
    const suggId = `inline-suggestions-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    li.innerHTML = `<input id="inlineAdd" name="inlineAdd" class="inline-add-input" placeholder="Add item or search recipes..." autocomplete="off" aria-autocomplete="list" aria-expanded="false" aria-controls="${suggId}" /><ul id="${suggId}" class="inline-suggestions" role="listbox"></ul>`;
    list.appendChild(li);
    const input = li.querySelector('.inline-add-input');
    let matches = [];
    input.focus();

    // create a floating suggestion container appended to body to avoid clipping problems
    const floatSugg = document.createElement('ul');
    floatSugg.className = 'inline-suggestions floating';
    floatSugg.setAttribute('role', 'listbox');
    // ensure it's visually obvious while debugging
    floatSugg.style.display = 'none';
    floatSugg.style.background = '#fff';
    floatSugg.style.border = '1px solid rgba(0,0,0,0.08)';
    floatSugg.style.zIndex = '10000';
    floatSugg.style.minWidth = '120px';
    document.body.appendChild(floatSugg);

    const positionSuggestions = () => {
      const rect = input.getBoundingClientRect();
      // use viewport coordinates for fixed positioning (don't add page scroll)
      const left = rect.left;
      const top = rect.bottom + 6; // a little gap
      console.debug('positionSuggestions rect:', rect, 'computed left/top:', left, top);
      floatSugg.style.width = rect.width + 'px';
      floatSugg.style.left = left + 'px';
      floatSugg.style.top = top + 'px';
      floatSugg.style.position = 'fixed';
    };

    const cleanup = () => {
      if (floatSugg && floatSugg.parentNode) floatSugg.parentNode.removeChild(floatSugg);
      window.removeEventListener('resize', positionSuggestions);
      window.removeEventListener('scroll', positionSuggestions, true);
    };

    const updateSuggestions = async (query) => {
      floatSugg.innerHTML = '';
      if (!query) { floatSugg.style.display = 'none'; input.setAttribute('aria-expanded','false'); return; }
      positionSuggestions();
      matches = (await fetchRecipesIndex()).filter(r => r.title.toLowerCase().includes(query.toLowerCase()));
      // fallback to savedRecipes in localStorage if no index matches
      let savedMatches = [];
      if (!matches.length) {
        try {
          const saved = JSON.parse(localStorage.getItem('savedRecipes') || '[]');
          savedMatches = saved.filter(s => s.title && s.title.toLowerCase().includes(query.toLowerCase()));
        } catch (err) { savedMatches = []; }
      }
      const shown = [];
      matches.slice(0,8).forEach(m => {
        const s = document.createElement('li');
        s.setAttribute('role','option');
        s.tabIndex = -1;
        s.textContent = m.title + (m.price ? ` (${m.price})` : '');
        s.addEventListener('click', () => {
          addMealItem(m.title, m.link, m.price, box);
          li.remove();
          cleanup();
        });
        s.addEventListener('keydown', (ke) => {
          if (ke.key === 'Enter') { s.click(); }
          else if (ke.key === 'ArrowDown') { if (s.nextElementSibling) s.nextElementSibling.focus(); }
          else if (ke.key === 'ArrowUp') { if (s.previousElementSibling) s.previousElementSibling.focus(); else input.focus(); }
        });
        floatSugg.appendChild(s);
        shown.push(true);
      });
      // also show saved matches if index had none
      if (!matches.length && savedMatches.length) {
        savedMatches.slice(0,8).forEach(m => {
          const s = document.createElement('li');
          s.setAttribute('role','option');
          s.tabIndex = -1;
          // saved recipe may have tags; try to pull a $ tag
          const price = (m.tags && m.tags.find(t => /^\$/.test(t))) || null;
          s.textContent = m.title + (price ? ` (${price})` : '');
          s.addEventListener('click', () => {
            addMealItem(m.title, m.link || null, price, box);
            li.remove();
            cleanup();
          });
          s.addEventListener('keydown', (ke) => {
            if (ke.key === 'Enter') { s.click(); }
            else if (ke.key === 'ArrowDown') { if (s.nextElementSibling) s.nextElementSibling.focus(); }
            else if (ke.key === 'ArrowUp') { if (s.previousElementSibling) s.previousElementSibling.focus(); else input.focus(); }
          });
          floatSugg.appendChild(s);
          shown.push(true);
        });
      }
      // add the insert-without-recipe option
      const insert = document.createElement('li');
      insert.className = 'insert-without-recipe';
      insert.setAttribute('role','option');
      insert.tabIndex = -1;
      insert.textContent = `Insert "${query}" without a recipe`;
      insert.addEventListener('click', () => {
        addMealItem(query, null, '$???', box);
        li.remove();
        cleanup();
      });
      insert.addEventListener('keydown', (ke) => {
        if (ke.key === 'Enter') insert.click();
        else if (ke.key === 'ArrowUp' && insert.previousElementSibling) insert.previousElementSibling.focus();
      });
      insert.style.fontWeight = '600';
      floatSugg.appendChild(insert);

      floatSugg.style.display = 'block';
      input.setAttribute('aria-expanded','true');
      window.addEventListener('resize', positionSuggestions);
      window.addEventListener('scroll', positionSuggestions, true);
    };

    input.addEventListener('input', e => updateSuggestions(e.target.value));
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') {
        const first = floatSugg.querySelector('li');
        if (first) { first.focus(); e.preventDefault(); }
      }
      if (e.key === 'Escape') { li.remove(); cleanup(); }
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const val = input.value.trim();
        if (!val) { li.remove(); cleanup(); return; }
        // if there is at least one match and the typed text exactly matches the first match, choose it
        if (matches.length && matches[0].title.toLowerCase() === val.toLowerCase()) {
          addMealItem(matches[0].title, matches[0].link, matches[0].price, box);
        } else {
          addMealItem(val, null, '$???', box);
        }
        li.remove();
        cleanup();
      } else if (e.key === 'Escape') {
        li.remove();
        cleanup();
      }
    });

    // if the input loses focus and is empty, remove the inline row
    input.addEventListener('blur', () => {
      setTimeout(() => { if (!li.contains(document.activeElement) && !floatSugg.contains(document.activeElement)) { if (!input.value.trim()) { li.remove(); cleanup(); } } }, 150);
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
        <div style="position:relative;">
          <img src="${recipe.image}" alt="${recipe.title}">
          <button class="saveRecipeBtn" style="position:absolute;top:12px;right:12px;z-index:2;">
            <i class="fa-solid fa-bookmark"></i>
          </button>
        </div>
        <div class="content">
          <h3>${recipe.title}</h3>
          <div class="card-tags">
            ${recipe.tags.map(tag => {
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
        </div>
      `;
      // clicking elsewhere on card goes to recipe page
      card.addEventListener("click", e => {
        // if click happened inside the save button, ignore navigation
        if (!e.target.closest(".saveRecipeBtn")) {
          window.location.href = recipe.link;
        }
      });
      // drag start
      card.addEventListener("dragstart", e => {
        e.dataTransfer.setData("application/json", JSON.stringify(recipe));
      });
      // toggle save on click (stop propagation so card click doesn't fire)
      const saveBtn = card.querySelector(".saveRecipeBtn");
      saveBtn.addEventListener("click", e => {
        e.stopPropagation();
        let saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]");
        const isSaved = saved.some(r => r.link === recipe.link);
        if (isSaved) {
          saved = saved.filter(r => r.link !== recipe.link);
          localStorage.setItem("savedRecipes", JSON.stringify(saved));
          // update other parts of the app that care about saved recipes
          window.dispatchEvent(new CustomEvent("savedRecipesUpdated", { detail: { saved } }));
          loadSavedRecipes(); // reload the list
        }
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
