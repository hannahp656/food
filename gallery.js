// ADD NEW RECIPE FILES HERE TO HAVE THEM APPEAR IN THE GALLERY
// Format: "/food/recipes/recipe-filename.html",
const recipeFiles = [

  "/food/recipes/recipe-sausage-fajita-pasta.html"

];
// fetch each recipe file, parse out the #recipe-data JSON, and create a card in the gallery
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
            ${data.tags.map(tag => `<span class="chip chip--soft">${tag}</span>`).join("")}
          </div>
          <a href="${data.link}">View Recipe</a>
        </div>
      `;
      gallery.appendChild(card);
      // Make whole card clickable
      card.addEventListener("click", () => {
        window.location.href = data.link;
      });
    } catch (err) {
      console.error("Error loading recipe:", file, err);
    }
  }
}
// Load recipes on page load
loadRecipes();