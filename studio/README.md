# Dragoncore Studio

Ein persönlicher Creative-Workspace für das Fantasyprojekt **Dragoncore** – Archiv,
Asset-Datenbank und lebendige Art Bible in einer App.

Die App läuft vollständig lokal im Browser. Es gibt **kein Backend**: alle Einträge,
Bilder und Einstellungen liegen in IndexedDB auf dem Gerät und bleiben nach einem
Neuladen erhalten. Bilder werden als echte Blobs gespeichert – kein Base64, kein
localStorage.

Die Bedienung ist für das iPhone gebaut: alle wichtigen Bedienelemente sind
mindestens 44 × 44 px groß, Editoren öffnen als Vollbild-Blätter, und die Seite
verschiebt sich nicht horizontal.

---

## Installation

Voraussetzung: Node.js 18 oder neuer.

```bash
cd studio
npm install
npm run dev
```

Danach im Browser `http://localhost:5173` öffnen.

Damit die App auf dem iPhone im selben WLAN erreichbar ist, zeigt Vite beim Start
zusätzlich eine Netzwerk-Adresse an (`Network: http://192.168.x.x:5173`).

Weitere Befehle:

```bash
npm run typecheck   # TypeScript prüfen
npm run build       # Produktionsbuild nach dist/
npm run preview     # den Build lokal ansehen
```

Der Build nutzt relative Pfade (`base: './'`) und einen Hash-Router. Der Inhalt von
`dist/` lässt sich daher in jeden Unterordner eines Webservers legen – etwa nach
`Traum/studio/` – und funktioniert ohne Server-Regeln für das Routing.

---

## Projektstruktur

```
studio/
├─ index.html                 Einstiegspunkt, iPhone-Meta-Tags (Safe Area)
├─ tailwind.config.js         Farben, Schriften, Schatten, Animationen
└─ src/
   ├─ main.tsx                Anwendungsstart
   ├─ App.tsx                 Routen (HashRouter)
   ├─ index.css               Basisstile und wiederverwendbare Klassen (.btn, .card …)
   │
   ├─ types/index.ts          Alle Datentypen: Entry, Block, Bild, Navigation, Filter
   │
   ├─ db/
   │  ├─ db.ts                Dexie-Schema (entries, images, imageBlobs, settings)
   │  └─ seed.ts              Beispieldaten für den allerersten Start
   │
   ├─ store/useStudio.ts      Globaler Zustand + Autospeichern in IndexedDB
   │
   ├─ lib/
   │  ├─ templates.ts         Vorlagen: welche Felder ein Eintragstyp hat
   │  ├─ blocks.ts            Blocktypen, Standardwerte, Zusammenfassungen
   │  ├─ images.ts            Bildimport, Vorschaubilder, Object-URL-Cache
   │  ├─ search.ts            Volltextsuche, Bewertung, Filter
   │  ├─ portability.ts       JSON-Export/-Import und Druckansicht (HTML)
   │  ├─ schemas.ts           Zod-Schemata für Formulare und Import
   │  ├─ nav.ts               Standard-Navigation
   │  ├─ icons.ts             Icon-Auflösung nach Name
   │  └─ utils.ts             Datum, Kopieren, Download, kleine Helfer
   │
   ├─ components/
   │  ├─ layout/AppShell.tsx  Seitenleiste, Werkzeugleiste, mobile Aktionsleiste
   │  ├─ ui/                  Modal, Bestätigung, Hinweise, Formularfelder, Leerzustand
   │  ├─ entry/               Karten, Übersicht, Vorlagenfelder, Verknüpfungen, Druckansicht
   │  ├─ blocks/              Block-Editor und die Darstellung aller Blocktypen
   │  ├─ images/              Vorschau, Auswahl, Import, Vollbild, Bearbeitung
   │  └─ search/              Globale Suche
   │
   └─ pages/                  Startseite, Bereichsseiten, Eintrag, Bilder, Einstellungen
```

### Zwei Gedanken hinter dem Aufbau

**Ein Datentyp für alles.** Es gibt nur `Entry`. Ob daraus ein Charakter, ein Asset
oder ein Prompt wird, entscheiden `type` (welche Ansicht), `fields` (typspezifische
Angaben) und `blocks` (freier Seiteninhalt). Neue Felder oder ganz neue Eintragstypen
brauchen deshalb nur einen Eintrag in `lib/templates.ts` – kein neues Formular und
keine Datenbank-Migration.

**Speicher im Arbeitsspeicher, Wahrheit in IndexedDB.** Alle Einträge liegen im
Zustand-Store, damit Suche und Filter ohne Verzögerung reagieren. Jede Änderung wird
zusätzlich gebündelt nach IndexedDB geschrieben (Autospeichern) und beim Verlassen
der Seite sofort weggeschrieben.

---

## Vorhandene Funktionen

### Inhalte
- Neun Eintragstypen: Seite, Ort, Charakter, Kreatur, Pflanze, Architektur, Asset,
  Prompt, Sammlung
- Stammdaten mit Titel, Untertitel, Kategorie, Beschreibung, Schlagworten, Status
  und Favorit
- Fünf Bearbeitungsstände: Idee, In Arbeit, Überarbeitung, Freigegeben, Archiviert
- Anlegen, Bearbeiten, Duplizieren und Löschen (mit Bestätigung) für jeden Eintrag
- Titelbild je Eintrag
- Autospeichern mit sichtbarer Rückmeldung

### Block-Editor
15 Blocktypen: Überschrift, Fließtext, Zitat, Notiz, Bild, Bildergalerie, Moodboard,
Farbpalette, Materialpalette, Referenzkarten, Checkliste, Prompt, Asset-Liste,
Trennlinie und freier Abstand.

