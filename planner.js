document.addEventListener("DOMContentLoaded", () => {
  const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const meals = ["breakfast","lunch","dinner"];
  //const overlay = document.getElementById("overlay");
  //const closeOverlay = document.getElementById("closeOverlay");
  //const recipeSearch = document.getElementById("recipeSearch");
  //const searchResults = document.getElementById("searchResults");
  //const customRecipe = document.getElementById("customRecipe");
  //let activeMealBox = null;

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

  // add button -> toggle inline search box
    document.querySelectorAll(".add-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        const mealBox = e.target.closest(".meal-box");
        toggleSearchBar(mealBox);
      });
    });
  // creates a search bar inside the meal box
  function toggleSearchBar(mealBox) {
    // remove if already open
    let existing = mealBox.querySelector(".inline-search");
    if (existing) {
      existing.remove();
      return;
    }

    const searchDiv = document.createElement("div");
    searchDiv.className = "inline-search";
    searchDiv.innerHTML = `
      <input type="text" placeholder="Search for recipes by title" class="meal-search">
      <ul class="search-results"></ul>
    `;
    mealBox.appendChild(searchDiv);

    const input = searchDiv.querySelector(".meal-search");
    const resultList = searchDiv.querySelector(".search-results");

    input.addEventListener("input", async () => {
      const query = input.value.toLowerCase().trim();
      resultList.innerHTML = "";
      if (!query) return;

      // Fetch all recipe files instead of recipes.html
      // Use the shared recipe list
      // (Assumes this file is included BEFORE gallery.js and planner.js in your HTML)

      const matches = [];

      for (const file of recipeFiles) {
        try {
          const res = await fetch(file);
          if (!res.ok) continue;
          const text = await res.text();
          const doc = new DOMParser().parseFromString(text, "text/html");
          const dataEl = doc.querySelector("#recipe-data");
          if (!dataEl) continue;
          const data = JSON.parse(dataEl.textContent);
          if (data.title.toLowerCase().includes(query)) {
            matches.push({ title: data.title, link: data.link });
          }
        } catch (err) {
          console.error("Error reading recipe:", file, err);
        }
      }

      resultList.innerHTML = ""; // clear old results

      // Add matches
      matches.forEach(({ title, link }) => {
        const li = document.createElement("li");
        li.textContent = title;
        li.addEventListener("click", () => {
          addMealItem(title, link, mealBox);
          searchDiv.remove();
        });
        resultList.appendChild(li);
      });

      // Always include the "insert custom" option
      const custom = document.createElement("li");
      custom.className = "insert-custom";
      custom.textContent = `Insert "${input.value}" without recipe`;
      custom.addEventListener("click", () => {
        addMealItem(input.value, null, mealBox);
        searchDiv.remove();
      });
      resultList.appendChild(custom);

    });
  }


  // close overlay
  //closeOverlay.addEventListener("click", () => overlay.classList.add("hidden"));

  // search recipes
  //recipeSearch.addEventListener("input", async () => {
    //const query = recipeSearch.value.toLowerCase();
    //searchResults.innerHTML = "";
    //if (!query) return;
    // fetch recipes.html and parse for matching titles
    //const res = await fetch("recipes.html");
    //const text = await res.text();
    //const doc = new DOMParser().parseFromString(text, "text/html");
    //const cards = doc.querySelectorAll(".recipe-card");
    // filter cards by title match
    //cards.forEach(card => {
      //const title = card.querySelector("h3").textContent;
      //const link = card.querySelector("a").getAttribute("href");
      //if (title.toLowerCase().includes(query)) {
        //const li = document.createElement("li");
        //li.textContent = title;
        //li.addEventListener("click", () => {
          //addMealItem(title, link);
          //overlay.classList.add("hidden");
        //});
        //searchResults.appendChild(li);
      //}
    //});
  //});
  // add custom recipe
  //customRecipe.addEventListener("keypress", e => {
    //if (e.key === "Enter" && customRecipe.value.trim()) {
      //addMealItem(customRecipe.value.trim(), null);
      //overlay.classList.add("hidden");
    //}
  //});

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
          <button class="delete-saved">✕</button>
        </div>
        <div class="content">
          <h3>${recipe.title}</h3>
          <div class="card-tags">${recipe.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}</div>
          <a href="${recipe.link}" target="_blank">View Recipe</a>
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
    // 🔄 Keep saved recipes in sync across tabs and pages
  window.addEventListener("storage", (e) => {
    if (e.key === "savedRecipes") loadSavedRecipes();
  });

  // 🔔 Also listen for custom same-tab updates
  window.addEventListener("savedRecipesUpdated", () => {
    loadSavedRecipes();
  });

});
