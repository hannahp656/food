// planner.js
document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab");
  const contents = document.querySelectorAll(".tab-content");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      contents.forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.target).classList.add("active");
    });
  });

  const mealPlanContainer = document.getElementById("mealPlanContainer");
  const shoppingListEl = document.getElementById("shoppingListItems");

  // --- Meal Plan data ---
  let mealPlan = JSON.parse(localStorage.getItem("mealPlan") || "{}");

  function saveMealPlan() {
    localStorage.setItem("mealPlan", JSON.stringify(mealPlan));
    updateShoppingList();
  }

  function renderMealPlan() {
    mealPlanContainer.innerHTML = "";
    Object.entries(mealPlan).forEach(([day, meals]) => {
      const dayDiv = document.createElement("div");
      dayDiv.className = "meal-day";
      dayDiv.innerHTML = `<h3>${day}</h3>`;
      Object.entries(meals).forEach(([mealType, recipes]) => {
        const section = document.createElement("div");
        section.className = "meal-section";
        section.innerHTML = `<h4>${mealType}</h4>`;
        recipes.forEach(recipe => {
          const card = document.createElement("div");
          card.className = "meal-card";
          card.innerHTML = `
            <img src="${recipe.image}" alt="${recipe.title}">
            <div class="meal-info">
              <p>${recipe.title}</p>
              <button class="remove">Remove</button>
            </div>
          `;
          card.querySelector(".remove").addEventListener("click", () => {
            mealPlan[day][mealType] = mealPlan[day][mealType].filter(r => r.link !== recipe.link);
            saveMealPlan();
            renderMealPlan();
          });
          section.appendChild(card);
        });
        dayDiv.appendChild(section);
      });
      mealPlanContainer.appendChild(dayDiv);
    });
  }

  renderMealPlan();

  // === SHOPPING LIST ===
  function updateShoppingList() {
    const plan = JSON.parse(localStorage.getItem("mealPlan") || "{}");
    const ingredientsMap = {};
    const recipePromises = [];

    Object.values(plan).forEach(meals =>
      Object.values(meals).forEach(items =>
        items.forEach(item => {
          if (item.link) {
            recipePromises.push(
              fetch(item.link)
                .then(res => res.text())
                .then(html => {
                  const doc = new DOMParser().parseFromString(html, "text/html");
                  const data = JSON.parse(doc.querySelector("#recipe-data").textContent);
                  if (data.parsedIngredients) {
                    data.parsedIngredients.forEach(({ ingredient, amount, unit }) => {
                      if (!ingredient) return;
                      if (!ingredientsMap[ingredient]) ingredientsMap[ingredient] = [];
                      const desc = [amount, unit].filter(Boolean).join(" ");
                      if (desc) ingredientsMap[ingredient].push(desc);
                    });
                  }
                })
            );
          }
        })
      )
    );

    Promise.all(recipePromises).then(() => {
      renderShoppingList(ingredientsMap);
      localStorage.setItem("shoppingList", JSON.stringify(ingredientsMap));
    });
  }

  function renderShoppingList(map) {
    shoppingListEl.innerHTML = "";
    Object.entries(map).forEach(([ingredient, amounts]) => {
      const li = document.createElement("li");
      li.draggable = true;
      li.innerHTML = `
        <input type="checkbox" class="check">
        <span class="item-text" contenteditable="true">${ingredient}, ${amounts.join(", ")}</span>
        <button class="up">↑</button>
        <button class="down">↓</button>
      `;
      shoppingListEl.appendChild(li);
    });
    addShoppingListHandlers();
  }

  function addShoppingListHandlers() {
    shoppingListEl.querySelectorAll("li").forEach(li => {
      const checkbox = li.querySelector(".check");
      const up = li.querySelector(".up");
      const down = li.querySelector(".down");

      checkbox.addEventListener("change", () => {
        li.classList.toggle("checked", checkbox.checked);
        if (checkbox.checked) {
          shoppingListEl.appendChild(li);
        } else {
          shoppingListEl.insertBefore(li, shoppingListEl.firstChild);
        }
        saveShoppingListState();
      });

      up.addEventListener("click", () => {
        const prev = li.previousElementSibling;
        if (prev) shoppingListEl.insertBefore(li, prev);
        saveShoppingListState();
      });
      down.addEventListener("click", () => {
        const next = li.nextElementSibling;
        if (next) shoppingListEl.insertBefore(next, li);
        saveShoppingListState();
      });

      li.querySelector(".item-text").addEventListener("input", saveShoppingListState);
    });
  }

  function saveShoppingListState() {
    const data = [];
    shoppingListEl.querySelectorAll("li").forEach(li => {
      data.push({
        text: li.querySelector(".item-text").textContent,
        checked: li.querySelector(".check").checked
      });
    });
    localStorage.setItem("shoppingListManual", JSON.stringify(data));
  }

  (function loadShoppingList() {
    const saved = JSON.parse(localStorage.getItem("shoppingListManual") || "[]");
    if (saved.length) {
      shoppingListEl.innerHTML = saved
        .map(i => `<li ${i.checked ? 'class="checked"' : ''}>
          <input type="checkbox" class="check" ${i.checked ? 'checked' : ''}>
          <span class="item-text" contenteditable="true">${i.text}</span>
          <button class="up">↑</button>
          <button class="down">↓</button>
        </li>`)
        .join("");
      addShoppingListHandlers();
    } else {
      updateShoppingList();
    }
  })();
});
