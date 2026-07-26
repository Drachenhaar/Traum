const THOUGHTS_KEY = "dragoncore_thoughts";
const THOUGHT_INPUT_REVEAL_DELAY_MS = 18000;

class ThoughtGarden {
  constructor() {
    this.thoughts = this.load();
  }

  add(content) {
    const thought = {
      id: `thought_${Date.now()}_${Math.random().toString(36).slice(2, 4)}`,
      content,
      timestamp: Date.now()
    };
    this.thoughts.push(thought);
    this.save();
    return thought;
  }

  all() {
    return this.thoughts.slice();
  }

  randomPast(excludeId) {
    const candidates = this.thoughts.filter((t) => t.id !== excludeId);
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  load() {
    try {
      const raw = localStorage.getItem(THOUGHTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("ThoughtGarden: Laden fehlgeschlagen", e);
      return [];
    }
  }

  save() {
    try {
      localStorage.setItem(THOUGHTS_KEY, JSON.stringify(this.thoughts));
    } catch (e) {
      console.warn("ThoughtGarden: Speichern fehlgeschlagen", e);
    }
  }
}

function initThoughtInput(thoughtGarden, chronicle) {
  const input = document.getElementById("thoughtInput");
  if (!input) return;

  setTimeout(() => {
    input.classList.add("visible");
  }, THOUGHT_INPUT_REVEAL_DELAY_MS);

  input.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const text = input.value.trim();
    if (!text) return;

    const thought = thoughtGarden.add(text);
    chronicle.add("thought_born", { thoughtId: thought.id });

    input.value = "";
    input.blur();
  });

  input.addEventListener("focus", () => input.classList.add("focused"));
  input.addEventListener("blur", () => input.classList.remove("focused"));
}
