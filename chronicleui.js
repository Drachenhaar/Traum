const CHRONICLE_SUBJECT_NAMES = {
  koi: "Der Koi",
  dragonfly: "Die Libelle",
  bird: "Der Vogel"
};

const CHRONICLE_DISPLAY_LIMIT = 80;

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// "Heute" / "Gestern" für die letzten beiden Tage, sonst ein voller,
// gut lesbarer Datumsname – dient als Überschrift, unter der mehrere
// Einträge desselben Tages gruppiert werden.
function formatChronicleDayLabel(timestamp) {
  const date = new Date(timestamp);
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86400000);
  if (diffDays === 0) return "Heute";
  if (diffDays === 1) return "Gestern";
  return date.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatChronicleTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr";
}

// Übersetzt einen rohen Chronik-Eintrag in einen ruhigen, lesbaren Satz.
// Gibt null zurück für Typen, die (noch) keine eigene Formulierung haben,
// statt rohe Daten anzuzeigen.
function formatChronicleEntry(entry, thoughtGarden) {
  const data = entry.data || {};

  switch (entry.type) {
    case "presence_interval": {
      const minutes = Math.round((data.duration || 0) / 60);
      if (minutes < 1) return "Du warst kurz hier.";
      if (minutes === 1) return "Du warst eine Minute hier.";
      return `Du warst ${minutes} Minuten hier.`;
    }

    case "stillness_interval": {
      const minutes = Math.round((data.duration || 0) / 60);
      return `${minutes} Minuten lang geschah nichts.`;
    }

    case "thought_born": {
      const thought = thoughtGarden ? thoughtGarden.getThought(data.thoughtId) : null;
      return thought ? `Ein Gedanke wurde geboren: „${thought.content}“` : "Ein Gedanke wurde geboren.";
    }

    case "encounter": {
      const name = CHRONICLE_SUBJECT_NAMES[data.subjectType] || "Ein Wesen";
      if (data.isFirst) return `${name} zeigte sich zum ersten Mal.`;
      if (data.isReturn) return `${name} kehrte nach langer Zeit zurück.`;
      return `${name} war da.`;
    }

    default:
      return null;
  }
}

function renderChronicleBook(chronicle, thoughtGarden, listEl, emptyEl) {
  if (!listEl || !emptyEl || !chronicle) return;

  const entries = chronicle
    .getAll()
    .slice()
    .reverse()
    .map((entry) => ({ entry, text: formatChronicleEntry(entry, thoughtGarden) }))
    .filter((item) => item.text)
    .slice(0, CHRONICLE_DISPLAY_LIMIT);

  listEl.innerHTML = "";

  if (entries.length === 0) {
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  let lastDayKey = null;

  entries.forEach(({ entry, text }) => {
    const dayKey = startOfDay(new Date(entry.timestamp));
    if (dayKey !== lastDayKey) {
      const heading = document.createElement("li");
      heading.className = "chronicle-day-heading";
      heading.textContent = formatChronicleDayLabel(entry.timestamp);
      listEl.appendChild(heading);
      lastDayKey = dayKey;
    }

    const item = document.createElement("li");
    item.className = "book-entry";

    const line = document.createElement("p");
    line.className = "book-entry-text";
    line.textContent = text;

    const meta = document.createElement("span");
    meta.className = "book-entry-date";
    meta.textContent = formatChronicleTime(entry.timestamp);

    item.appendChild(line);
    item.appendChild(meta);
    listEl.appendChild(item);
  });
}
