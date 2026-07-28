function renderChecklistBook(checklist, listEl, emptyEl) {
  if (!listEl || !emptyEl || !checklist) return;

  const items = checklist.all();
  listEl.innerHTML = "";

  if (items.length === 0) {
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "checklist-item" + (item.done ? " done" : "");

    const checkbox = document.createElement("button");
    checkbox.type = "button";
    checkbox.className = "checklist-checkbox";
    checkbox.setAttribute("aria-label", item.done ? "Als offen markieren" : "Als erledigt markieren");
    checkbox.setAttribute("aria-pressed", String(item.done));

    const text = document.createElement("p");
    text.className = "checklist-text";
    text.textContent = item.content;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "checklist-remove";
    remove.setAttribute("aria-label", "Eintrag entfernen");
    remove.textContent = "✕";

    checkbox.addEventListener("click", () => {
      checklist.toggle(item.id);
      renderChecklistBook(checklist, listEl, emptyEl);
    });

    remove.addEventListener("click", () => {
      checklist.remove(item.id);
      renderChecklistBook(checklist, listEl, emptyEl);
    });

    li.appendChild(checkbox);
    li.appendChild(text);
    li.appendChild(remove);
    listEl.appendChild(li);
  });
}

function initChecklistInput(checklist, listEl, emptyEl) {
  const input = document.getElementById("checklistInput");
  if (!input) return;

  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const text = input.value.trim();
    if (!text) return;

    checklist.add(text);
    input.value = "";
    renderChecklistBook(checklist, listEl, emptyEl);
  });
}
