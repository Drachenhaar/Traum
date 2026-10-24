# Kartenwerk — Plan für einen hybriden Kartenrenderer

> Dieses Papier beantwortet eine Frage: **Kann Dragoncore die gestalterische
> Qualität der Referenz erreichen, ohne aufzuhören, Dragoncore zu sein?**
>
> Die Antwort ist ja, aber nicht mit dem heutigen Renderer. Was fehlt, ist
> keine Grafiktechnik — es ist eine Stufe zwischen Bedeutung und Bild.
>
> Nichts in diesem Papier ist gebaut. Unter `entwurf/kartenwerk/` liegt ein
> lauffähiger vertikaler Prototyp, der die Pipeline beweist; `src/` ist
> unberührt.

---

## 1 · Was heute dasteht, und wo es anstößt

### Die drei Lagen von `components/karte/Weltkarte.tsx`

```
Lage 1   SVG     Flächen, Füllungen, Fangbereiche, Küstenfeder
Lage 2   Canvas  Bäume
Lage 3   SVG     Namen, Auswahl   (pointer-events: none)
```

Das ist bereits ein Hybrid — SVG für Geometrie und Finger, Canvas für Masse.
Die Aufteilung ist richtig und bleibt.

### Was wiederverwendet wird, unverändert

| Baustein | Warum er trägt |
|---|---|
| `lib/karte/modell.ts` | `Kartenfeature`, `Kartenmarke`, `heileKarte`. Die Semantik ist sauber und stilfrei. |
| `lib/karte/zufall.ts` | **Ortszufall statt Zufallsfolge.** Dieselbe Stelle gibt dieselbe Zahl, unabhängig von der Fragereihenfolge. Das ist die Grundlage von „derselbe Seed ergibt dieselbe Landschaft" — und es ist der Teil, den man sonst am spätesten merkt und am teuersten nachrüstet. |
| `lib/karte/wald.ts` | `baeume()` ist schon ein reiner Streuer mit **raumfestem Gitter** und Randsaum. Er muss nur von „Bäumen" auf „Staffage" verallgemeinert werden. |
| `lib/karte/kartografie.ts` | `abstandsfeld()` — das vorzeichenbehaftete Abstandsfeld. Es ist der Schlüssel zu organischen Übergängen, und es ist schon da. |
| `lib/karte/kontur.ts` | Strich → Maske → Kontur → glätten. Der Verfasser malt weiter genauso. |
| `lib/karte/stil.ts` | Die Disziplin „**kein Bauteil kennt einen Farbwert**". Sie wird erweitert, nicht gebrochen. |
| `lib/karte/relief.ts` | Isometrie und Tiefensortierung — brauchbar für die erhobene Ansicht. |

### Die vier Stellen, die die Qualität begrenzen

**(a) Der Leinwand-Durchlauf hängt an der Sicht.**

```ts
}, [karte.features, waelder, sicht, stil]);
```

Beim Schieben entsteht also **jeder Baum sechzigmal in der Sekunde neu**. Das
ist der eigentliche Grund, warum die Bäume heute billig sein *müssen* — nicht
eine Grenze von Canvas. Gemessen am Prototyp: Derselbe Inhalt kostet ohne
Zwischenspeicher **26,3 ms je Bild**, mit **1,05 ms**. Das ist Faktor 25, und
zwar auf einem Rechner *ohne* Grafikkarte.

**(b) Die Staffage wird je Fläche gezeichnet, nicht global sortiert.**

Darum kann ein Baum nicht vor einem Berg stehen, der zu einer anderen Fläche
gehört. Für „perspektivisch wirkende Kartografie" ist eine globale
Tiefensortierung Voraussetzung, keine Zugabe.

**(c) Ein Stil ist eine Farbtabelle.**

`Kartenstil` kennt `papier`, `land.flaeche`, `wald.laub` — Farben und eine
Strichstärke. Keine Textur, keine Baumform, kein Material. Ein Stilwechsel
kann deshalb heute gar nicht mehr sein als ein Farbwechsel.

**(d) Es gibt keinen Weg für Grafiken.**

Jedes Bildchen auf der Karte ist Code. Das ist für drei Siedlungszeichen
richtig und für einen Fels mit Verwitterung falsch.

---

## 2 · Der hybride Renderer: fünf Stufen, eine Richtung

