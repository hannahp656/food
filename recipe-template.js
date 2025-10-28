document.addEventListener("DOMContentLoaded", () => {
  const dataEl = document.getElementById("recipe-data");
  if (!dataEl) return;
  const data = JSON.parse(dataEl.textContent);

  // set document title
  document.title = `${data.title} - Hannah's Recipes`;

  // insert title
  const h1 = document.querySelector("header.hero h1");
  if (h1) h1.textContent = data.title;

  // insert hero image
  const heroImg = document.querySelector("header.hero img");
  if (heroImg && data.cover) {
    heroImg.src = data.cover;
    heroImg.alt = data.title;
  }

  // setup "view original recipe" button
  const viewBtn = document.getElementById("viewOriginalBtn");
  if (viewBtn && data.original) {
    viewBtn.style.display = "inline-block";
    viewBtn.addEventListener("click", () => {
      window.open(data.original, "_blank");
    });
  }

  // setup save button
  const saveBtn = document.getElementById("saveRecipeBtn");
  if (saveBtn) {
    const icon = saveBtn.querySelector("i");

    function updateBookmarkIcon(isSaved) {
      if (isSaved) {
        icon.classList.remove("fa-regular");
        icon.classList.add("fa-solid");
      } else {
        icon.classList.remove("fa-solid");
        icon.classList.add("fa-regular");
      }
    }

    // load saved recipes
    let saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]");

    // check if current recipe is saved
    let isSaved = saved.some(r => r.link === data.link);
    updateBookmarkIcon(isSaved);

    // click handler
    saveBtn.addEventListener("click", () => {
      saved = JSON.parse(localStorage.getItem("savedRecipes") || "[]");
      isSaved = saved.some(r => r.link === data.link);

      if (isSaved) {
        saved = saved.filter(r => r.link !== data.link);
        localStorage.setItem("savedRecipes", JSON.stringify(saved));
        updateBookmarkIcon(false);
      } else {
        saved.push(data);
        localStorage.setItem("savedRecipes", JSON.stringify(saved));
        updateBookmarkIcon(true);
      }
    });
  }

  // insert tags
  const recipeTags = document.querySelector(".tags");
  if (recipeTags && data.tags) {
    const firstLine = data.tags.slice(0, 3).map(tag => {
      if (/\bmin\b|\bhour\b/i.test(tag)) {
        return `<span class="tag"><i class="fa-regular fa-clock"></i> ${tag}</span>`;
      }
      return `<span class="tag">${tag}</span>`;
    }).join("");

    const secondLine = data.tags.slice(3).map(tag => {
      return `<span class="tag">${tag}</span>`;
    }).join("");

    recipeTags.innerHTML = `<div>${firstLine}</div>${secondLine ? `<div>${secondLine}</div>` : ""}`;
  }

  // insert video if available
  const videoContainer = document.querySelector(".video-container");
  if (data.video) {
    const videoElement = document.createElement("video");
    videoElement.src = data.video;
    videoElement.poster = data.cover;
    videoElement.setAttribute("controls", "");
    videoElement.setAttribute("playsinline", "");
    videoElement.style.width = "100%";
    videoElement.style.display = "block";

    const overlay = document.createElement("div");
    overlay.className = "video-overlay";
    const playButton = document.createElement("div");
    playButton.className = "play-button";
    overlay.appendChild(playButton);

    overlay.addEventListener("click", () => {
      videoElement.play();
      overlay.style.display = "none";
    });

    videoContainer.appendChild(videoElement);
    videoContainer.appendChild(overlay);
  } else if (data.cover) {
    const img = document.createElement("img");
    img.src = data.cover;
    img.alt = data.title;
    img.style.width = "100%";
    img.style.display = "block";
    videoContainer.appendChild(img);
  }

  // ✅ simplified ingredient list + cleaned tags for bolding
  const ingredientTags = data.cleanedIngredients || [];
  const ingList = document.querySelector(".ingredients-list");
  if (ingList && data.ingredients) {
    ingList.innerHTML = data.ingredients
      .map(line => `<li>${line}</li>`)
      .join("");
  }

  // insert instructions
  const stepsList = document.querySelector(".instructions-list");
  if (stepsList && data.instructions) {
    stepsList.innerHTML = data.instructions.map((step, index) => {
      if (typeof step === "string") {
        const next = data.instructions[index + 1];
        let stepText = step;

        // ✅ bold known ingredients
        ingredientTags
          .sort((a, b) => b.length - a.length)
          .forEach(ingredient => {
            const regex = new RegExp(`\\b${ingredient.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "gi");
            stepText = stepText.replace(regex, `<strong>${ingredient}</strong>`);
          });

        // check if next step is an image
        if (next && typeof next === "object" && next.image) {
          const id = `img-${Math.random().toString(36).substr(2, 9)}`;
          return `
            <li>
              ${stepText}
              <button class="img-toggle" data-target="${id}">
                <i class="fa-solid fa-angle-right"></i>
              </button>
              <div id="${id}" class="instruction-img hidden">
                <img src="${next.image}" alt="Instruction image">
              </div>
            </li>
          `;
        }

        return `<li>${stepText}</li>`;
      }

      return "";
    }).join("");

    // add toggle behavior
    stepsList.querySelectorAll(".img-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        const targetId = btn.dataset.target;
        const target = document.getElementById(targetId);
        const icon = btn.querySelector("i");

        if (target.classList.contains("hidden")) {
          target.classList.remove("hidden");
          icon.style.transform = "rotate(90deg)";
        } else {
          target.classList.add("hidden");
          icon.style.transform = "rotate(0deg)";
        }
      });
    });
  }
});
