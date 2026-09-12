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

Seit dem Dreibücher-Umbau steht darüber ein Satz, der fast jede Entwurfsfrage
entscheidet: **Die Welt ist gemeinsam. Das Buch bestimmt, wie man sie erlebt.**
Daraus folgen drei Ebenen, und wer sie verwechselt, baut an der falschen
Stelle:

| Ebene | Was dort lebt | Wo es steht |
|---|---|---|
| **Welt** | Figuren, Orte, Dinge, Beziehungen, Bilder, Karten, Klänge | an einer `worldId` |
| **Buch** | Titel, Einband, Buchart, Seitenreihenfolge, Profil | an einer `bookId` |
| **Darstellung** | Arbeitsraum, Registerfolge, was zuerst offen liegt | abgeleitet, nie gespeichert |

Mehrere Bücher dürfen dieselbe Welt tragen. Ein Roman und ein Artbook über
dasselbe Nebelreich zeigen denselben Nebelwald – und zeigen ihn verschieden.

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

### Dexie, Fassung 8 (`src/db/db.ts`)

**Dexie-Fassung N entspricht IndexedDB-Fassung N×10.** Fassung 7 ist dort 70,
Fassung 8 ist 80. Wer das übersieht, sucht den Fehler in der Aufwertung, wo
keiner ist.

| Tabelle | Inhalt | gehört |
|---|---|---|
| `books` | Die Bibliothek. Ein Band ist ein paar hundert Byte | – |
| `welten` | Name und Alter einer Welt. Mehr nicht – der Inhalt liegt woanders | – |
| `entries` | Alle Inhalte | Welt |
| `relations` | Die bedeutungstragenden Kanten | Welt |
| `images` / `imageBlobs` | Angaben getrennt von Datei | Welt |
| `klaenge` / `klangBlobs` | Dasselbe Muster für Geräusche | Welt |
| `boards` | Concept-Art-Flächen (lose Blätter) | Welt |
| `karten` | Weltkarten: Geometrie und Bedeutung, **nie ein Bild** | Welt |
| `teile` | Die Schichten des Bildnis-Baukastens | Welt |
| `revisions` | Zeitleiste, jede Fassung zurückholbar | Welt |
| `settings` | Eine Zeile, Gerätezustand | – |

`WELTTABELLEN` in `db.ts` zählt die acht weltgebundenen Tabellen auf. Sie ist
die Liste, gegen die man prüft, ob eine neue Tabelle vollständig angeschlossen
ist.

**`bookId` ist geblieben – als Herkunft, nicht als Zuständigkeit.** Geladen
wird nach `worldId`; `bookId` sagt weiterhin, in welchem Band ein Datensatz
entstanden ist. Diese Auskunft lässt sich nicht wiederherstellen, wenn man sie
einmal weglässt, also wird sie weiter mitgeschrieben (`heimat()` in
`useStudio.ts` liefert beides zusammen und wird an allen acht Schreibstellen
benutzt).

**Nur die aufgeschlagene Welt wird geladen** (`ladeWeltinhalt` in
`useStudio.ts`; hier stand bis Fassung 8 `ladeBuchinhalt`). Zwanzig andere
Bücher dürfen tausende Einträge haben; sie kosten nichts.

### Die neun Stellen, die bei einer neuen Tabelle angefasst werden müssen

Das ist die Liste, die man vergisst und die dann Daten kostet. Seit Fassung 8
sind es zwei mehr – beide gehören zur Welt:

1. `db.ts` – Tabelle anlegen, `WELTTABELLEN` ergänzen, `wipeDatabase` erweitern
2. `db.ts` – die Aufwertung: `worldId` an vorhandene Datensätze stempeln
3. `useStudio.ts` – `ladeWeltinhalt`, Anfangszustand, alle
   `{ entries: [], … }`-Rückfälle
