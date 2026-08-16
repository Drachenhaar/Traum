# Übergabe an die nächste KI

Dieses Dokument erklärt, **was Dragoncore ist, wie es gebaut ist und woran man
sich beim Weiterarbeiten die Finger verbrennt.** Es ersetzt nicht `README.md`
(das erklärt das Produkt) und nicht die Kopfkommentare der Quelldateien (die
erklären jeweils eine Entscheidung). Es ist die Karte dazwischen.

Wer hier einsteigt, sollte drei Dinge zuerst lesen: diesen Text, dann
`README.md`, dann den Kopfkommentar der Datei, die er anfassen will. Die
Kopfkommentare sind nicht dekorativ – in diesem Projekt steht der *Grund* für
eine Bauart im Code, nicht in einem Ticket.

---

## 1. Was das ist

Ein **digitales Buch**, kein Werkzeugkasten mit Buchtapete.

- React 18 + TypeScript + Vite + Tailwind, HashRouter, Dexie (IndexedDB),
  Zustand, Zod.
- **Vollständig lokal.** Kein Backend, kein Konto, keine Übertragung, keine KI
  zur Laufzeit. Alles liegt in IndexedDB auf dem Gerät, Bilder als Blobs.
- Liegt unter `studio/` im Repo `Drachenhaar/Traum`.
- `vite.config.ts` setzt `base: '/Traum/studio/'`; ein GitHub-Actions-Lauf
  veröffentlicht nach <https://drachenhaar.github.io/Traum/studio/>.
- Entwicklungszweig: `claude/dragoncore-studio-app-4n5it0`, gemergt nach `main`.
- **Alles ist deutsch:** Bezeichner, Kommentare, Dateinamen, Oberfläche. Wer
  englische Namen einführt, bricht die Lesbarkeit des ganzen Bestandes.

### Die Gesetze, die nicht verhandelbar sind

Sie stammen aus den Aufträgen des Verfassers und stehen über jeder technischen
Bequemlichkeit. Wer eines davon bricht, hat die Aufgabe verfehlt, auch wenn der
Code funktioniert.

1. **Die Mitte gehört dem Werk.** Nie ein Dashboard. Keine dauerhafte
   Seitenleiste, kein Inspektor, keine Werkzeugleiste, die den Inhalt umzingelt.
2. **Lesen ist der Ruhezustand.** Eine Seite sieht aus wie eine Seite.
   Bearbeiten ist eine bewusste Handlung, kein Dauerzustand.
3. **Unvollständigkeit ist kein Fehler.** Nichts mahnt, nichts zählt fehlende
   Felder, nichts nennt eine Welt „unfertig". Eine namenlose Landschaft ist
   gültig.
4. **Dragoncore ändert die Welt nie ungefragt.** Beobachtungen mutieren nichts.
   KI-Ausgaben (falls je welche kommen) beginnen nie als Kanon.
5. **Keine zweite Wahrheit.** Ein Name steht an genau einer Stelle. Zeigt eine
   Karte auf einen Eintrag, kommt der Name von dort – nicht zusätzlich aus der
   Karte.
6. **Vor der Information kommt das Gefühl.** Eine Geste zeigt Richtung und
   Charakter, bevor sie Inhalt zeigt.

---

## 2. Datenmodell und Speicher

### Dexie, Fassung 5 (`src/db/db.ts`)

| Tabelle | Inhalt |
|---|---|
| `books` | Die Bibliothek. Ein Band ist ein paar hundert Byte |
| `entries` | Alle Inhalte, an `bookId` gebunden |
| `relations` | Die bedeutungstragenden Kanten |
| `images` / `imageBlobs` | Angaben getrennt von Datei |
| `klaenge` / `klangBlobs` | Dasselbe Muster für Geräusche |
| `boards` | Concept-Art-Flächen (lose Blätter) |
| `karten` | Weltkarten: Geometrie und Bedeutung, **nie ein Bild** |
| `revisions` | Zeitleiste, jede Fassung zurückholbar |
| `settings` | Eine Zeile, Gerätezustand |

**Nur das aufgeschlagene Buch wird geladen** (`ladeBuchinhalt` in
`useStudio.ts`). Zwanzig andere Bücher dürfen tausende Einträge haben; sie
kosten nichts.

### Die sieben Stellen, die bei einer neuen Tabelle angefasst werden müssen

Das ist die Liste, die man vergisst und die dann Daten kostet:

1. `db.ts` – Tabelle anlegen, `wipeDatabase` erweitern
2. `useStudio.ts` – `ladeBuchinhalt`, Anfangszustand, alle
   `{ entries: [], … }`-Rückfälle
3. `useStudio.ts` – `dupliziereBuch` (lesen **und** schreiben)
4. `useStudio.ts` – `loescheBuch`
5. `lib/kopie.ts` – `Bestand`, `Umschrift`, `umschriftFuer`, `schreibeAb`
6. `lib/portability.ts` – `buildFullBackup`, `buildBookBackup`, Import
7. `lib/schemas.ts` – `backupSchema` (mit `.passthrough()`!)

### Heilung statt Vertrauen

`lib/heilung.ts` (Einträge, Beziehungen) und `lib/karte/modell.ts`
(`heileKarte`) lesen **Feld für Feld mit Rückfällen**. Was in IndexedDB liegt,
muss nicht sein, was die Typen versprechen – eine alte Sicherung, ein halber
Import, ein abgeschnittener Schreibvorgang.

> **Falle:** `heilung.ts` heilt feldweise. **Alles, was dort nicht aufgezählt
> ist, geht beim nächsten Speichern still verloren.** Wer ein Feld zum Typ
> hinzufügt, muss es dort eintragen. Kein Fehler, keine Meldung – es ist
> einfach fort.

> **Falle:** Zod verwirft, was nicht im Schema steht. Jedes Schema, das
> *gespeicherte* Daten prüft, braucht `.passthrough()`. Das ist in diesem
> Projekt dreimal schiefgegangen (Buchidentität, Bilder, Einstellungen).

---

## 3. Die Systeme, Schicht für Schicht

### 3.1 Bibliothek und Buch

`lib/bibliothek.ts`. Ein `LibraryBook` trägt Titel, Einband, Zeichen,
Weltnamen, Lesebändchen, Ziele, eigene Typen, Profil. `istEinBuch()` prüft nur
eines: Hat es einen Titel? Daran – und nur daran – hängt der Routenbaum in
`App.tsx` (Erschaffung → Bibliothek → Buch).

### 3.2 Das Profil (`lib/profil.ts`)

Die adaptive Individualisierung. **Kein `userType`.** Gespeichert wird ein
Profil aus Absicht (erzählen/welt/spiel/entwerfen/zeigen/frei), Tiefe
(sanft/standard/tief/system), Anmutung, Schwerpunkten. Daraus leitet `ordne()`
ab, welche Werkzeuge sichtbar sind – `OFFEN_JE_TIEFE = {sanft:4, standard:7,
tief:11, system:99}`.

