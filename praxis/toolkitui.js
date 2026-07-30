let toolkitActiveTab = "gerichte";
let toolkitActiveFilter = "Alle";
let toolkitSearchTerm = "";

function toolkitCategoryClass(kategorie) {
  if (kategorie === "Markt") return "markt";
  if (kategorie === "Catering") return "catering";
  return "sonst";
}

function renderToolkitBook(toolkit) {
  if (!toolkit) return;
  renderToolkitTabs();
  renderToolkitFilterTabs(toolkit);
  renderToolkitGerichtList(toolkit);
  renderToolkitBestandList(toolkit);
  renderToolkitEventList(toolkit);
  renderToolkitPackTable(toolkit);
  renderToolkitVerlauf(toolkit);
}

function renderToolkitTabs() {
  document.querySelectorAll(".toolkit-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.toolkitTab === toolkitActiveTab);
  });
  ["gerichte", "bestand", "packliste"].forEach((name) => {
    const el = document.getElementById(`toolkitView${name[0].toUpperCase()}${name.slice(1)}`);
    if (el) el.classList.toggle("active", name === toolkitActiveTab);
  });
}

function renderToolkitFilterTabs(toolkit) {
  const el = document.getElementById("toolkitFilter");
  if (!el) return;
  el.innerHTML = "";
  ["Alle", ...toolkit.data.categories].forEach((cat) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "toolkit-filter-pill" + (cat === toolkitActiveFilter ? " active" : "");
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      toolkitActiveFilter = cat;
      renderToolkitBook(toolkit);
    });
    el.appendChild(btn);
  });
}