4. `useStudio.ts` – `stempele` (das Netz unter der Aufwertung; die Tabellen
   stehen dort einzeln und nicht in einer Schleife, weil Dexies Tabellentypen
   sich nicht vereinigen lassen und eine Schleife ein `as never` bräuchte –
   gelogen an genau der Stelle, an der fremde Daten umgeschrieben werden)
5. `useStudio.ts` – `dupliziereBuch` (lesen **und** schreiben, jetzt in eine
   *frische* Welt)
6. `useStudio.ts` – `loescheBuch` (und `nimmtWeltMit` in `lib/welten.ts`: Ein
   Band, dessen Welt noch ein anderer trägt, darf sie nicht mitnehmen)
7. `lib/kopie.ts` – `Bestand`, `Umschrift`, `umschriftFuer`, `schreibeAb`
8. `lib/portability.ts` – `buildFullBackup`, `buildBookBackup`, Import
9. `lib/schemas.ts` – `backupSchema` (mit `.passthrough()`!)

> **Falle aus Fassung 8:** „Herrenlos" heisst nicht mehr „ohne Buch", sondern
> **ohne Welt.** Ein Datensatz mit `bookId` aber ohne `worldId` ist genauso
> unsichtbar wie einer ganz ohne – nur schwerer zu erkennen, weil er zugeordnet
> *aussieht*. `findeHerrenloses` zählt deshalb über die Welten und nicht über
> die Bücher: Die Zählung muss dieselbe Frage stellen wie das Laden.

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
Weltnamen, Lesebändchen, Ziele, eigene Typen, Profil, Buchart und
Seitenreihenfolge. `istEinBuch()` prüft nur eines: Hat es einen Titel? Daran –
und nur daran – hängt der Routenbaum in `App.tsx` (Erschaffung → Bibliothek →
Arbeitsraum).

Die Bibliothek ist seit dem Umbau ein **Regal** (`components/bibliothek/Regal.tsx`):
Buchrücken nebeneinander auf einem gemalten Brett, Höhe und Neigung je Band aus
einem FNV-1a-Streuwert der Kennung – stabil, also springt nichts beim
Neuzeichnen. Das zuletzt geöffnete Buch trägt ein goldenes Lesebändchen.

> **Falle, die Tage gekostet hat:** `sichtbareEinstellungen` legt das Buch über
> die Geräteeinstellungen. Ein **buchgebundener Wert, den das Buch nicht hat,
> ist nicht da** – vorher blieb stehen, was in der Grundlage stand, und die
> Grundlage ist beim Buchwechsel die *bereits gemischte* Einstellung des
> vorigen Bandes. Gemessen schlug ein Roman bei `/inhalt` auf, weil davor ein
> Artbook auf seinem Inhaltsverzeichnis gelegen hatte. `BUCH_SCHLUESSEL` zählt
> die betroffenen Schlüssel auf; wer einen neuen buchgebundenen Wert einführt,
> trägt ihn dort ein.

### 3.2 Die drei Ebenen (`lib/buchart.ts`, `lib/arbeitsraum.ts`, `lib/welten.ts`)

Das Gerüst des Dreibücher-Umbaus. Drei kleine, reine Module – und eine Regel,
die überall gilt:

**`buchartVon` liefert bewusst kein Ersatzergebnis.** `undefined` heisst „ein
Buch von gestern", nicht „vermutlich ein Roman". Auf diesen Geräten liegt
Arbeit; ein Band, der gestern ein Buch mit allen Werkzeugen war, darf sich
nicht über Nacht in einen Schreibraum verwandeln, weil ein Programm eine
Vermutung hatte. Dieselbe Zusage zieht sich durch `arbeitsraum.ts`,
`registerfolge.ts` und `seitenfolge.ts`: Ohne Buchart bleibt alles wie zuvor.

- `buchart.ts` – `novel | artbook | rpg`, dazu `AUS_ABSICHT`/`absichtFuer` als
  Brücke zum Profil