Jeder Block lässt sich bearbeiten, verschieben, duplizieren, einklappen und löschen.
Zum Verschieben gibt es auf dem Desktop einen Ziehgriff (dnd-kit) und überall
zusätzlich Hoch-/Runter-Schaltflächen – die auf dem Touchscreen zuverlässig sind.

### Bilder
- Mehrere Bilder gleichzeitig aus Fotomediathek oder Dateien-App importieren
- Automatisch erzeugte Vorschaubilder, Originale bleiben unangetastet
- Angaben je Bild: Titel, Beschreibung, Schlagworte, Kategorie, Prompt, negativer
  Prompt, Quelle, Status, Favorit, Verknüpfungen
- Mediathek mit Raster- und Listenansicht, Suche und Filtern (Kategorie, Status,
  Schlagwort, Favoriten, Orientierung)
- Vollbildansicht mit Blättern
- Wird ein Bild gelöscht, verschwindet es auch aus allen Einträgen und Blöcken

### Spezialisierte Ansichten
- **Charaktere**: Rolle, Alter, Persönlichkeit, Hintergrund, Gesicht, Haare,
  Kleidung, Farbpalette, Begleiter, Turnaround, Ausdrücke, Bewegungsreferenzen,
  Animationsnotizen, Prompts, verbundene Orte und Objekte
- **Kreaturen**: Art, Größe, Lebensraum, Verhalten, Persönlichkeit, Farbpalette,
  Körperteile, Bewegungsarten, Turnaround, Animationsnotizen, Prompts, Assets
- **Assets**: Asset-ID, Unterkategorie, Perspektive, Orientierung, Pivot-Hinweis,
  freigestellt, animierbar, Dateiformat, Prompt und negativer Prompt – mit Filtern
  für freigestellt, animierbar und Orientierung
- **Prompts**: Modell, Prompt, negativer Prompt, Seitenverhältnis, Auflösung, Seed,
  Bewertung, Vorlagen-Kennzeichnung, Referenz- und Ergebnisbilder, Notizen –
  filterbar nach Modell und Kategorie, Prompts sind mit einem Tipp kopierbar

### Suche und Verknüpfungen
- Globale Suche (⌘K / Strg+K) über Titel, Untertitel, Beschreibungen, Schlagworte,
  Kategorien, Asset-IDs, alle Vorlagenfelder und sämtliche Blockinhalte
- Bereichssuche mit Filtern in jeder Übersicht
- Beidseitige Verknüpfungen zwischen Einträgen; verwandte Inhalte erscheinen in der
  Detailansicht und lassen sich dort wieder lösen

### Import und Export
- Vollsicherung als JSON – wahlweise mit eingebetteten Bilddaten oder nur die Daten
- Import mit Prüfung gegen ein Schema und verständlicher Fehlermeldung
- Import wahlweise ergänzend oder ersetzend
- Einzelner Eintrag als JSON (inklusive der zugehörigen Bilder)
- Druckfreundliche HTML-Ansicht je Eintrag – ansehen, drucken oder als Datei sichern
- Erinnerung, wenn die letzte Sicherung zu lange her ist

### Bedienung
- Anpassbare Navigation: Reihenfolge ändern, Bereiche aus- und einblenden
- Startseite mit Zahlen, zuletzt Bearbeitetem, Favoriten, neuen Bildern und
  Schnellaktionen
- Leere Zustände mit klarer Handlungsaufforderung statt leerer Flächen
- Bestätigung vor jedem endgültigen Löschen

---

## Beispieldaten

Beim allerersten Start werden sechs Einträge angelegt: die Seite „Die Essenz“, der
Ort „Gedankenobservatorium“, der Charakter „Unbenannter Weggefährte“, die Kreatur
„Waldkoi“, das Asset „Sternenbuchpult“ und der Prompt „Dragoncore DNA – Basisstil“.
Sie sind untereinander verknüpft und ganz normale Daten: vollständig bearbeitbar,
duplizierbar und löschbar.

Wer in den Einstellungen „Alle Daten löschen“ wählt, beginnt mit einem wirklich
leeren Archiv – die Beispieldaten kommen nicht zurück.

---

## Sinnvolle nächste Erweiterungen

1. **PDF- und ZIP-Export.** Die Druckansicht erzeugt bereits eine in sich
   geschlossene HTML-Datei mit eingebetteten Bildern; `renderEntryHtml` und
   `collectEntryImages` in `lib/portability.ts` sind die Bausteine dafür.
2. **Beziehungsgraph.** Eine visuelle Karte der Verknüpfungen – wer gehört zu
   welchem Ort, welcher Prompt erzeugte welches Asset.
3. **Versionen und Verlauf.** Ältere Stände eines Eintrags aufbewahren und
   wiederherstellen.
4. **Bildzuschnitt und Freistellungs-Vorschau.** Besonders für Assets nützlich,
   inklusive einer Anzeige des Pivot-Punkts.
5. **Zusammenhängender Prompt-Baukasten.** Basisstil und Variante automatisch
   zusammensetzen statt von Hand kopieren.
6. **Synchronisierung.** Ein optionaler Abgleich zwischen Geräten – die Export- und
   Importschicht ist bereits darauf ausgelegt.
7. **Code-Splitting.** Der Build liegt derzeit bei etwa 570 kB in einer Datei; die
   Druckansicht und der Block-Editor ließen sich nachladen.
8. **Automatisierte Tests.** Die Kernabläufe wurden von Hand und mit Browser-Skripten
   geprüft; eine feste Testsuite würde das dauerhaft absichern.

---

## Technik

React 18 · TypeScript · Vite · Tailwind CSS · Dexie (IndexedDB) · Zustand ·
React Hook Form · Zod · dnd-kit · Lucide Icons · React Router
