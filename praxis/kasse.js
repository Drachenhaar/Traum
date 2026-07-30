const KASSE_KEY = "dragoncore_kasse";

function kasseUid() {
  return `ks_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function formatEuro(value) {
  return (Math.round(value * 100) / 100).toFixed(2).replace(".", ",") + " €";
}

class Kasse {
  constructor() {
    this.data = this.load();
  }

  defaultData() {
    return {
      categories: ["Getränke", "Speisen"],
      artikel: [
        { id: kasseUid(), name: "Kaffee", preis: 3.2, kategorie: "Getränke" },
        { id: kasseUid(), name: "Wasser 0,25l", preis: 2.5, kategorie: "Getränke" },
        { id: kasseUid(), name: "Tagessuppe", preis: 6.5, kategorie: "Speisen" }
      ],
      tische: [
        { id: kasseUid(), name: "Tisch 1", items: [], notiz: "" },
        { id: kasseUid(), name: "Tisch 2", items: [], notiz: "" }
      ],
      verlauf: []
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(KASSE_KEY);
      if (!raw) return this.defaultData();
      const parsed = JSON.parse(raw);
      if (!parsed.categories) parsed.categories = ["Getränke", "Speisen"];
      if (!parsed.artikel) parsed.artikel = [];
      if (!parsed.tische) parsed.tische = [];
      if (!parsed.verlauf) parsed.verlauf = [];
      parsed.tische.forEach((t) => {
        if (!t.items) t.items = [];
        if (typeof t.notiz !== "string") t.notiz = "";
      });
      return parsed;
    } catch (e) {
      console.warn("Kasse: Laden fehlgeschlagen", e);
      return this.defaultData();
    }
  }

  save() {
    try {
      localStorage.setItem(KASSE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn("Kasse: Speichern fehlgeschlagen", e);
    }
  }

  ensureCategory(name) {
    const trimmed = name.trim();
    if (trimmed && !this.data.categories.includes(trimmed)) {
      this.data.categories.push(trimmed);
    }
  }

  categoryArtikelCount(name) {
    return this.data.artikel.filter((a) => a.kategorie === name).length;
  }

  renameCategory(oldName, newName) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    const idx = this.data.categories.indexOf(oldName);
    if (idx === -1) return;

    if (this.data.categories.includes(trimmed)) {
      this.data.categories.splice(idx, 1);
    } else {
      this.data.categories[idx] = trimmed;
    }
    this.data.artikel.forEach((a) => {
      if (a.kategorie === oldName) a.kategorie = trimmed;
    });
    this.save();
  }

  removeCategory(name) {
    if (this.categoryArtikelCount(name) > 0) return false;
    this.data.categories = this.data.categories.filter((c) => c !== name);
    this.save();
    return true;
  }

  addArtikel() {
    const artikel = {
      id: kasseUid(),
      name: "Neuer Artikel",
      preis: 0,
      kategorie: this.data.categories[0] || "Sonstiges"
    };
    this.data.artikel.unshift(artikel);
    this.save();
    return artikel;
  }

  removeArtikel(id) {
    this.data.artikel = this.data.artikel.filter((a) => a.id !== id);
    this.save();
  }

  addTisch(name) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const tisch = { id: kasseUid(), name: trimmed, items: [], notiz: "" };
    this.data.tische.push(tisch);
    this.save();
    return tisch;
  }

  renameTisch(id, name) {
    const tisch = this.getTisch(id);
    if (!tisch) return;
    const trimmed = name.trim();
    if (trimmed) tisch.name = trimmed;
    this.save();
  }

  removeTisch(id) {
    this.data.tische = this.data.tische.filter((t) => t.id !== id);
    this.save();
  }

  getTisch(id) {
    return this.data.tische.find((t) => t.id === id);
  }

  setTischNotiz(id, text) {
    const tisch = this.getTisch(id);
    if (!tisch) return;
    tisch.notiz = text;
    this.save();
  }

  addItemToTisch(tischId, artikel) {
    const tisch = this.getTisch(tischId);
    if (!tisch) return;
    const existing = tisch.items.find((i) => i.artikelId === artikel.id);
    if (existing) {
      existing.menge += 1;
    } else {
      tisch.items.push({
        id: kasseUid(),
        artikelId: artikel.id,
        name: artikel.name,
        preis: artikel.preis,
        menge: 1
      });
    }
    this.save();
  }

  changeItemMenge(tischId, itemId, delta) {
    const tisch = this.getTisch(tischId);
    if (!tisch) return;
    const item = tisch.items.find((i) => i.id === itemId);
    if (!item) return;
    item.menge += delta;
    if (item.menge <= 0) {
      tisch.items = tisch.items.filter((i) => i.id !== itemId);
    }
    this.save();
  }

  removeItem(tischId, itemId) {
    const tisch = this.getTisch(tischId);
    if (!tisch) return;
    tisch.items = tisch.items.filter((i) => i.id !== itemId);
    this.save();
  }

  tischSumme(tisch) {
    return tisch.items.reduce((sum, i) => sum + i.preis * i.menge, 0);
  }

  tischStatus(tisch) {
    return tisch.items.length === 0 ? "frei" : "belegt";
  }

  abschliessen(tischId) {
    const tisch = this.getTisch(tischId);
    if (!tisch || tisch.items.length === 0) return null;

    const bon = {
      id: kasseUid(),
      timestamp: Date.now(),
      tischName: tisch.name,
      items: tisch.items.map((i) => ({ name: i.name, preis: i.preis, menge: i.menge })),
      summe: this.tischSumme(tisch)
    };
    this.data.verlauf.unshift(bon);
    tisch.items = [];
    tisch.notiz = "";
    this.save();
    return bon;
  }

  removeVerlaufEintrag(id) {
    this.data.verlauf = this.data.verlauf.filter((b) => b.id !== id);
    this.save();
  }
}
