const recipeFiles = [
  "recipes/recipe-sausage-fajita-pasta.html",
  "recipes/recipe-garlic-parm-chicken-&-potato-skillet.html"

  // Add new recipe files here as you create them
];

async function loadRecipes() {
  const gallery = document.getElementById("gallery");

  for (let file of recipeFiles) {
    try {
      const res = await fetch(file);
      if (!res.ok) {
        console.warn("Could not load", file);
        continue;
      }

      const text = await res.text();
      const doc = new DOMParser().parseFromString(text, "text/html");
      const dataEl = doc.querySelector("#recipe-data");

      if (!dataEl) {
        console.warn("No recipe-data found in", file);
        continue;
      }

      const data = JSON.parse(dataEl.textContent);

      const card = document.createElement("div");
      card.className = "recipe-card";
      card.innerHTML = `
        <img src="${data.image}" alt="${data.title}">
        <div class="content">
          <h3>${data.title}</h3>
          <div class="card-tags">
            ${data.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}
          </div>
          <a href="${data.link}">View Recipe</a>
        </div>
      `;
      gallery.appendChild(card);
    } catch (err) {
      console.error("Error loading recipe:", file, err);
    }
  }
}

loadRecipes();
