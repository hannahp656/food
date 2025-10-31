// build-recipes.js
import fs from "fs";
import path from "path";

const inputDir = "./data/recipes";
const outputDir = "./recipes";
const galleryPath = "./gallery.js";

// --- Parse ingredient into amount, unit, and ingredient name ---
function parseIngredient(line) {
  if (!line) return null;
  const [beforeComma] = line.split(/,(.+)/);
  const parts = beforeComma.trim().split(/\s+/);

  const units = [
    "cup","cups","tbsp","tsp","teaspoon","teaspoons","tablespoon","tablespoons",
    "g","kg","ml","l","oz","lb","pound","pounds","clove","cloves","slice","slices",
    "can","cans","package","packages","breast","breasts","pinch","handful","dash"
  ];

  let amount = "";
  let unit = "";
  let ingredientParts = [];

  // detect amount (supports "2", "1/2", "2 3/4")
  if (parts.length > 0 && /^(\d+([\/\.]\d+)?|\d+\s+\d+\/\d+)$/.test(parts[0])) {
    amount = parts.shift();
    if (parts.length && /^\d+\/\d+$/.test(parts[0])) amount += " " + parts.shift();
  }

  // detect unit
  if (parts.length > 0 && units.includes(parts[0].toLowerCase())) {
    unit = parts.shift();
  }

  const ingredient = parts.join(" ").trim();
  return { ingredient, amount, unit };
}

// ensure output directory exists
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// read template HTML
const templateHTML = fs.readFileSync("./recipe-template.html", "utf8");

// read all recipe JSONs
const files = fs.readdirSync(inputDir).filter(f => f.endsWith(".json"));

const builtRecipes = [];

for (const file of files) {
  const jsonPath = path.join(inputDir, file);
  const recipeData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  // add parsed + cleaned ingredients
  recipeData.parsedIngredients = recipeData.ingredients.map(parseIngredient);
  recipeData.cleanedIngredients = recipeData.parsedIngredients.map(i => i.ingredient);

  // inject JSON into template
  const outputHTML = templateHTML.replace(
    '<script id="recipe-data" type="application/json"></script>',
    `<script id="recipe-data" type="application/json">
${JSON.stringify(recipeData, null, 2)}
</script>`
  );

  const outputName = "recipe-" + path.basename(file, ".json") + ".html";
  const outputPath = path.join(outputDir, outputName);
  fs.writeFileSync(outputPath, outputHTML, "utf8");

  builtRecipes.push(`/food/recipes/${outputName}`);
  console.log(`✅ Built ${outputName}`);
}

console.log("🎉 All recipes built!");

// 🧩 Auto-update gallery.js
try {
  let galleryContent = fs.readFileSync(galleryPath, "utf8");
  const newArray = `const recipeFiles = [\n  ${builtRecipes.map(r => `"${r}"`).join(",\n  ")}\n];`;
  galleryContent = galleryContent.replace(/const recipeFiles = \[[\s\S]*?\];/, newArray);
  fs.writeFileSync(galleryPath, galleryContent, "utf8");
  console.log("🧠 Updated gallery.js with new recipe list!");
} catch (err) {
  console.warn("⚠️ Could not update gallery.js automatically:", err.message);
}