- `arbeitsraum.ts` – eine **Tabelle**, keine Kette von `if`: je Buchart ein
  Eingang, ein Leersatz, bis zu vier Anfänge. Der Auftrag schliesst eine
  gemeinsame Oberfläche mit Ausnahmen ausdrücklich aus, und der Unterschied ist
  nicht das Ergebnis, sondern die Richtung: Eine Oberfläche mit Ausnahmen
  wächst zu einer Oberfläche mit vielen Ausnahmen.
- `welten.ts` – `neueWelt`, `heileWelt`, `selbeWelt`, `nameFuer` (drei Stufen
  mit `benannt`-Merker), `weltzeileFuer` (zeigt die Welt nur, wenn **zwei**
  Bücher sie teilen), `nimmtWeltMit`

Die Hüllen liegen unter `components/arbeitsraum/`: `Arbeitsraum.tsx` ist die
Weiche, `Schreibhuelle` (Roman: zwei Orte, kein Blättern), `Werkstatthuelle`
(Rollenspiel: vier Orte), und für Artbook **und alles ohne Art** der gewohnte
`BookShell`.

### 3.3 Was das Buch mit der Welt macht

Drei Stellen, an denen dieselbe Welt verschieden erscheint:

- **`lib/buch/seitenfolge.ts`** – die von Hand gesetzte Seitenreihenfolge des
  Artbooks, je Kapitel, am **Buch** abgelegt (`seitenfolge`). Was neu
  dazukommt, landet hinten und nicht an seinem alphabetischen Platz: Ein neues
  Bild mitten in eine gesetzte Folge zu schieben hiesse, es unsichtbar an einen
  Ort zu stellen, den niemand gewählt hat. `buildBook(entries, imageCount,
  folge?)` wendet sie an und liefert je Kapitel zusätzlich `abgeleitet` – nur
  damit sich beantworten lässt, ob es überhaupt etwas zurückzunehmen gibt.
- **`lib/figur/registerfolge.ts`** – die Reihenfolge der sieben
  Registerblätter je Buchart. **Reihenfolge, nicht Auswahl:** Jeder Buchtyp
  zeigt alle sieben. Eine Romanfigur, die am Spieltisch auftaucht, hat Werte,
  und wer sie im Roman nicht mehr erreicht, kann sie dort auch nicht mehr
  eintragen. Die Übersicht steht überall vorn; unterschieden wird ab dem
  zweiten Reiter.
- **`lib/roman/verzeichnis.ts` und `namen.ts`** – siehe 3.8.

### 3.4 Das Profil (`lib/profil.ts`)

Die adaptive Individualisierung. **Kein `userType`.** Gespeichert wird ein
Profil aus Absicht (erzählen/welt/spiel/entwerfen/zeigen/frei), Tiefe
(sanft/standard/tief/system), Anmutung, Schwerpunkten. Daraus leitet `ordne()`
ab, welche Werkzeuge sichtbar sind – `OFFEN_JE_TIEFE = {sanft:4, standard:7,
tief:11, system:99}`.

**Die Absichtsfrage steht seit dem Dreibücher-Umbau nicht mehr im Weg.** Sie
fragte „Was möchtest du erschaffen?", und die Buchartwahl fragt seither
dasselbe in anderen Worten – zweimal dieselbe Frage in zwei Schritten ist keine
Sorgfalt, sondern ein Formular. `PFLICHTWEG` ist deshalb nur noch
`['buch', 'anfang']`. Die Absicht wird jetzt aus der Buchart abgeleitet
(`absichtFuer` in `lib/buchart.ts`); `pages/onboarding/Absichtsfrage.tsx`
**bleibt liegen und wird nicht gelöscht** – ihr Kopfkommentar sagt warum.

Die Anmutung ist eine **Präsentationsschicht**: ein `data-anmutung`-Attribut am
Buchkörper, darunter regelt `index.css` Schriftgrad, Zeilenluft, Bildgröße. Ein
Attribut, keine drei Sätze Komponenten.

### 3.5 Das Anerbieten (`lib/anerbieten/`)

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

### 3.6 Die Karte (`lib/karte/`)

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

### 3.7 Die Bedienungs-DNA (`lib/raum/`, `components/raum/`)

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