```
  Kartendokument            Semantik — unverändert, jederzeit editierbar
        │                   features[], marken[], seed
        ▼
  [1] GELÄNDE               Abstandsfelder, Nachbarschaften, Hauptachsen
        │                   → einmal je Flächenänderung
        ▼
  [2] STREUWERK             → Staffage[]  { art, variante, x, y, h, ebene, … }
        │                   rein, deterministisch, stilunabhängig
        ▼
  [3] STILBUCH              art+variante → Zeichenanweisung
        │                   { bild: Atlasfeld }  |  { pinsel: Code }
        ▼
  [4] KACHELWERK            Kacheln im Kartenraum, zwischengespeichert
        │                   Mipstufen, gezielte Entwertung
        ▼
  [5] MALER                 blittet die sichtbaren Kacheln
```

Jede Stufe hängt nur von der darüber ab. Das ist die ganze Architektur.

### Stufe 2 ist die Antwort auf „Semantik und Darstellung trennen"

Das Streuwerk liefert **Daten, keine Zeichnung**. Es weiß nicht, ob ein Baum
später ein Bild oder ein Pinselstrich wird. Daraus folgt unmittelbar, was der
Auftrag verlangt:

> *Ein Wald ist keine Sammlung einzeln gemalter Bäume, sondern eine Fläche mit
> Eigenschaften.*

Und daraus folgt auch die Regel, wo die **Dichte** wohnt: im Streuwerk, nicht
im Stilbuch. Ein Wald ist in jedem Stil derselbe Wald — sonst wäre dieselbe
Karte in zwei Stilen zwei Karten.

### Stufe 3 ist das Hybride, und es steht in drei Zeilen

```ts
type Zeichnung =
  | { art: 'bild';   felder: Atlasfeld[] }
  | { art: 'pinsel'; male: (ctx, s: Staffage, p: Palette) => void };
```

Der Maler fragt nie, welches von beiden. Daraus folgt:

* Ein Stil kann **frei mischen**. Im Prototyp zeichnet *Artbook* die Bäume mit
  der Feder und die Berge aus dem Atlas; *Pergament* nimmt für beides Bilder.
  Das ist Gestaltungsabsicht, nicht ein Mangel.
* Ein **neuer Landschaftstyp** ist ein Eintrag im Stilbuch plus eine Regel im
  Streuwerk — keine Änderung am Maler, am Kachelwerk oder am Modell.
* **Fehlende Grafiken blockieren nichts.** Solange kein Bild da ist, malt ein
  Pinsel. Die Engine steht schon richtig.

### Stufe 4 ist die Antwort auf „flüssig auf dem iPhone"

Gezeichnet wird in Kacheln fester Größe im **Kartenraum**. Eine Kachel wird
einmal gefüllt und danach nur noch kopiert. Schieben und Zoomen zeichnen
nichts neu.

Das löst zugleich die Forderung „einzelne Landschaftsflächen müssen unabhängig
neu gerendert werden können": Wer den Wald ändert, entwertet die Kacheln, die
sein Kasten berührt — und nur die. Gemessen: **12 von 25**.

Eine Kachel zeichnet auch Staffage, deren *Fuß* außerhalb liegt, solange ihr
*Bild* hineinragt (`UEBERSTAND`). Ohne das hätte jede Kachelgrenze eine
Schnittkante.

---

## 3 · Was der Prototyp beweist

`entwurf/kartenwerk/` — ein Panel, zwei Stilbücher, dieselben semantischen
Daten. Gemessen in Chromium **ohne Grafikkarte**:

| | Wert |
|---|---|
| Staffage-Stücke | 993 |
| Gelände (Abstandsfelder, 5 Flächen) | 85 ms — **einmalig** |
| Streuwerk | 5 ms — einmalig |
| Atlas backen (9 bzw. 14 Felder × 3 Mipstufen) | 56 / 108 ms — einmalig |
| **Schieben mit Kacheln** | **1,05 ms/Bild** |
| **Schieben ohne Kacheln** | **26,27 ms/Bild** |
| Neu gebackene Kacheln über 60 Schiebebilder | 9 |
| Eine Waldänderung | entwertet 12 Kacheln, kostet 127 ms |

Die absoluten Zahlen sind keine iPhone-Zahlen — hier rechnet die CPU jedes
`drawImage`. Auf einem Gerät mit GPU wird das **Blitten** vielfach billiger,
das **Zeichnen der Staffage** kaum. Faktor 25 ist deshalb die *untere*
Schranke dessen, was die Kacheln bringen.

