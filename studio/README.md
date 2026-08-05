# Dragoncore Studio

Ein Werkzeug zum Bauen von Welten.

Kein Notizprogramm, keine Dateiverwaltung, keine Art Bible als Dokument. Der
Unterschied ist eine einzige Entscheidung: **Beziehungen haben hier eine
Bedeutung.** Ein Charakter *lebt in* einem Ort, ein Ort *enthält* ein Gebäude,
ein Möbelstück *besteht aus* einem Material, das Material *stammt von* einem
Baum, der Baum *wächst in* einem Biom. Aus vielen solchen Sätzen entsteht ein
Netz – und aus dem Netz die Welt.

Alles Weitere folgt daraus: der Weltgraph zeigt das Netz, die Art Bible gliedert
sich daran entlang, der Story-Modus wandert hindurch, und die App kann sagen
„Diese beiden hängen zusammen, aber du hast sie noch nicht verbunden.“

Die App läuft vollständig lokal im Browser. Kein Backend, kein Konto, keine
Übertragung. Alles liegt in IndexedDB auf dem Gerät, Bilder als echte Blobs.
Bedienbar auf dem Schreibtisch wie auf dem iPhone.

---

## Installation

Voraussetzung: Node.js 18 oder neuer.

```bash
cd studio
npm install
npm run dev
```

Dann `http://localhost:5173` öffnen. Vite zeigt beim Start zusätzlich eine
Netzwerkadresse (`Network: http://192.168.x.x:5173`) – darüber lässt sich die
App direkt auf dem iPhone im selben WLAN öffnen.

```bash
npm run typecheck   # TypeScript prüfen
npm run build       # Produktionsbuild nach dist/
npm run preview     # den Build lokal ansehen
```

Der Build nutzt relative Pfade und einen Hash-Router. `dist/` lässt sich daher
in jeden Unterordner eines Webservers legen und funktioniert ohne Server-Regeln
fürs Routing.

---

## Die vier tragenden Ideen

### 1. Alles ist ein Eintrag – und Typen sind Daten

Es gibt genau einen Datentyp: `Entry`. Ob daraus ein Charakter, ein Biom, ein
Prompt oder eine DNA-Regel wird, entscheiden `type`, `fields` (aus der
Typ-Registry) und `blocks` (freier Seiteninhalt).

`EntryType` ist bewusst ein `string`, keine feste Aufzählung. Deshalb kann man
in den Einstellungen einen eigenen Eintragstyp anlegen – mit Namen, Farbe,
Symbol und eigenen Feldern – und er verhält sich danach exakt wie die 21
eingebauten: eigener Platz in der Bibliothek, eigene Farbe im Graphen, eigene
Kapitel in der Art Bible. **Für eine neue Inhaltsart ist keine Zeile Code
nötig.**

### 2. Beziehungen tragen Bedeutung und Richtung

Eine Verbindung ist kein Link, sondern eine Aussage:

```
Waldkoi  --lebt in-->  Nebelwald
Nebelwald  --beherbergt-->  Waldkoi     (dieselbe Kante, andersherum gelesen)
```

Es gibt 13 Beziehungsarten (*lebt in, enthält, besteht aus, stammt von, wächst
in, benutzt, besitzt, trägt, erscheint in, entstand aus, folgt der Regel,
Variante von, verwandt mit*). Beim Verknüpfen liest sich der Dialog wie ein
Satz, damit klar bleibt, was man gerade über die Welt behauptet. Jede Kante
lässt sich umdrehen, umdeuten oder lösen.

Daraus entsteht das, was die App lebendig macht: **Entdeckungen im zweiten
Grad.** Unter jedem Eintrag steht, was mit seinen Nachbarn zusammenhängt, aber
noch nicht mit ihm selbst – „über Nebelwald · beheimatet“. Ein Klick, und die
Welt ist ein Stück dichter.

### 3. Die DNA ist der Prüfstein, nicht die Doku

Welt-DNA sind Regeln als eigene Einträge: *Ruhe vor Spektakel*, *Warmes Licht,
kühler Schatten*, *Gewachsen statt gebaut* – je mit Begründung und Listen für
„so ja“ und „so nicht“. Alles kann per Beziehung `folgt der Regel` daran
gebunden werden.

Die DNA-Seite zeigt deshalb nicht nur die Regeln, sondern **wie viel Prozent
der Welt tatsächlich an sie gebunden ist** und was jeder Regel folgt. Eine
Regel, der nichts folgt, ist sichtbar wirkungslos.

### 4. Nichts geht verloren

Löschen heißt Papierkorb. Jede Bearbeitung legt (gedrosselt) eine Fassung an.
Die Zeitleiste zeigt beides: den Arbeitsverlauf nach Tagen gruppiert und den
Papierkorb – beides mit „Zurückholen“.

---

