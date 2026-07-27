function formatThoughtDate(timestamp) {
  const date = new Date(timestamp);
  const datePart = date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timePart = date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

function renderThoughtBook(thoughtGarden, listEl, emptyEl) {
  const thoughts = thoughtGarden.all().slice().sort((a, b) => b.timestamp - a.timestamp);
  listEl.innerHTML = "";

  if (thoughts.length === 0) {
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  thoughts.forEach((thought) => {
    const entry = document.createElement("li");
    entry.className = "book-entry";

    const text = document.createElement("p");
    text.className = "book-entry-text";
    text.textContent = thought.content;

    const meta = document.createElement("span");
    meta.className = "book-entry-date";
    meta.textContent = formatThoughtDate(thought.timestamp);

    entry.appendChild(text);
    entry.appendChild(meta);
    listEl.appendChild(entry);
  });
}

function initBook(thoughtGarden) {
  const overlay = document.getElementById("bookOverlay");
  const listEl = document.getElementById("bookEntries");
  const emptyEl = document.getElementById("bookEmpty");
  const closeButton = document.getElementById("bookCloseButton");
  const openTriggers = document.querySelectorAll("[data-open-book]");

  if (!overlay || !listEl || !emptyEl) return;

  function open() {
    renderThoughtBook(thoughtGarden, listEl, emptyEl);
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
  }

  function close() {
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
  }

  openTriggers.forEach((btn) => btn.addEventListener("click", open));

  if (closeButton) closeButton.addEventListener("click", close);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("open")) close();
  });
}
