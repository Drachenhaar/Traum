let kasseActiveTab = "tische";
let kasseActiveTisch = null;
let kasseAddCatFilter = "Alle";
let kasseArtikelCatFilter = "Alle";
let kasseArtikelSearchTerm = "";

function renderKasseBook(kasse) {
  if (!kasse) return;
  renderKasseTabs();
  renderKasseTischGrid(kasse);
  renderKasseTischDetail(kasse);
  renderKasseArtikelCatFilter(kasse);
  renderKasseArtikelList(kasse);
  renderKasseKategorieList(kasse);
  renderKasseVerlauf(kasse);
}

function renderKasseTabs() {
  document.querySelectorAll(".kasse-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.kasseTab === kasseActiveTab);
  });
  ["tische", "artikel", "verlauf"].forEach((name) => {
    const el = document.getElementById(`kasseView${name[0].toUpperCase()}${name.slice(1)}`);
    if (el) el.classList.toggle("active", name === kasseActiveTab);
  });
}

function kasseOpenTisch(tischId) {
  kasseActiveTisch = tischId;
  kasseAddCatFilter = "Alle";
  const grid = document.getElementById("kasseTischGrid");
  const addRow = document.getElementById("kasseTischAddRow");
  const detail = document.getElementById("kasseTischDetail");
  if (grid) grid.style.display = "none";
  if (addRow) addRow.style.display = "none";
  if (detail) detail.style.display = "block";
}

function kasseCloseDetail() {
  kasseActiveTisch = null;
  const grid = document.getElementById("kasseTischGrid");
  const addRow = document.getElementById("kasseTischAddRow");
  const detail = document.getElementById("kasseTischDetail");
  if (grid) grid.style.display = "grid";
  if (addRow) addRow.style.display = "flex";
  if (detail) detail.style.display = "none";
}

function renderKasseTischGrid(kasse) {
  const grid = document.getElementById("kasseTischGrid");
  if (!grid) return;
  grid.innerHTML = "";

  kasse.data.tische.forEach((tisch) => {
    const status = kasse.tischStatus(tisch);
    const summe = kasse.tischSumme(tisch);

    const card = document.createElement("button");
    card.type = "button";
    card.className = "kasse-tisch-card " + status;

    const name = document.createElement("span");
    name.className = "kasse-tisch-card-name";
    name.textContent = tisch.name;

    const info = document.createElement("span");
    info.className = "kasse-tisch-card-info";
    info.textContent = status === "frei" ? "frei" : `${tisch.items.length} Pos. · ${formatEuro(summe)}`;

    card.appendChild(name);
    card.appendChild(info);
    card.addEventListener("click", () => {
      kasseOpenTisch(tisch.id);
      renderKasseTischDetail(kasse);
    });

    grid.appendChild(card);
  });

  if (kasseActiveTisch && !kasse.getTisch(kasseActiveTisch)) {
    kasseCloseDetail();
  }
}

function renderKasseTischDetail(kasse) {
  const detail = document.getElementById("kasseTischDetail");
  if (!detail) return;

  if (!kasseActiveTisch) {
    detail.style.display = "none";
    return;
  }

  const tisch = kasse.getTisch(kasseActiveTisch);
  if (!tisch) {
    kasseCloseDetail();
    return;
  }

  detail.style.display = "block";

  const nameInput = document.getElementById("kasseTischNameInput");
  if (nameInput && document.activeElement !== nameInput) nameInput.value = tisch.name;

  const notizInput = document.getElementById("kasseTischNotiz");
  if (notizInput && document.activeElement !== notizInput) notizInput.value = tisch.notiz;

  renderKasseAddCatFilter(kasse);
  renderKasseArtikelButtons(kasse);
  renderKasseOrderList(kasse, tisch);
}