Und das Entscheidende: Die Kachelzeit hängt **nicht** von der Zahl der
Staffage ab. Zehntausend Bäume kosten beim Schieben genauso viel wie
tausend. Das ist der Grund, warum Qualität überhaupt bezahlbar wird.

### Teure Kunst ist bezahlbar, wenn sie einmal entsteht

Die Bergbilder im Prototyp bekommen je einige hundert Pfadstücke — fraktaler
Grat, Facetten, Schichtlinien, Schneegrenze mit Geröll, Kontaktschatten. Je
Bild und Bild wäre das undenkbar. Einmal gebacken kostet es 56 ms für den
ganzen Stil.

**Das ist der Beweis des Verfahrens.** Ob die 420 Punkte hohe Bergtextur aus
Code kommt oder aus einer PNG-Datei, ist dem Maler gleichgültig.

### Ein Befund, der lautlos war

Beim ersten Lauf fehlte der halbe Pergament-Wald. Der Atlas (2048 Punkte) war
übergelaufen, und die Baumbilder wurden außerhalb der Leinwand gebacken — also
gar nicht. Ohne Fehlermeldung. Der Atlas zählt jetzt mit und sagt es.

**Atlasfläche ist ein Budget.** Das gehört in die Anforderung an die Grafiken.

---

## 4 · Was an Grafiken gebraucht wird — der Vertrag

Dies ist die Vorgabe für eine KI-Erzeugung oder einen Illustrator. Sie ist
absichtlich eng: Zusammengehörigkeit entsteht aus gleichen Regeln, nicht aus
gutem Willen.

> **Seit Etappe 4 ist das kein Papier mehr, sondern Code.** Die Regeln stehen
> in `scripts/atlas/saetze.mjs` (`VERTRAG`), geprüft werden sie in
> `scripts/atlas/pruefer.mjs`, und `npm run atlas` endet mit 1, wenn ein Bild
> sie verletzt. Gemessen an einem Baum, dessen Licht von rechts kam:
>
> ```
> ✗ wald_03.png: das Licht kommt nicht von links oben:
>   links 90, rechts 154 – Vorsprung −52,7 %, nötig 1,5 %
> ✗ wald: im Satz leuchtet es teils von links, teils von rechts
> ```
>
> Ein Bild, das den Vertrag bricht, sieht **einzeln tadellos** aus und fällt
> erst zwischen zweihundert anderen auf – und dann weiß niemand mehr, welches
> es war. Das Backen ist der einzige Augenblick, in dem es billig zu finden
> ist.

### So tauscht man eine Grafik aus

```
studio/assets/karte/<satz>/<art>_<nr>.png     ← die Illustration hierhin
npm run atlas                                  ← backen und prüfen
```

Mehr nicht. **Kein Programmteil ändert sich, keine Kartendaten ändern sich.**
Wo eine Datei liegt, wird sie genommen; wo keine liegt, zeichnet der Pinsel
weiter. Das Verzeichnis vermerkt je Variante `gemalt` oder `gebacken`, damit
später noch nachvollziehbar ist, was woher kam.

Die Quellauflösung darf **höher** sein als die Tabelle unten: Gepackt wird auf
die Mipstufen herunter, und das kann der Browser besser als jede Rechnung von
Hand. Was zählt, ist das Seitenverhältnis.

### Format

* **PNG-32**, gerade (nicht vormultiplizierte) Alphakanal, sRGB, kein ICC-Profil
* Freigestellt, kein Hintergrund, keine Matte
* **4 % durchsichtiger Rand** an Ober- und Seitenkanten; unten **kein** Rand

### Perspektive — die wichtigste Regel

* **Schrägansicht, Blickwinkel etwa 30° über dem Horizont.** Nicht Draufsicht,
  nicht reine Seitenansicht. Das Objekt steht aufrecht, die Grundfläche
  fluchtet leicht.
* **Der Ankerpunkt ist die Mitte der Unterkante.** Dort berührt das Objekt den
  Boden. Es muss die Unterkante erreichen (Kontaktpunkt bei 97 % der Höhe).