### 3.8 Der Roman liest sein eigenes Manuskript (`lib/roman/`)

`struktur.ts`, `randnotizen.ts`, `ausgabe.ts` (inkl. DOCX) und `zip.ts` gab es
schon. Neu und für den Roman entscheidend sind zwei:

**`namen.ts` – `findeNamen(text, bekannt)`.** Findet Namen im Manuskript, die
die Welt noch nicht kennt. Die Prüfung, um die es dabei wirklich geht, ist
nicht „findet es Denis?", sondern: **schlägt es „Wald", „Tag" und „Hand"
vor?** Im Deutschen ist jedes Substantiv gross, Grossschreibung allein sagt
also nichts. Es entscheiden Artikel (`BEGLEITER`), eine geschlossene Liste
satzeröffnender Funktionswörter, ein Wörterbuch gewöhnlicher Substantive,
Ortsendungen, Beugungszusammenführung (nur wenn die Grundform ebenfalls
vorkommt) und ein Rückblick von vier Wörtern vor „nach". Mehrteilige Namen
werden als Paar gezählt, und die Einzelteile werden um die Vorkommen des Paares
entlastet – sonst stünde neben „Grauer Turm" auch noch „Turm".

**`verzeichnis.ts` – `baueVerzeichnis` und `romanspur`.** Das Weltverzeichnis
des Romans (`/verzeichnis`) und der Block „Aus dem Roman" auf der
Charakterseite. `romanspur` liest, in welchen Szenen eine Figur vorkommt,
welche Kapitel das sind und wer in denselben Szenen steht. **Es speichert
nichts** – wer eine Szene umschreibt, ändert damit diese Zeilen, ohne sie
anzufassen.

> Die Überschrift dort heisst „Steht bei" und **nicht** „Beziehungen". Zwei
> Figuren in derselben Szene können Geschwister sein, Feinde oder einander nie
> begegnet. Was dort steht, ist eine Beobachtung; „Beziehung" wäre eine
> Behauptung – und damit ein Bruch von Gesetz 4.

Der Block erscheint **nur im Roman**. Ein Artbook hat kein Manuskript, ein
Rollenspielband Abenteuer statt Szenen; dort wäre er leer, und ein leerer
Block, der erklärt, warum er leer ist, ist genau die Software-Anmutung, gegen
die dieser Umbau antritt.

> **Falle:** `romanspur` filtert absichtlich **nicht** nach Gelöschtem,
> Romanteilen oder zu kurzen Titeln. Das entscheidet `erkenne` in
> `randnotizen.ts`, und zwar für das ganze Buch an einer Stelle. Dieselbe Regel
> zweimal zu schreiben heisst, sie eines Tages nur einmal zu ändern.

### 3.9 Die übrigen gewachsenen Systeme

`lib/druck/weltbuch.ts` (CSS Paged Media), `lib/chronik/` (Weltzeit, Epochen,
Zeitgenossen), `lib/relations.ts` (Kanten mit Bedeutung, `RelationIndex`),
`lib/geheim.ts` (Spielleiterwissen/Tischmodus), `lib/leitfaden.ts`,
`lib/suche.ts`, `lib/portability.ts` (Sicherung/Import), `lib/kopie.ts`
(Buchabschrift), `lib/baukasten.ts` mit `lib/bildnis.ts` (Bildnis aus
Schichten).

