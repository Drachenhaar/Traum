function renderPlaceList(listEl, worldStageController, effectsController) {
  if (!listEl) return;

  const current = loadCurrentPlace();
  listEl.innerHTML = "";

  PLACES.forEach((place) => {
    const item = document.createElement("li");
    const isCurrent = place.id === current.id;
    item.className = "place-card";
    if (isCurrent) item.classList.add("current");
    if (!place.available) item.classList.add("unavailable");

    if (place.available) {
      item.style.backgroundImage =
        `linear-gradient(rgba(10, 8, 4, 0.15), rgba(10, 8, 4, 0.6)), url("${place.backgroundSrc}")`;
    }

    const name = document.createElement("span");
    name.className = "place-name";
    name.textContent = place.name;

    const note = document.createElement("span");
    note.className = "place-note";
    note.textContent = !place.available ? "entsteht noch" : isCurrent ? "du bist hier" : place.description;

    item.appendChild(name);
    item.appendChild(note);

    if (place.available && !isCurrent && worldStageController) {
      item.addEventListener("click", () => {
        saveCurrentPlace(place.id);
        worldStageController.setImage(place.backgroundSrc);
        if (effectsController) effectsController.applyPlace(place);
        renderPlaceList(listEl, worldStageController, effectsController);
      });
    }

    listEl.appendChild(item);
  });
}