function renderKasseOrderList(kasse, tisch) {
  const listEl = document.getElementById("kasseOrderList");
  const emptyEl = document.getElementById("kasseOrderEmpty");
  const sumEl = document.getElementById("kasseTischSumme");
  if (!listEl || !emptyEl || !sumEl) return;
  listEl.innerHTML = "";

  if (tisch.items.length === 0) {
    emptyEl.style.display = "block";
  } else {
    emptyEl.style.display = "none";
    tisch.items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "kasse-order-row";

      const name = document.createElement("span");
      name.className = "kasse-order-name";
      name.textContent = item.name;

      const stepper = document.createElement("div");
      stepper.className = "kasse-stepper";

      const minusBtn = document.createElement("button");
      minusBtn.type = "button";
      minusBtn.className = "kasse-stepper-button";
      minusBtn.textContent = "–";
      minusBtn.setAttribute("aria-label", "Menge verringern");
      minusBtn.addEventListener("click", () => {
        kasse.changeItemMenge(tisch.id, item.id, -1);
        renderKasseBook(kasse);
      });

      const menge = document.createElement("span");
      menge.className = "kasse-stepper-menge";
      menge.textContent = item.menge;

      const plusBtn = document.createElement("button");
      plusBtn.type = "button";
      plusBtn.className = "kasse-stepper-button";
      plusBtn.textContent = "+";
      plusBtn.setAttribute("aria-label", "Menge erhöhen");
      plusBtn.addEventListener("click", () => {
        kasse.changeItemMenge(tisch.id, item.id, 1);
        renderKasseBook(kasse);
      });

      stepper.appendChild(minusBtn);
      stepper.appendChild(menge);
      stepper.appendChild(plusBtn);

      const lineSum = document.createElement("span");
      lineSum.className = "kasse-order-linesum";
      lineSum.textContent = formatEuro(item.preis * item.menge);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "toolkit-icon-button";
      removeBtn.textContent = "✕";
      removeBtn.setAttribute("aria-label", "Position entfernen");
      removeBtn.addEventListener("click", () => {
        kasse.removeItem(tisch.id, item.id);
        renderKasseBook(kasse);
      });

      row.appendChild(name);
      row.appendChild(stepper);
      row.appendChild(lineSum);
      row.appendChild(removeBtn);
      listEl.appendChild(row);
    });
  }

  sumEl.textContent = formatEuro(kasse.tischSumme(tisch));
}

function renderKasseAddCatFilter(kasse) {
  const el = document.getElementById("kasseAddCatFilter");
  if (!el) return;
  el.innerHTML = "";
  ["Alle", ...kasse.data.categories].forEach((cat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "toolkit-filter-pill" + (cat === kasseAddCatFilter ? " active" : "");
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      kasseAddCatFilter = cat;
      renderKasseAddCatFilter(kasse);
      renderKasseArtikelButtons(kasse);
    });
    el.appendChild(btn);
  });
}

function renderKasseArtikelButtons(kasse) {
  const el = document.getElementById("kasseArtikelButtons");
  if (!el || !kasseActiveTisch) return;
  el.innerHTML = "";

  const filtered = kasse.data.artikel.filter(
    (a) => kasseAddCatFilter === "Alle" || a.kategorie === kasseAddCatFilter
  );

  if (filtered.length === 0) {
    const empty = document.createElement("p");
    empty.className = "book-empty toolkit-empty";
    empty.textContent = "Keine Artikel in dieser Kategorie.";
    el.appendChild(empty);
    return;
  }

  filtered.forEach((artikel) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "kasse-artikel-button";

    const name = document.createElement("span");
    name.className = "kasse-artikel-button-name";
    name.textContent = artikel.name;

    const preis = document.createElement("span");
    preis.className = "kasse-artikel-button-preis";
    preis.textContent = formatEuro(artikel.preis);

    btn.appendChild(name);
    btn.appendChild(preis);
    btn.addEventListener("click", () => {
      kasse.addItemToTisch(kasseActiveTisch, artikel);
      renderKasseBook(kasse);
    });

    el.appendChild(btn);
  });
}

function renderKasseArtikelCatFilter(kasse) {
  const el = document.getElementById("kasseArtikelCatFilter");
  if (!el) return;
  el.innerHTML = "";
  ["Alle", ...kasse.data.categories].forEach((cat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "toolkit-filter-pill" + (cat === kasseArtikelCatFilter ? " active" : "");
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      kasseArtikelCatFilter = cat;
      renderKasseBook(kasse);
    });
    el.appendChild(btn);
  });
}