## Was drin ist

### Inhalte
- **21 eingebaute Eintragstypen** in sechs Familien: Welt (Ort, Biom), Wesen
  (Charakter, Kreatur, Tier), Natur (Pflanze, Material), Gebautes (Architektur,
  Objekt, Möbel, Kleidung), Produktion (Asset, Prompt, Concept Art, Animation,
  UI), Erzählung (Lore, Quest, Magie, Musik), dazu DNA-Regel, Seite, Sammlung
- **Eigene Typen** in den Einstellungen, gleichberechtigt zu den eingebauten
- Fünf Bearbeitungsstände, Favoriten, Schlagworte, Titelbilder
- **15 Blocktypen** (Überschrift, Text, Zitat, Notiz, Bild, Galerie, Moodboard,
  Farbpalette, Materialpalette, Referenzkarten, Checkliste, Prompt, Asset-Liste,
  Trennlinie, Abstand) – verschieben per Ziehgriff am Desktop, per Hoch/Runter
  überall, dazu duplizieren, einklappen, löschen

### Weltgraph
Eigene Kräftesimulation mit räumlichem Raster (nicht paarweise – bleibt auch bei
tausenden Knoten flüssig). Knotengröße nach Vernetzungsgrad, Farbe nach Typ,
Kanten mit Beziehungsbeschriftung. Ziehen, Zoomen, Zwei-Finger-Pinch, Typfilter,
Fokusmodus (nur die Umgebung eines Knotens), Infokarte mit Sprung in den
Eintrag.

### Art Bible
Wird nicht geschrieben, sondern wächst mit. Kapitel entstehen aus den Familien,
die Farben der Welt werden aus allen Einträgen und Blöcken eingesammelt und nach
Häufigkeit sortiert, Materialien ebenso. Export als eigenständige HTML-Datei mit
eingebetteten Bildern.

### Story-Modus
Vollbild, ohne jede Bedienoberfläche. Von einem Eintrag aus wandert er durch
dessen Nachbarschaft, aus der Art Bible heraus durch ein ganzes Kapitel.
Blättern per Tastatur oder Wischen.

### Concept Canvas
Unendliche Fläche mit Bildern, Notizen, Rahmen, Freihandzeichnung und
Eintragskarten. Zwei Besonderheiten: Einträge liegen als echte Einträge dort
(ein Klick führt in die Welt), und **zwischen zwei Einträgen, die in der Welt
verbunden sind, zeichnet die Fläche die Verbindung von selbst**. Kamera und
Inhalt werden automatisch gespeichert.

### Asset-Pipeline
Acht Stufen von *Idee* bis *Exportiert*, als Tafel mit einer Spalte je Stufe.
Auf der Asset-Seite schlägt die App anhand der vorhandenen Daten eine Stufe vor
– entschieden wird trotzdem per Hand.

### Bilder
Mehrfachimport aus Fotomediathek oder Dateien-App, automatische Vorschaubilder,
Blobs in IndexedDB. Je Bild: Titel, Beschreibung, Schlagworte, Kategorie,
Prompt, negativer Prompt, Quelle, Status, Favorit, Verknüpfungen. Mediathek mit
Filtern (auch Orientierung), Vollbildansicht.

### Suche
Global (⌘K) über Titel, Untertitel, Beschreibungen, Schlagworte, Kategorien,
Asset-IDs, alle Vorlagenfelder und sämtliche Blockinhalte. Suchtexte werden je
Eintrag zwischengespeichert und nur bei Änderung neu gebaut.

### Sicherung
Vollsicherung als JSON – mit Einträgen, Beziehungen, Flächen, Einstellungen und
wahlweise eingebetteten Bilddaten. Import gegen ein Zod-Schema geprüft, wahlweise
ergänzend oder ersetzend; Beziehungen ohne Gegenstück werden ausgelassen und
gemeldet. Einzelexport eines Eintrags nimmt seine Beziehungen mit.

---

## Projektstruktur

