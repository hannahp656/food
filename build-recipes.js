// build-recipes.js
import fs from "fs";
import path from "path";

const inputDir = "./data/recipes";
const outputDir = "./recipes";
const galleryPath = "./gallery.js"; // 👈 Path to your gallery script

// helper: clean messy ingredient text
function cleanIngredient(line) {
  let [beforeComma] = line.split(/,(.+)/);
  beforeComma = beforeComma.trim();
  const parts = beforeComma.split(" ");
  const units = [
    "cup","cups","tbsp","tsp","teaspoon","teaspoons","tablespoon","tablespoons",
    "g","kg","ml","l","oz","lb","pound","pounds","clove","cloves","slice","slices",
    "can","cans","package","packages","breast","breasts"
  ];
  const descriptors = ["of","chopped","minced","diced","sliced","grated","shredded","fresh","ground","finely"];
  const amountWords = ["pinch","handful","dash","slice","clove","teaspoon","tablespoon"];

  function looksLikeAmount(word) {
    return /^\d+([\/\.]\d+)?$/.test(word) || amountWords.includes(word.toLowerCase());
  }

  if (parts.length && looksLikeAmount(parts[0])) parts.shift();
  if (parts.length && units.includes(parts[0].toLowerCase())) parts.shift();

  const filtered = parts.filter(w => !descriptors.includes(w.toLowerCase()));
  return filtered.join(" ");
}

// ensure output directory exists
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// read template HTML
const templateHTML = fs.readFileSync("./recipe-template.html", "utf8");

// read all recipe JSONs
const files = fs.readdirSync(inputDir).filter(f => f.endsWith(".json"));

const builtRecipes = []; // 👈 keep track of what we build

for (const file of files) {
  const jsonPath = path.join(inputDir, file);
  const recipeData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  // add cleaned ingredients
  recipeData.cleanedIngredients = recipeData.ingredients.map(cleanIngredient);

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

  // store the web path version (for gallery.js)
  builtRecipes.push(`/food/recipes/${outputName}`);

  console.log(`✅ Built ${outputName}`);
}

console.log("🎉 All recipes built!");

// 🧩 NEW STEP: Auto-update gallery.js
try {
  let galleryContent = fs.readFileSync(galleryPath, "utf8");

  // Replace the recipeFiles array dynamically
  const newArray = `const recipeFiles = [\n  ${builtRecipes.map(r => `"${r}"`).join(",\n  ")}\n];`;

  // Find and replace the old array definition
  galleryContent = galleryContent.replace(
    /const recipeFiles = \[[\s\S]*?\];/,
    newArray
  );

  fs.writeFileSync(galleryPath, galleryContent, "utf8");
  console.log("🧠 Updated gallery.js with new recipe list!");
} catch (err) {
  console.warn("⚠️ Could not update gallery.js automatically:", err.message);
}