* Dieselbe Regel gilt in Dragoncore schon für die Siedlungszeichen
  (`siedlung.ts`: *„der Nullpunkt liegt auf der Grundlinie"*). Ein Bild, das
  um seine Mitte verankert wäre, rutscht beim Vergrößern vom Boden weg.

### Beleuchtung

* **Ein Hauptlicht, von links oben, Höhe etwa 40°.** Schattenseite unten
  rechts.
* **Kein Schlagschatten im Bild.** Der Renderer setzt den Kontaktschatten
  selbst, damit er sich dem Untergrund anpasst.
* Warmes Licht, kühler Schatten — dieselbe DNA-Regel wie im Buchsatz.

### Maße (volle Stufe; die Mipstufen backt die Pipeline selbst)

Die volle Stufe ist **keine freie Wahl**. Sie ergibt sich aus dem engsten
Zoom: Beim höchsten Kachelgrad hat eine Kachel den Maßstab
`KACHEL_PX × Dichte ÷ Kachelmass`, heute 16,4 Bildpunkte je Karteneinheit.
Ein Baum von 26 Karteneinheiten wird dort **426 Punkte** hoch gezeichnet —
also muss das Bild mindestens so gross sein. Hier stand 190, und man sah es:
matschig statt scharf. `tests/kartenwerk.test.mjs` rechnet das jetzt nach,
statt es einem Kommentar zu überlassen.

| Art | Höhe | Verhältnis B:H | Varianten |
|---|---|---|---|
| Berge | 430 px | 1,2 – 1,9 (streuend) | 8 |
| Bäume | 430 px | 0,7 – 0,9 | 8 |
| Felsen | 150 px | 1,0 – 1,4 | 6 |
| Gebäude | 260 px | 0,9 – 1,2 | 6 |
| Schilf / Gras | *nicht als Bild* | — | Pinsel |

Spiegeln verdoppelt die Formenzahl zur Laufzeit und kostet nichts — acht
gelieferte Berge ergeben sechzehn Silhouetten.

### Zusammengehörigkeit

* **Ein Satz je Stil, in einem Durchgang erzeugt.** Gleiches Licht, gleiche
  Strichstärke, gleicher Detailgrad, gleiche Sättigung.
* Geprüft wird das als **Satz**, nicht nur je Bild: Die Fußpunkte dürfen
  höchstens 6 % auseinanderliegen, kein Bild darf mehr als das 2,2-fache oder
  weniger als das 0,45-fache der mittleren Deckung haben, und im selben Satz
  darf es nicht teils von links und teils von rechts leuchten.
* **Gleiches Größenverhältnis:** Die Stammdicke eines Baumes muss über alle
  Varianten stimmen, sonst wirkt der Wald wie aus zwei Wäldern.
* Die Farben müssen in der Palette des Stils liegen. **Der Renderer färbt
  nicht ein** — ein eingefärbter gemalter Fels sieht in jedem Stil falsch aus.
  Also: Grafiken je Stil, nicht ein Satz für alle.

### Budget

Ein Atlas von 4096 × 4096 je Stil. Mit Mipstufen kostet ein Feld das
1,33-Fache seiner Grundfläche. Acht Berge zu 650 × 420 belegen 2,9 MP, acht
Bäume 0,3 MP — der Rahmen trägt also bequem auch Felsen, Gebäude und
Küstenstücke.

### Benennung

```
assets/karte/<stil>/<art>_<nr>.png        z. B.  pergament/berge_03.png
assets/karte/<stil>/atlas.json            vom Packer erzeugt
```

---

## 5 · Offene technische Probleme — ungeschönt

**(a) Sprites allein ergeben keine Gebirgskette.**

Im Prototyp sichtbar: Die Gipfel überlappen zu einem Massiv, aber es gibt
keine durchgehenden Flanken zwischen ihnen. Eine echte Kette braucht **zwei
Lagen** — einen Geländeunterbau (aus dem Abstandsfeld gerechnete Hänge, mit
Licht- und Schattenseite) und darüber die Gipfel-Sprites. Das ist Arbeit, kein
offenes Problem; aber es muss von Anfang an eingeplant sein, sonst bleibt es
bei Icons auf Papier.

**(b) Der Ruckler beim Ändern: 127 ms.**

Zwölf Kacheln auf einmal neu zu backen ist sichtbar. Die Lösung: ein Zeitbudget
je Bild (etwa 8 ms), die nächstliegende Kachel zuerst, und **die alte Kachel
bleibt stehen, bis die neue fertig ist**. Dann sieht man kurz veraltetes
Gelände statt eines Ruckelns.

**(c) Speicher auf dem iPhone.**

25 Kacheln zu 500 × 500 × 4 Byte sind 25 MB je Stil. Safari beendet Tabs, die
zu viel Leinwandspeicher halten. Es braucht einen **gedeckelten Zwischenspeicher**
(ältestes zuerst hinaus) und ein hartes Limit.

**(d) `OffscreenCanvas` gibt es erst ab Safari 16.4.**

Rückfallweg auf ein gewöhnliches `<canvas>` ohne Anzeige. Kein Hindernis, aber
es muss geschrieben werden.

**(e) Das Abstandsfeld kostet 85 ms je Karte.**

Noch erträglich, aber es gehört in einen Worker — sonst hakt die Oberfläche
beim ersten Öffnen einer großen Karte.

**(f) Hineinzoomen jenseits der vollen Stufe.**

Ab etwa 2× wird ein Sprite weich. Entweder höher aufgelöste Grundbilder (teuer
im Atlas) oder ein prozeduraler Detailüberzug. Noch nicht entschieden.

**(g) WebGL: nicht jetzt, aber nicht verbaut.**

Dragoncore ist heute **kein WebGL** — es ist React, SVG und Canvas 2D. Canvas 2D
mit Kacheln erreicht das Qualitätsziel; das beweist der Prototyp. WebGL kaufte
dynamisches Licht, Wasser je Bildpunkt und sehr große Staffagezahlen — nichts
davon ist für die Referenz nötig.

Weil aber **nur Stufe 5 zeichnet**, ist der Maler die einzige Stelle, die ein
WebGL-Maler ersetzen müsste. Die Stufen 1 bis 4 erführen nichts davon. Genau
das war die Forderung: erweitern, ohne die Engine umzubauen.

---

## 6 · Der Weg dorthin, in Etappen

Jede Etappe ist für sich lauffähig und bricht nichts.

| | Was | Ergebnis |
|---|---|---|
| **1** | `lib/kartenwerk/` anlegen: Gelände, Streuwerk, Stilbuch, Kachelwerk, Maler. Der heutige Renderer bleibt unberührt. | Die Engine steht, ungenutzt. |
| **2** | Die **Bäume** vom alten Weg auf das Kartenwerk umstellen. Gleiche Optik, gleiche Daten. | Der Zwischenspeicher greift; Schieben wird messbar flüssiger. Nichts sieht anders aus. |
| **3** | **Berge** als vierte Bedeutung: Streuregel, Geländeunterbau, Pinsel-Zeichnung. | Der größte sichtbare Sprung, noch ohne eine einzige Grafikdatei. |
| **4** | **Atlas-Weg** anschließen: Packer im Bau, `ladeAtlas()`, erste echte Grafiken für *einen* Stil. | Der hybride Weg ist scharf. |
| **5** | **Stilbuch erweitern** um Textur, Baumform, Material, Schrift. Pergament als zweiter Stil. | Stilwechsel kann mehr als Farben. |
| **6** | Wiese, Sumpf, Wege, Klippen, Brandung. | Die Artenliste der Referenz. |

Nach Etappe 2 ist der Punkt erreicht, ab dem Qualität nur noch Geld und Zeit
kostet, aber keine Architektur mehr.

---

## 7 · Was dieser Plan ausdrücklich nicht tut

* **Keine Bilderzeugung zur Laufzeit.** Grafiken entstehen vorher und liegen
  als Dateien bei. Die Anwendung bleibt ohne Netz lauffähig und ohne laufende
  Kosten.
* **Kein Generieren von Geografie.** Das Streuwerk füllt nur, was gemalt wurde.
  Ein Wald, den niemand gezeichnet hat, entsteht nicht — Gesetz 4.
* **Kein Ersetzen des Artbook-Stils.** Er wird einer von mehreren. Der Satz in
  `stil.ts` über den Mittelaltermarkt wird dabei von einem Verbot zur
  Beschreibung *eines* Stils.
* **Kein Festlegen auf die gebackene Optik.** Sie ist Stufe eins und steht
  unter `scripts/atlas/pinsel.mjs` – einer *Quelle*, keinem Programmteil. Der
  Weg daneben, über gemalte Dateien, ist gebaut und geprüft; welcher von
  beiden eine Variante liefert, entscheidet allein, ob eine Datei da liegt.
* **Kein Bruch der Daten.** `Kartendokument` bekommt neue Bedeutungen und
  später Flächeneigenschaften. Alles Gespeicherte bleibt lesbar.