```
studio/src/
├─ types/index.ts          Entry, Relation, Revision, CanvasBoard, Settings …
│
├─ db/
│  ├─ db.ts                Dexie-Schema (Fassung 2) + Migration alter Links
│  └─ seed.ts              Die Startwelt – 14 Einträge, 17 Beziehungen
│
├─ store/useStudio.ts      Globaler Zustand, Autospeichern, Fassungen
│
├─ lib/
│  ├─ relations.ts         Beziehungsarten, Index, Entdeckung, Pfadsuche
│  ├─ templates.ts         Typ-Registry (eingebaut + eigene)
│  ├─ graph.ts             Kräftesimulation mit räumlichem Raster
│  ├─ pipeline.ts          Produktionsstufen
│  ├─ blocks.ts            Blocktypen
│  ├─ images.ts            Import, Vorschaubilder, Object-URL-Cache
│  ├─ search.ts            Volltextsuche, Bewertung, Filter
│  ├─ portability.ts       JSON-Export/-Import, Druckansicht, Art-Bible-HTML
│  ├─ schemas.ts           Zod-Schemata
│  ├─ nav.ts, icons.ts, utils.ts
│
├─ components/
│  ├─ relations/           Beziehungsleiste und Verbinden-Dialog
│  ├─ blocks/              Block-Editor und Nur-Lese-Darstellung
│  ├─ story/               Story-Modus
│  ├─ entry/               Karten, Felder, Pipeline-Leiste, Druckansicht
│  ├─ images/              Vorschau, Auswahl, Import, Vollbild, Bearbeitung
│  ├─ home/                Ziele
│  ├─ settings/            Eigene Eintragstypen
│  ├─ layout/AppShell.tsx  Seitenleiste, Werkzeugleiste, mobile Aktionsleiste
│  └─ ui/                  Modal, Bestätigung, Hinweise, Formularfelder
│
└─ pages/                  Zuhause, DNA, Graph, Bibliothek, Canvas, Art Bible,
                           Pipeline, Zeitleiste, Bilder, Einstellungen, Eintrag
```

### Zwei Entscheidungen unter der Haube

**Speicher im Arbeitsspeicher, Wahrheit in IndexedDB.** Einträge, Beziehungen
und Bild-Metadaten liegen im Zustand-Store, damit Suche, Filter und Graph ohne
Verzögerung antworten. Jede Änderung wird gebündelt weggeschrieben und beim
Verlassen der Seite sofort.

**Der Beziehungsindex wird bei jeder Änderung neu gebaut.** Das klingt teuer,
ist aber nur ein Durchlauf über eine Liste – und dafür ist danach jede Abfrage
(Nachbarn, eingehend, ausgehend) in konstanter Zeit beantwortet.

---

## Bedienung auf dem iPhone

Touch-Ziele ab 44 px, Vollbild-Blätter statt enger Seitenleisten,
Safe-Area-Berücksichtigung, kein horizontales Verschieben, Eingabefelder mit
16 px (sonst zoomt iOS hinein). Graph und Canvas verstehen Ein-Finger-Schieben
und Zwei-Finger-Zoom. Beim Verschieben von Blöcken sind die Hoch/Runter-Knöpfe
immer da – Ziehen konkurriert auf dem Touchscreen zu leicht mit Scrollen.

---

## Geprüft

Mobil (390 × 844) und am Desktop (1440 × 900) mit Chromium durchgespielt:
Startseite, Graph (Knoten anklicken, Infokarte), Beziehung knüpfen und
wiederfinden, DNA-Abdeckung, Art Bible, Story-Modus samt Blättern, Pipeline,
Canvas (Notiz und Rahmen anlegen, Speicherung in IndexedDB geprüft), Zeitleiste,
Löschen → Papierkorb → Zurückholen (inklusive: der gelöschte Eintrag
verschwindet aus Suche, Bibliothek, Graph und Verbinden-Dialog, seine
Beziehungen sind nach dem Zurückholen wieder da), eigenen Typ anlegen und einen
Eintrag damit erzeugen, Volltextsuche, Sicherung mit Wiederherstellung samt
Bildern, Fehlermeldung bei ungültiger Importdatei. Ohne Konsolenfehler.

---

## Sinnvolle nächste Schritte

1. **PDF- und ZIP-Export.** `renderArtBibleHtml`, `renderEntryHtml` und
   `collectEntryImages` liefern bereits alle Bausteine.
2. **Beziehungspfade sichtbar machen.** `findPath` in `lib/relations.ts` ist
   fertig, aber noch ohne Oberfläche – „Zeig mir den Weg von diesem Charakter zu
   diesem Biom“.
3. **Prompt-Varianten als Baukasten.** Basisstil und Ergänzung automatisch
   zusammensetzen, statt zu kopieren.
4. **Überlappungsfreie Beschriftungen im Graphen.** Bei dichten Bereichen
   überlagern sich Titel noch; Ziehen und Zoomen lösen es, eine
   Kollisionsvermeidung wäre schöner.
5. **Canvas-Verbindungen von Hand.** Automatische Linien gibt es; frei gezogene
   Verbinder zwischen beliebigen Elementen wären die Ergänzung.
6. **Code-Splitting.** Der Build liegt bei etwa 700 kB in einer Datei; Canvas,
   Graph und Story-Modus ließen sich nachladen.
7. **Automatisierte Testsuite.** Geprüft wurde mit Browser-Skripten; feste Tests
   würden das dauerhaft absichern.

---

## Technik

React 18 · TypeScript · Vite · Tailwind CSS · Dexie (IndexedDB) · Zustand ·
React Hook Form · Zod · dnd-kit · Lucide Icons · React Router