Die erste Frage („Was möchtest du erschaffen?") steht **vor** der Buchgestaltung
(`pages/onboarding/Absichtsfrage.tsx`).

Die Anmutung ist eine **Präsentationsschicht**: ein `data-anmutung`-Attribut am
Buchkörper, darunter regelt `index.css` Schriftgrad, Zeilenluft, Bildgröße. Ein
Attribut, keine drei Sätze Komponenten.

### 3.3 Das Anerbieten (`lib/anerbieten/`)

Der strenge Ablauf: **Beobachtung → Relevanz → Anerbieten → Entscheidung des
Nutzers.** Beobachtungen mutieren nie.

- `beobachtung.ts` – `Wissensstand = kanon | beobachtung | vorschlag | vermutung`,
  `Beleg` (Evidence First: keine Deutung ohne anklickbaren Beleg),
  `Natur` (Fehler *in* der Welt vs. Eigenschaft *der* Welt), `stufeVon`
- `relevanz.ts` – wann etwas überhaupt gesagt werden darf
- `gedaechtnis.ts` – geöffnet/später/weg/nie-für-dieses-Thema, mit Fristen
- `beobachter.ts` – die einzelnen Beobachter
- `charakterspiegel.ts` – die erste Anwendung, unter `/spiegel/:id`

Vier Aufmerksamkeitsstufen: `still` (Vorgabe), `leise`, `anerbieten`, `warnung`.
`warnung` gibt es **nur** für `natur === 'technisch'` – bei keiner Zahl der Welt,
auch nicht bei Zuversicht 1. Das ist die Trennlinie zwischen „ein Fehler *in* der
Welt" und „eine Eigenschaft *der* Welt".
*Die Stufe „leise" ist im Kern definiert, aber noch nicht gezeichnet.*

> **Es gibt bewusst keine Canonize-Funktion.** Nicht vergessen – untersagt.

### 3.4 Die Karte (`lib/karte/`)

Die Formel: **Geometrie + Bedeutung + Startwert + Kartenstil = Darstellung.**
Gespeichert wird nie eine Farbe und nie ein Baum.

- `zufall.ts` – **Ortszufall, keine Zufallsfolge.** Die wichtigste Datei. Eine
  Folge würde bei jeder Randkorrektur den ganzen Wald neu würfeln; eine Funktion
  vom Ort antwortet für alte Orte weiterhin dasselbe. Kleine Geometrieänderung →
  kleine sichtbare Änderung, als Folge der Bauart und nicht als Absicht.
- `modell.ts` – `Kartenfeature` (drei Bedeutungen: land/wasser/wald), `heileKarte`
- `kontur.ts` – Strich → Maske → Lücken schließen → Kontur → vereinfachen →
  glätten → verfeinern. Das Verfeinern ist **hart gedeckelt** (`Math.min(groesse
  * staerke, 14)`): Die Küste darf unruhig werden, aber keine Buchten bekommen,
  die niemand gemalt hat.
- `wald.ts` – Gitter am **Kartenraum** ausgerichtet (nicht am Kasten der Fläche!),
  ausdrücklich *kein* Poisson-Disk nach Bridson
- `stil.ts` – ein Stil („Clean Artbook"), die einzige Stelle mit Farbwerten

Seite: `/weltkarte`. Die alte Sternkarte (Weltgraph) liegt weiter unter `/karte`.

### 3.5 Die Bedienungs-DNA (`lib/raum/`, `components/raum/`)

Das Jüngste und das, was künftig alles trägt.

```
DRAGONCORE SPACE
  └─ BOOK SHELL          (Cover, Spread, Leaf – unverändert wiederverwendet)
       └─ CURRENT WORK   (die Mitte)
```

- `konfig.ts` – **jede** Schwelle, Dauer, Federhärte, Deckkraft. Kein Wert
  gehört in eine Komponente. Kein React-State (wird 60×/s gelesen); ein
  Modulwert, `konfig()` zum Lesen, `beiKonfig()` als Ohr.
- `geste.ts` – reine Funktionen: `randRichtung`, `fortschritt`, `passtRichtung`,
  `phaseVon`, `entscheide`, `naechsterStand`, `istDoppeltipp`. Ohne Browser
  prüfbar – das ist der Grund für den Zuschnitt.
- `useRaum.ts` – ein **eigener kleiner Speicher** neben `useStudio`.
  `useStudio` hält die Welt, `useRaum` hält den Blick. Beides zusammenzulegen
  hieße, dass ein Wisch dieselbe Sorte Ereignis wäre wie das Schreiben eines
  Satzes.
- `Raumschicht.tsx` – Zeigerereignisse hinein, drei CSS-Variablen hinaus
- `Richtungsbogen.tsx` – eine **leuchtende Sichel** (gefüllter Körper mit heller
  Vorderkante, keine Linie – eine weichgezeichnete Fläche wird Licht, eine
  weichgezeichnete Linie wird Schmier) plus ein **Richtungszeichen**, das ab der
  Andeutungsschwelle am Scheitel erscheint. Alle vier Bögen sind gleich; der
  Charakter steckt im Zeichen, das ungestreckt und unverwischt in einer eigenen
  Ebene sitzt.
- `Tiefenraum.tsx` – rechts Tiefe 1–3, links/oben/unten je Tiefe 1
- `InteractionLab.tsx` – 28 Live-Regler unter `?interactionLab=1`

**Anker ≠ sichtbare Mitte.** Bei Tiefe 0 folgt der Anker der aufgeschlagenen
Seite; ab Tiefe 1 friert er ein. Wer sich umsieht, verliert seinen Arbeitsplatz
nicht. Verschoben wird er nur durch „In die Mitte holen".

**Wem gehört der Finger?** In dieser Reihenfolge:
`data-raum="aus"`/Canvas/Eingabe → Randstreifen → Scrollbarkeit → Winkel.
Erst wenn alle vier für die Raumgeste ausgehen, wird sie beansprucht.

Gemessen wird am **Fenster**, nicht am Buchkasten (der beginnt unter der
Kopfzeile – ein Zug vom echten oberen Rand käme sonst nie an).

### 3.6 Die übrigen gewachsenen Systeme

`lib/druck/weltbuch.ts` (CSS Paged Media), `lib/chronik/` (Weltzeit, Epochen,
Zeitgenossen), `lib/roman/` (Struktur, Randnotizen, Ausgabe inkl. DOCX),
`lib/relations.ts` (Kanten mit Bedeutung, `RelationIndex`), `lib/geheim.ts`
(Spielleiterwissen/Tischmodus), `lib/leitfaden.ts`, `lib/suche.ts`,
`lib/portability.ts` (Sicherung/Import), `lib/kopie.ts` (Buchabschrift).

---

## 4. Die Fallen

Jede einzelne davon hat in diesem Projekt schon Zeit oder Daten gekostet.

### Tailwind

**Deckkraftmodifikatoren gibt es nur in Fünferschritten.** `bg-black/92` und
`border-line/12` erzeugen *keine* Regel – die Klasse ist einfach wirkungslos.
`npm run klassen` prüft das, aber **nur gegen das gebaute CSS**: erst
`npm run build`, dann `npm run klassen`.

### Chromium und Papier

`@page` funktioniert, aber **`:blank`, `string-set` und `target-counter` nicht.**
`string-set` scheitert *lautlos* – der lebende Kolumnentitel war stundenlang
leer, ohne Fehlermeldung. Ein ungültiger Selektor wie `@page :blank, @page x`
lässt Chromium die **ganze** Regel fallen.

### Template-Literale

Ein Backtick in einem CSS-Kommentar innerhalb eines JS-Template-Literals
beendet die Zeichenkette. In `druck/weltbuch.ts` stehen deshalb »…« statt
Backticks.

### `images.id` ist der Primärschlüssel

Ein `put` mit derselben Kennung ist **kein Anlegen, sondern ein Überschreiben.**
Genau daran hat die Buchabschrift dem Original seine Tafeln weggenommen. Die
Lösung ist das Feld `blobId`: Der Datensatz sagt, *dass ein Buch dieses Bild
zeigt*, die Datei liegt unter `blobId`. Fehlt das Feld, ist es die eigene
Kennung – deshalb brauchte kein Bestandsdatensatz angefasst zu werden.

### `innerText` liefert das, was das CSS zeigt

Eine `.rubric` mit `text-transform: uppercase` kommt in Großbuchstaben zurück.
Zusicherungen in Browsertests müssen unabhängig von der Schreibweise prüfen.

### `Spread` rendert zweimal

Einmal versteckt für den Schreibtisch, einmal sichtbar für die Hand. Playwright
braucht `:visible`, sonst trifft es den unsichtbaren Zwilling.

### Maus erzeugt keine Touch-Ereignisse

`page.mouse` löst Zeigerereignisse aus, aber kein `touchstart`. Der vorhandene
Seitenwechsel hängt an Touch – ein Mauslauf kann ihn nicht prüfen. Für echte
Fingereingaben `Input.dispatchTouchEvent` über CDP verwenden; das erzeugt beides,
wie ein Gerät.

### Blinde Koordinaten in Testläufen

Zweimal hat ein `click(x, y)` etwas anderes getroffen als gemeint – einmal eine
Karte der Absichtsfrage (und damit die Frage beantwortet, bevor der Lauf sie
lesen konnte), einmal eine Kachel im Tiefenraum. **Immer am Text oder an einer
Rolle suchen, nie an Koordinaten**, außer man will eine Geste prüfen.

### Kapitelkennungen werden nicht geraten

`chapterOfType()` fällt bei einem unbekannten Typ **still auf das letzte
Kapitel zurück**. Wer einen Raum nach `chapterOfType(e).id === 'wesen'` filtert,
bekommt deshalb keinen Fehler, sondern eine leere Liste – und die Oberfläche
behauptet dann, in diesem Buch lebe noch niemand. Ein Kapitel dieses Namens
gibt es nicht; es heißt `bewohner`. Die echten Kennungen stehen in
`lib/book.ts`; die Zuordnung der vier Richtungen steht als aufgezählte Liste in
`components/raum/Tiefenraum.tsx` und wird in `tests/raum.test.mjs` geprüft.

### Der Testlauf, der log

Ein selbstgeschriebener Browserlauf hat einmal drei Haken gemeldet, ohne
überhaupt eine Kopie erzeugt zu haben. Ein Lauf, der nichts findet, muss laut
scheitern – nicht still weiterzählen.

---

## 5. Bauen und prüfen

```bash
cd studio
npm install
npm run dev          # Entwicklungsserver
npx tsc --noEmit     # Typprüfung
npm test             # 21 Prüfungen, jede in eigenem Prozess
npm run build        # tsc + vite build
npm run klassen      # NACH dem Bauen: Deckkraftklassen gegen das echte CSS
```

`scripts/test.mjs` startet jede Suite einzeln, räumt `.testbau` auf und zeigt
bei Erfolg nur die letzte Zeile, bei Fehlschlag die volle Ausgabe. Jede Suite
baut die zu prüfende Quelldatei mit esbuild zu einem Bündel
(`tests/arbeit.mjs` kennt den Ort).

**21 Suiten**, darunter `raum` (46 Zusicherungen zur Bedienung), `karte` (32),
`kopie` (32), `anerbieten` (58), `profil` (62), `druck` (48).

### Wie in diesem Projekt geprüft wird

Nicht „schreibe Tests", sondern:

1. bauen
2. Einheitentests
3. **wirklich im Browser rendern und bedienen**
4. finden, was die Tests nicht sehen konnten
5. beheben
6. **die Zusicherung nachziehen, die es gefunden hätte**

Schritt 3 hat in jeder einzelnen Runde etwas gefunden, das grün getestet war.
Beispiele: eine Clamp, die einen Auftrieb wirkungslos machte; drei Lecks im
Tischmodus; eine Regel-Kennung, die nie warnen konnte; ein abgeschnittener
Buchtitel; Haarrisse in einer gemalten Landmasse; eine Beschriftung unter den
Bäumen.

### Der Browserlauf

Playwright liegt unter `/opt/node22/lib/node_modules/playwright/index.js`
(CommonJS – `import pw from …; const { chromium } = pw;`), Chromium unter
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.

**Die Erschaffung nicht durchklicken.** Sie hat vier Läufe an Stellen scheitern
lassen, die mit dem Prüfgegenstand nichts zu tun hatten. Stattdessen direkt in
IndexedDB säen (`books`, `entries`, `settings` mit `activeBookId` und
`seedVersion: 99`) und **danach wirklich neu laden** – eine bloße
Adressänderung auf denselben Seitenanfang lädt nichts neu, und die Anwendung
behält ihre Entscheidung „hier gibt es noch kein Buch".

---

## 6. Was offen ist

**Geparkt:** Der Zeichen-Baukasten liegt auf `claude/zeichen-baukasten-wip`
(Teile-Ablage, Bauplan-Modell, Renderer, Werkstatt gebaut; die Verdrahtung in
`Zeichenwahl` fehlt).

**Im Kern vorhanden, aber nicht gezeichnet:** die Aufmerksamkeitsstufe „leise".

**Vorgesehen und inert:** `worldId` (geteilte Welten), `seriesId` (Reihen),
`beginn`/`ende` an Kartenflächen (die Karte kennt keine Zeit).

**Aus dem Bedienungsauftrag bewusst nicht gebaut:** Werkstattzustand, ein
eigener Öffnungsübergang aus dem geschlossenen Buch, iPad-/Desktop-Sonderlayouts,
echte Federsimulation (die drei Federregler sind vorgesehen, die Bewegung läuft
bisher über CSS-Kurven), links/oben/unten über Tiefe 1 hinaus.

**Ausdrücklich dokumentiert, aber nicht zu tun:** `useStudio.ts` ist groß und
sollte irgendwann in Bibliotheks-, Eintrags- und Blockaktionen zerfallen. Der
Verfasser hat einen großen Store-Umbau untersagt. **Nicht anfangen.**

---

## 7. Wie hier gearbeitet wird

- **Kein Refactor aus Ordnungsliebe.** Vorhandenes wird übernommen, nicht neu
  erfunden. Wenn es passt, passt es.
- **Code ohne Aufrufer wird gelöscht**, nicht auskommentiert. (So sind
  `renderWeltbuchHtml`, `wege.ts` und `DeinWeg.tsx` verschwunden.)
- **Der Grund steht im Kopfkommentar**, nicht im Commit. Besonders der Grund,
  etwas *nicht* zu tun – warum kein Poisson-Disk, warum kein React-State in der
  Geste, warum keine Canonize-Funktion.
- **Ein wiederkehrendes Muster, viermal angewandt:** *eine Wahrheit, viele
  Erscheinungen.* Buchzeichen (Form ≠ Material), Anmutung (Inhalt ≠ Satz),
  Karte (Geometrie ≠ Stil), Bedienung (Zustand ≠ Darstellung).
- **Fehler werden im Kommentar festgehalten**, wenn sie etwas lehren. An
  mehreren Stellen steht wörtlich, was zuerst dort stand und warum es falsch
  war. Das ist Absicht: Der nächste soll denselben Fehler nicht für eine gute
  Idee halten.