> **Falle beim Baukasten:** `fassungFuer(schacht)` entscheidet, ob ein Bild in
> voller Auflösung oder als Vorschau geholt wird, und `Bildniswerk` nimmt dafür
> einen `fassung`-Parameter. Wer eine neue Kachelwand baut und ihn vergisst,
> holt Originale für neunzig Punkte breite Kacheln – gemessen 17 MB statt
> 512 kB bei acht Kacheln. `tests/bildfassung.test.mjs` liest dafür den
> Quelltext; unschön, aber die einzige Prüfung, die es findet.

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
npm test             # 48 Suiten, jede in eigenem Prozess
npm run build        # tsc + vite build
npm run klassen      # NACH dem Bauen: Deckkraftklassen gegen das echte CSS
```

**Alle vier, und `npm run klassen` zuletzt.** Genau das wurde im
Dreibücher-Umbau umgangen – siehe Abschnitt 6.

`scripts/test.mjs` startet jede Suite einzeln, räumt `.testbau` auf und zeigt
bei Erfolg nur die letzte Zeile, bei Fehlschlag die volle Ausgabe. Jede Suite
baut die zu prüfende Quelldatei mit esbuild zu einem Bündel
(`tests/arbeit.mjs` kennt den Ort).

**48 Suiten**, darunter `tiefenkarte` (158 Zusicherungen), `werkstatt` (130),
`profil` (62), `anerbieten` (58), `druck` (48), `zeit` (38), `speicher` (30).

Aus dem Dreibücher-Umbau kamen dazu: `buchart`, `arbeitsraum`, `welten`,
`regal`, `namen` (27), `romanspur` (14), `seitenfolge` (25), `bildfassung`,
`registerfolge` (15).

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

**Vorgesehen und inert:** `seriesId` (Reihen), `beginn`/`ende` an
Kartenflächen (die Karte kennt keine Zeit). *`worldId` stand bis zum
Dreibücher-Umbau hier – seit Fassung 8 trägt sie das ganze Weltwissen.*

**Aus dem Bedienungsauftrag bewusst nicht gebaut:** Werkstattzustand, ein
eigener Öffnungsübergang aus dem geschlossenen Buch, iPad-/Desktop-Sonderlayouts,
echte Federsimulation (die drei Federregler sind vorgesehen, die Bewegung läuft
bisher über CSS-Kurven), links/oben/unten über Tiefe 1 hinaus.

**Ausdrücklich dokumentiert, aber nicht zu tun:** `useStudio.ts` ist groß und
sollte irgendwann in Bibliotheks-, Eintrags- und Blockaktionen zerfallen. Der
Verfasser hat einen großen Store-Umbau untersagt. **Nicht anfangen.**

### Aus dem Dreibücher-Umbau

**Die Prüfbefehle des Projekts werden umgangen.** In Abschnitt 5 steht die
richtige Reihenfolge – `npm test`, dann `npm run build`, dann
`npm run klassen`. Im Dreibücher-Umbau wurde stattdessen eine eigene Schleife
über `tests/*.test.mjs` benutzt: Die deckt die Suiten ab, aber **nicht**
`npm run klassen`. Folge: `bg-gild-400/12` und `border-paper-400/12` standen
zwei Wochen lang wirkungslos im Quelltext, die Pille hinter dem offenen Ort in
der Raumzeile wurde nie gezeichnet – und weil der Text golden blieb, sah es
auf jedem Bildschirmfoto nach Absicht aus. Gefunden hat es erst die
Github-Prüfung, obwohl genau diese Falle in Abschnitt 4 wörtlich beschrieben
steht.

Die Lücke ist also keine Wissenslücke, sondern eine Gewohnheit. Eine mögliche
Antwort wäre ein einziger Befehl, der alles vier hintereinander ausführt, statt
vier Befehle, von denen man den letzten vergessen kann – **noch nicht
entschieden, bewusst offen.**

**Vom Umbau selbst blieb liegen:** Die freie Seitenreihenfolge gibt es nur
innerhalb eines Kapitels, nicht über das ganze Artbook – die Kapitel tragen
Inhaltsverzeichnis, Register und Lesezeichen, und eine Folge über alle hinweg
wäre keine Ordnung mehr, sondern ihre Abschaffung. Ob das reicht, weiss erst,
wer ein echtes Artbook damit setzt.

**Geparkt, aber jetzt älter als der Umbau:** `claude/baukasten-koerpersitz`
(Kopfsitz, Stapel-Import, ZIP-Sicherung). Die drei Commits sind nie gegen die
Welten- und Buchart-Änderungen geprüft worden.

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