function renderKasseArtikelList(kasse) {
  const listEl = document.getElementById("kasseArtikelList");
  const emptyEl = document.getElementById("kasseArtikelEmpty");
  if (!listEl || !emptyEl) return;
  listEl.innerHTML = "";

  const filtered = kasse.data.artikel.filter((a) => {
    const matchesCategory = kasseArtikelCatFilter === "Alle" || a.kategorie === kasseArtikelCatFilter;
    const matchesSearch = !kasseArtikelSearchTerm || a.name.toLowerCase().includes(kasseArtikelSearchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  filtered.forEach((artikel) => {
    const row = document.createElement("div");
    row.className = "kasse-artikel-row";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "toolkit-input kasse-artikel-name-input";
    nameInput.value = artikel.name;
    nameInput.addEventListener("change", () => {
      artikel.name = nameInput.value.trim() || artikel.name;
      kasse.save();
    });

    const preisInput = document.createElement("input");
    preisInput.type = "number";
    preisInput.min = "0";
    preisInput.step = "0.10";
    preisInput.className = "toolkit-input toolkit-input-num";
    preisInput.value = artikel.preis;
    preisInput.addEventListener("change", () => {
      artikel.preis = Number(preisInput.value) || 0;
      kasse.save();
      renderKasseBook(kasse);
    });

    const kategorieSelect = document.createElement("select");
    kategorieSelect.className = "toolkit-kategorie-select";
    kasse.data.categories.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      if (cat === artikel.kategorie) opt.selected = true;
      kategorieSelect.appendChild(opt);
    });
    const newOpt = document.createElement("option");
    newOpt.value = "__new__";
    newOpt.textContent = "+ neue Kategorie …";
    kategorieSelect.appendChild(newOpt);

    kategorieSelect.addEventListener("change", () => {
      if (kategorieSelect.value === "__new__") {
        const name = prompt("Name der neuen Kategorie:");
        if (name && name.trim()) {
          kasse.ensureCategory(name);
          artikel.kategorie = name.trim();
        }
      } else {
        artikel.kategorie = kategorieSelect.value;
      }
      kasse.save();
      renderKasseBook(kasse);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "toolkit-icon-button";
    deleteBtn.textContent = "✕";
    deleteBtn.setAttribute("aria-label", "Artikel löschen");
    deleteBtn.addEventListener("click", () => {
      if (confirm(`„${artikel.name}“ wirklich löschen?`)) {
        kasse.removeArtikel(artikel.id);
        renderKasseBook(kasse);
      }
    });

    row.appendChild(nameInput);
    row.appendChild(preisInput);
    row.appendChild(kategorieSelect);
    row.appendChild(deleteBtn);
    listEl.appendChild(row);
  });
}

function renderKasseKategorieList(kasse) {
  const listEl = document.getElementById("kasseKategorieList");
  if (!listEl) return;
  listEl.innerHTML = "";

  kasse.data.categories.forEach((cat) => {
    const row = document.createElement("div");
    row.className = "kasse-kategorie-row";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "toolkit-input kasse-kategorie-input";
    input.value = cat;
    input.addEventListener("change", () => {
      kasse.renameCategory(cat, input.value);
      renderKasseBook(kasse);
    });

    const count = kasse.categoryArtikelCount(cat);
    const countEl = document.createElement("span");
    countEl.className = "kasse-kategorie-count";
    countEl.textContent = `${count} Artikel`;

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "toolkit-icon-button";
    deleteBtn.textContent = "✕";
    deleteBtn.setAttribute("aria-label", "Kategorie löschen");
    deleteBtn.addEventListener("click", () => {
      if (count > 0) {
        alert(`„${cat}“ wird noch von ${count} Artikel verwendet – erst deren Kategorie ändern.`);
        return;
      }
      if (!confirm(`Kategorie „${cat}“ wirklich löschen?`)) return;
      kasse.removeCategory(cat);
      renderKasseBook(kasse);
    });

    row.appendChild(input);
    row.appendChild(countEl);
    row.appendChild(deleteBtn);
    listEl.appendChild(row);
  });
}

function renderKasseVerlauf(kasse) {
  const listEl = document.getElementById("kasseVerlaufList");
  const emptyEl = document.getElementById("kasseVerlaufEmpty");
  if (!listEl || !emptyEl) return;
  listEl.innerHTML = "";

  if (kasse.data.verlauf.length === 0) {
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  kasse.data.verlauf.slice(0, 40).forEach((bon) => {
    const div = document.createElement("div");
    div.className = "toolkit-verlauf-entry kasse-verlauf-entry";

    const date = new Date(bon.timestamp);
    const dateStr = date.toLocaleDateString("de-DE") + " · " + date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    const itemsStr = bon.items.map((i) => `${i.menge}× ${i.name}`).join(", ");

    const head = document.createElement("div");
    head.className = "kasse-verlauf-head";
    const dateEl = document.createElement("b");
    dateEl.textContent = `${dateStr} · ${bon.tischName}`;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "toolkit-icon-button";
    removeBtn.textContent = "✕";
    removeBtn.setAttribute("aria-label", "Eintrag entfernen");
    removeBtn.addEventListener("click", () => {
      kasse.removeVerlaufEintrag(bon.id);
      renderKasseBook(kasse);
    });
    head.appendChild(dateEl);
    head.appendChild(removeBtn);

    div.appendChild(head);
    div.appendChild(document.createTextNode(itemsStr));
    div.appendChild(document.createElement("br"));

    const sumEl = document.createElement("b");
    sumEl.textContent = formatEuro(bon.summe);
    div.appendChild(sumEl);

    listEl.appendChild(div);
  });
}

function initKasseUI(kasse) {
  if (!kasse) return;

  document.querySelectorAll(".kasse-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      kasseActiveTab = btn.dataset.kasseTab;
      renderKasseBook(kasse);
    });
  });

  const backButton = document.getElementById("kasseBackButton");
  if (backButton) {
    backButton.addEventListener("click", () => {
      kasseCloseDetail();
    });
  }

  const nameInput = document.getElementById("kasseTischNameInput");
  if (nameInput) {
    nameInput.addEventListener("change", () => {
      if (!kasseActiveTisch) return;
      kasse.renameTisch(kasseActiveTisch, nameInput.value);
      renderKasseTischGrid(kasse);
    });
  }

  const notizInput = document.getElementById("kasseTischNotiz");
  if (notizInput) {
    notizInput.addEventListener("change", () => {
      if (!kasseActiveTisch) return;
      kasse.setTischNotiz(kasseActiveTisch, notizInput.value);
    });
  }

  const removeTischBtn = document.getElementById("kasseRemoveTisch");
  if (removeTischBtn) {
    removeTischBtn.addEventListener("click", () => {
      if (!kasseActiveTisch) return;
      const tisch = kasse.getTisch(kasseActiveTisch);
      if (!tisch) return;
      if (tisch.items.length > 0 && !confirm(`„${tisch.name}“ hat noch offene Positionen. Trotzdem löschen?`)) return;
      if (tisch.items.length === 0 && !confirm(`„${tisch.name}“ wirklich löschen?`)) return;
      kasse.removeTisch(kasseActiveTisch);
      kasseCloseDetail();
      renderKasseBook(kasse);
    });
  }

  const abschliessenBtn = document.getElementById("kasseAbschliessenButton");
  if (abschliessenBtn) {
    abschliessenBtn.addEventListener("click", () => {
      if (!kasseActiveTisch) return;
      const tisch = kasse.getTisch(kasseActiveTisch);
      if (!tisch || tisch.items.length === 0) {
        alert("Noch nichts bestellt – nichts zu übertragen.");
        return;
      }
      if (!confirm(`„${tisch.name}“ jetzt als an der Kasse eingebongt markieren und leeren?`)) return;
      kasse.abschliessen(kasseActiveTisch);
      kasseCloseDetail();
      renderKasseBook(kasse);
    });
  }

  const addTischBtn = document.getElementById("kasseAddTisch");
  if (addTischBtn) {
    addTischBtn.addEventListener("click", () => {
      const input = document.getElementById("kasseNewTischName");
      if (!input || !input.value.trim()) return;
      kasse.addTisch(input.value);
      input.value = "";
      renderKasseBook(kasse);
    });
  }

  const newTischInput = document.getElementById("kasseNewTischName");
  if (newTischInput) {
    newTischInput.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      if (!newTischInput.value.trim()) return;
      kasse.addTisch(newTischInput.value);
      newTischInput.value = "";
      renderKasseBook(kasse);
    });
  }

  const search = document.getElementById("kasseArtikelSearch");
  if (search) {
    search.addEventListener("input", (e) => {
      kasseArtikelSearchTerm = e.target.value;
      renderKasseArtikelList(kasse);
    });
  }

  const addArtikelBtn = document.getElementById("kasseAddArtikel");
  if (addArtikelBtn) {
    addArtikelBtn.addEventListener("click", () => {
      kasse.addArtikel();
      renderKasseBook(kasse);
    });
  }
}
