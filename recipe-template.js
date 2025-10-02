document.addEventListener("DOMContentLoaded", () => {
  const dataEl = document.getElementById("recipe-data");
  if (!dataEl) return;

  const data = JSON.parse(dataEl.textContent);

  // Insert title
  const h1 = document.querySelector("header.hero h1");
  if (h1) h1.textContent = data.title;

  // Insert hero image (if your hero has one)
  const heroImg = document.querySelector("header.hero img");
  if (heroImg && data.image) {
    heroImg.src = data.image;
    heroImg.alt = data.title;
  }

  // Insert tags
  const tagsContainer = document.querySelector(".recipe-tags");
  if (tagsContainer && data.tags) {
    tagsContainer.innerHTML = data.tags
      .map(tag => `<span class="tag">${tag}</span>`)
      .join("");
  }

  // Insert ingredients
const ingList = document.querySelector(".ingredients-list");
if (ingList && data.ingredients) {
  ingList.innerHTML = data.ingredients.map(line => {
    // Split notes after first comma
    let [beforeComma, afterComma] = line.split(/,(.+)/); // splits once at first comma
    beforeComma = beforeComma.trim();
    afterComma = afterComma ? afterComma.trim() : "";

    const parts = beforeComma.split(" ");
    let amount = parts.shift(); // e.g. "1" or "1/2"
    let maybeUnit = "";
    let name = "";

    // If next token is a known unit
    const units = ["cup","cups","tbsp","tsp","teaspoon","teaspoons","tablespoon","tablespoons","g","kg","ml","l","oz","lb","pound","pounds","clove","cloves","slice","slices","can","cans","package","packages","breast","breasts"];
    if (parts.length > 1 && units.includes(parts[0].toLowerCase())) {
      maybeUnit = parts.shift();
    }

    // Everything left before the comma is the ingredient name
    name = parts.join(" ");

    // Build HTML
    let html = `<li>${amount}`;
    if (maybeUnit) html += ` ${maybeUnit}`;
    if (name) html += ` <span class="ingredient-tag">${name}</span>`;
    if (afterComma) html += `, ${afterComma}`;
    html += `</li>`;

    return html;
  }).join("");
}


  // Insert instructions
  const stepsList = document.querySelector(".instructions-list");
  if (stepsList && data.instructions) {
    stepsList.innerHTML = data.instructions
      .map(step => `<li>${step}</li>`)
      .join("");
  }
});
