const TOOLKIT_KEY = "dragoncore_toolkit";

function toolkitUid() {
  return `tk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

class Toolkit {
  constructor() {
    this.data = this.load();
  }

  defaultData() {
    return {
      categories: ["Markt", "Catering"],
      gerichte: [
        {
          id: toolkitUid(),
          name: "Bambes",
          kategorie: "Markt",
          werkzeuge: [
            { id: toolkitUid(), name: "Spachtel", menge: 2 },
            { id: toolkitUid(), name: "GN-Behälter (halb)", menge: 2 }
          ]
        },
        {
          id: toolkitUid(),
          name: "Rippchen",
          kategorie: "Markt",
          werkzeuge: []
        }
      ],
      bestand: { "Spachtel": 0, "GN-Behälter (halb)": 0 },
      eventAuswahl: {},
      verlauf: []
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(TOOLKIT_KEY);
      if (!raw) return this.defaultData();
      const parsed = JSON.parse(raw);
      if (!parsed.categories) parsed.categories = ["Markt", "Catering"];
      if (!parsed.gerichte) parsed.gerichte = [];
      if (!parsed.bestand) parsed.bestand = {};
      if (!parsed.eventAuswahl) parsed.eventAuswahl = {};
      if (!parsed.verlauf) parsed.verlauf = [];
      return parsed;
    } catch (e) {
      console.warn("Toolkit: Laden fehlgeschlagen", e);
      return this.defaultData();
    }
  }

  save() {
    try {
      localStorage.setItem(TOOLKIT_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn("Toolkit: Speichern fehlgeschlagen", e);
    }
  }

  ensureCategory(name) {
    const trimmed = name.trim();
    if (trimmed && !this.data.categories.includes(trimmed)) {
      this.data.categories.push(trimmed);
    }
  }

  addGericht() {
    const gericht = {
      id: toolkitUid(),
      name: "Neues Gericht",
      kategorie: this.data.categories[0] || "Markt",
      werkzeuge: []
    };
    this.data.gerichte.unshift(gericht);
    this.save();
    return gericht;
  }

  removeGericht(id) {
    this.data.gerichte = this.data.gerichte.filter((g) => g.id !== id);
    delete this.data.eventAuswahl[id];
    this.save();
  }

  isWerkzeugInGebrauch(name) {
    return this.data.gerichte.some((g) => g.werkzeuge.some((w) => w.name.trim() === name));
  }

  allWerkzeugNamen() {
    const namen = new Set();
    this.data.gerichte.forEach((g) => {
      g.werkzeuge.forEach((w) => {
        if (w.name && w.name.trim()) namen.add(w.name.trim());
      });
    });
    Object.keys(this.data.bestand).forEach((n) => namen.add(n));
    return Array.from(namen).sort((a, b) => a.localeCompare(b, "de"));
  }

  berechneBedarf() {
    const bedarf = {};
    this.data.gerichte.forEach((gericht) => {
      const anzahl = this.data.eventAuswahl[gericht.id] || 0;
      if (anzahl <= 0) return;
      gericht.werkzeuge.forEach((w) => {
        const name = w.name.trim();
        if (!name) return;
        bedarf[name] = (bedarf[name] || 0) + w.menge * anzahl;
      });
    });
    return bedarf;
  }

  deductBedarf() {
    const bedarf = this.berechneBedarf();
    const namen = Object.keys(bedarf);
    if (namen.length === 0) return null;

    const items = namen.map((name) => ({ name, menge: bedarf[name] }));
    namen.forEach((name) => {
      this.data.bestand[name] = (this.data.bestand[name] || 0) - bedarf[name];
    });
    this.data.verlauf.unshift({ id: toolkitUid(), timestamp: Date.now(), items });
    this.data.eventAuswahl = {};
    this.save();
    return items;
  }
}
