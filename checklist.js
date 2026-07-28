const CHECKLIST_KEY = "dragoncore_checklist";

class Checklist {
  constructor() {
    this.items = this.load();
  }

  add(content) {
    const item = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 4)}`,
      content,
      done: false,
      timestamp: Date.now()
    };
    this.items.push(item);
    this.save();
    return item;
  }

  toggle(id) {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;
    item.done = !item.done;
    this.save();
  }

  remove(id) {
    this.items = this.items.filter((i) => i.id !== id);
    this.save();
  }

  all() {
    return this.items.slice();
  }

  load() {
    try {
      const raw = localStorage.getItem(CHECKLIST_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("Checklist: Laden fehlgeschlagen", e);
      return [];
    }
  }

  save() {
    try {
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(this.items));
    } catch (e) {
      console.warn("Checklist: Speichern fehlgeschlagen", e);
    }
  }
}