function renderToolkitGerichtList(toolkit) {
  const listEl = document.getElementById("toolkitGerichtList");
  const emptyEl = document.getElementById("toolkitGerichtEmpty");
  if (!listEl || !emptyEl) return;
  listEl.innerHTML = "";

  const filtered = toolkit.data.gerichte.filter((g) => {
    const matchesCategory = toolkitActiveFilter === "Alle" || g.kategorie === toolkitActiveFilter;
    const matchesSearch = !toolkitSearchTerm || g.name.toLowerCase().includes(toolkitSearchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

  filtered.forEach((gericht) => listEl.appendChild(renderToolkitGerichtCard(toolkit, gericht)));
}

function renderToolkitGerichtCard(toolkit, gericht) {
  const card = document.createElement("div");
  card.className = "toolkit-card";

  const head = document.createElement("div");
  head.className = "toolkit-card-head";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "toolkit-gericht-name";
  nameInput.value = gericht.name;
  nameInput.addEventListener("input", () => {
    gericht.name = nameInput.value;
    toolkit.save();
  });
  nameInput.addEventListener("change", () => {
    gericht.name = nameInput.value.trim() || gericht.name;
    toolkit.save();
    renderToolkitBook(toolkit);
  });

  const badge = document.createElement("span");
  badge.className = "toolkit-tag " + toolkitCategoryClass(gericht.kategorie);
  badge.textContent = gericht.kategorie;

  const kategorieSelect = document.createElement("select");
  kategorieSelect.className = "toolkit-kategorie-select";
  toolkit.data.categories.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    if (cat === gericht.kategorie) opt.selected = true;
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
        toolkit.ensureCategory(name);
        gericht.kategorie = name.trim();
      }
    } else {
      gericht.kategorie = kategorieSelect.value;
    }
    toolkit.save();
    renderToolkitBook(toolkit);
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "toolkit-icon-button";
  deleteBtn.textContent = "✕";
  deleteBtn.setAttribute("aria-label", "Gericht löschen");
  deleteBtn.addEventListener("click", () => {
    if (confirm(`„${gericht.name}“ wirklich löschen?`)) {
      toolkit.removeGericht(gericht.id);
      renderToolkitBook(toolkit);
    }
  });

  head.appendChild(nameInput);
  head.appendChild(badge);
  head.appendChild(kategorieSelect);
  head.appendChild(deleteBtn);
  card.appendChild(head);

  const werkzeugList = document.createElement("div");
  werkzeugList.className = "toolkit-werkzeug-list";
  gericht.werkzeuge.forEach((werkzeug) => {
    werkzeugList.appendChild(renderToolkitWerkzeugRow(toolkit, gericht, werkzeug));
  });
  card.appendChild(werkzeugList);

  const addWerkzeugBtn = document.createElement("button");
  addWerkzeugBtn.type = "button";
  addWerkzeugBtn.className = "toolkit-add-werkzeug";
  addWerkzeugBtn.textContent = "+ Werkzeug";
  addWerkzeugBtn.addEventListener("click", () => {
    gericht.werkzeuge.push({ id: toolkitUid(), name: "", menge: 1 });
    toolkit.save();
    renderToolkitBook(toolkit);
  });
  card.appendChild(addWerkzeugBtn);

  return card;
}

function renderToolkitWerkzeugRow(toolkit, gericht, werkzeug) {
  const row = document.createElement("div");
  row.className = "toolkit-werkzeug-row";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "toolkit-input";
  nameInput.placeholder = "Werkzeug, z. B. Spachtel";
  nameInput.value = werkzeug.name;
  nameInput.addEventListener("input", () => {
    werkzeug.name = nameInput.value;
    const trimmed = werkzeug.name.trim();
    if (trimmed && !(trimmed in toolkit.data.bestand)) {
      toolkit.data.bestand[trimmed] = 0;
    }
    toolkit.save();
  });

  const mengeInput = document.createElement("input");
  mengeInput.type = "number";
  mengeInput.min = "0";
  mengeInput.className = "toolkit-input toolkit-input-num";
  mengeInput.value = werkzeug.menge;
  mengeInput.addEventListener("input", () => {
    werkzeug.menge = Number(mengeInput.value) || 0;
    toolkit.save();
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "toolkit-icon-button";
  deleteBtn.textContent = "✕";
  deleteBtn.setAttribute("aria-label", "Werkzeug entfernen");
  deleteBtn.addEventListener("click", () => {
    gericht.werkzeuge = gericht.werkzeuge.filter((w) => w.id !== werkzeug.id);
    toolkit.save();
    renderToolkitBook(toolkit);
  });

  row.appendChild(nameInput);
  row.appendChild(mengeInput);
  row.appendChild(deleteBtn);
  return row;
}

function renderToolkitBestandList(toolkit) {
  const listEl = document.getElementById("toolkitBestandList");
  if (!listEl) return;
  listEl.innerHTML = "";

  const namen = toolkit.allWerkzeugNamen();
  if (namen.length === 0) {
    const empty = document.createElement("p");
    empty.className = "book-empty toolkit-empty";
    empty.textContent = "Noch keine Werkzeuge. Lege welche bei einem Gericht an.";
    listEl.appendChild(empty);
    return;
  }

  namen.forEach((name) => {
    const row = document.createElement("div");
    row.className = "toolkit-bestand-row";

    const nameEl = document.createElement("span");
    nameEl.className = "toolkit-bestand-name";
    nameEl.textContent = name;

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.className = "toolkit-input toolkit-input-num";
    input.value = toolkit.data.bestand[name] ?? 0;
    input.addEventListener("input", () => {
      toolkit.data.bestand[name] = Number(input.value) || 0;
      toolkit.save();
      renderToolkitPackTable(toolkit);
    });

    row.appendChild(nameEl);
    row.appendChild(input);

    if (!toolkit.isWerkzeugInGebrauch(name)) {
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "toolkit-icon-button";
      delBtn.textContent = "✕";
      delBtn.setAttribute("aria-label", "Aus dem Bestand entfernen");
      delBtn.addEventListener("click", () => {
        delete toolkit.data.bestand[name];
        toolkit.save();
        renderToolkitBook(toolkit);
      });
      row.appendChild(delBtn);
    }

    listEl.appendChild(row);
  });
}

function renderToolkitEventList(toolkit) {
  const el = document.getElementById("toolkitEventList");
  if (!el) return;
  el.innerHTML = "";

  if (toolkit.data.gerichte.length === 0) {
    const empty = document.createElement("p");
    empty.className = "book-empty toolkit-empty";
    empty.textContent = "Noch keine Gerichte angelegt.";
    el.appendChild(empty);
    return;
  }

  toolkit.data.gerichte.forEach((gericht) => {
    const row = document.createElement("div");
    row.className = "toolkit-event-row";

    const badge = document.createElement("span");
    badge.className = "toolkit-tag " + toolkitCategoryClass(gericht.kategorie);
    badge.textContent = gericht.kategorie;

    const name = document.createElement("span");
    name.className = "toolkit-event-name";
    name.textContent = gericht.name;

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.className = "toolkit-input toolkit-input-num";
    input.value = toolkit.data.eventAuswahl[gericht.id] || 0;
    input.addEventListener("input", () => {
      const val = Number(input.value) || 0;
      if (val > 0) {
        toolkit.data.eventAuswahl[gericht.id] = val;
      } else {
        delete toolkit.data.eventAuswahl[gericht.id];
      }
      toolkit.save();
      renderToolkitPackTable(toolkit);
    });

    row.appendChild(badge);
    row.appendChild(name);
    row.appendChild(input);
    el.appendChild(row);
  });
}

function renderToolkitPackTable(toolkit) {
  const bedarf = toolkit.berechneBedarf();
  const namen = Object.keys(bedarf).sort((a, b) => a.localeCompare(b, "de"));
  const table = document.getElementById("toolkitPackTable");
  const body = document.getElementById("toolkitPackTableBody");
  const emptyEl = document.getElementById("toolkitPackEmpty");
  if (!table || !body || !emptyEl) return;
  body.innerHTML = "";

  if (namen.length === 0) {
    table.style.display = "none";
    emptyEl.style.display = "block";
    return;
  }
  table.style.display = "table";
  emptyEl.style.display = "none";

  namen.forEach((name) => {
    const benoetigt = bedarf[name];
    const bestand = toolkit.data.bestand[name] || 0;
    const rest = bestand - benoetigt;
    const reicht = rest >= 0;

    const tr = document.createElement("tr");
    const tdName = document.createElement("td");
    tdName.textContent = name;
    const tdBestand = document.createElement("td");
    tdBestand.textContent = bestand;
    const tdBenoetigt = document.createElement("td");
    tdBenoetigt.textContent = `− ${benoetigt}`;
    const tdRest = document.createElement("td");
    tdRest.textContent = reicht ? `${rest}` : `${rest} (fehlt ${-rest})`;
    tdRest.className = reicht ? "toolkit-status-ok" : "toolkit-status-bad";

    tr.appendChild(tdName);
    tr.appendChild(tdBestand);
    tr.appendChild(tdBenoetigt);
    tr.appendChild(tdRest);
    body.appendChild(tr);
  });
}

function renderToolkitVerlauf(toolkit) {
  const el = document.getElementById("toolkitVerlaufList");
  if (!el) return;
  el.innerHTML = "";

  if (toolkit.data.verlauf.length === 0) {
    const empty = document.createElement("p");
    empty.className = "book-empty toolkit-empty";
    empty.textContent = "Noch keine Abzüge.";
    el.appendChild(empty);
    return;
  }

  toolkit.data.verlauf.slice(0, 20).forEach((eintrag) => {
    const div = document.createElement("div");
    div.className = "toolkit-verlauf-entry";
    const date = new Date(eintrag.timestamp);
    const dateStr = date.toLocaleDateString("de-DE") + " · " + date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    const itemsStr = eintrag.items.map((i) => `${i.name} (${i.menge})`).join(", ");
    const dateEl = document.createElement("b");
    dateEl.textContent = dateStr;
    div.appendChild(dateEl);
    div.appendChild(document.createElement("br"));
    div.appendChild(document.createTextNode(itemsStr));
    el.appendChild(div);
  });
}

function initToolkitUI(toolkit) {
  if (!toolkit) return;

  document.querySelectorAll(".toolkit-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      toolkitActiveTab = btn.dataset.toolkitTab;
      renderToolkitBook(toolkit);
    });
  });

  const search = document.getElementById("toolkitSearch");
  if (search) {
    search.addEventListener("input", (e) => {
      toolkitSearchTerm = e.target.value;
      renderToolkitGerichtList(toolkit);
    });
  }

  const addGerichtBtn = document.getElementById("toolkitAddGericht");
  if (addGerichtBtn) {
    addGerichtBtn.addEventListener("click", () => {
      toolkit.addGericht();
      renderToolkitBook(toolkit);
    });
  }

  const addBestandBtn = document.getElementById("toolkitAddBestand");
  if (addBestandBtn) {
    addBestandBtn.addEventListener("click", () => {
      const input = document.getElementById("toolkitNewBestandName");
      const name = input.value.trim();
      if (!name) return;
      if (!(name in toolkit.data.bestand)) toolkit.data.bestand[name] = 0;
      input.value = "";
      toolkit.save();
      renderToolkitBook(toolkit);
    });
  }

  const confirmDeductBtn = document.getElementById("toolkitConfirmDeduct");
  if (confirmDeductBtn) {
    confirmDeductBtn.addEventListener("click", () => {
      const bedarf = toolkit.berechneBedarf();
      if (Object.keys(bedarf).length === 0) {
        alert("Keine Gerichte ausgewählt – nichts zum Abziehen.");
        return;
      }
      if (!confirm("Bestand jetzt um die benötigten Mengen reduzieren?")) return;
      toolkit.deductBedarf();
      renderToolkitBook(toolkit);
    });
  }
}
