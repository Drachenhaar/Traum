# Waldwerk — wie aus Bäumen ein Wald wird

> **Der Befund in einem Satz:** Ein schöner Wald ist nicht ein besserer Baum.
> Er ist die Anordnung — und dann ein besserer Baum.
>
> Der Nachweis liegt unter `entwurf/waldwerk/`: dreimal dieselbe Fläche,
> dasselbe Streuwerk, dieselben 147 Bäume. Nur die Anordnung und der
> Bildersatz ändern sich.

---

## 1 · Was gemessen wurde

| Tafel | Was | Bäume | Bauzeit (1220 × 1200) |
|---|---|---|---|
| 1 | gestempelt, wie heute | 115 | 11,4 ms |
| 2 | komponiert, **dieselben** Bilder | 147 | 97,1 ms |
| 3 | komponiert, feinere Bilder | 147 | 105,1 ms |

Zwischen 1 und 2 liegt **kein einziges neues Bild**. Der Unterschied ist
allein die Anordnung. Zwischen 2 und 3 liegt **keine Änderung am Verfahren**
— nur ein anderer Bildersatz.

Beide Sprünge sind nötig, und sie multiplizieren sich.

---

## 2 · Die sechs Lagen

Heute zeichnet Dragoncore eine Lage: Bäume, nach `y` sortiert, auf eine
Fläche in Waldton. Das ergibt Symbole auf einem Fleck.

```
6  Licht          weiche helle Flecken über dem Blätterdach
5  Kronen         die Bäume selbst, nach y sortiert
4  Kronendach     die Vereinigung aller Kronen, verwischt, dahinter
3  Unterholz      dieselben Bilder, klein und dunkel
2  Schattenwurf   alle Schatten zusammen, dann verwischt
1  Waldboden      die Fläche, stark verwischt, gesprenkelt
```

**Lage 1 — der Boden läuft aus statt aufzuhören.** Keine Fläche mit Kante,
sondern dieselbe Form mit 13 px Weichzeichner. Dadurch gibt es keinen
Übergang, den man zeigen könnte; es gibt nur ein Dichterwerden. Das ist die
Antwort auf *harte Übergänge*.

**Lage 2 — die Schatten gehören zusammen.** Jeder Baum bekommt einen Fleck,
aber **alle in einer eigenen Lage**, die als ganze verwischt wird. Einzeln
unter jeden Baum gesetzt sähe jeder aus wie ein Aufkleber mit Schlagschatten;
gemeinsam ergeben sie das Dunkel unter einem Blätterdach.

**Lage 3 — Unterholz füllt die Stammzone.** Dieselben Bilder auf ein Fünftel
verkleinert und abgedunkelt, zwei bis drei je Baum. Ohne sie sieht man
zwischen den Stämmen hindurch auf den Boden, und der Wald wird durchsichtig.

**Lage 4 — das Kronendach ist der entscheidende Trick.** Die Vereinigung
aller Kronen als weiche Masse, **hinter** den Bäumen gezeichnet. Sie füllt
die Lücken zwischen den Kronen, sodass man im dichten Teil nicht mehr auf den
Boden sieht. Am Rand verschwindet sie von selbst, weil dort keine Kronen mehr
sind. Das ist die Antwort auf *sichtbare Überlagerungen*: Man sieht keine
einzelnen Kronen mehr, sondern eine Decke.

**Lage 6 — Licht bindet.** Ein paar sehr weiche helle Flecken, von links
oben. Sie legen sich über mehrere Kronen zugleich und binden sie zu einer
Masse. Es ist der Schritt, nach dem man aufhört, Bäume zu zählen.

---

## 3 · Wie Wiederholungsmuster vermieden werden

Drei Dinge, und das zweite ist das wichtigste.

**(a) Dichte aus einem Feld, nicht aus einer Zahl.** Ein Wald mit überall
gleicher Dichte ist eine Matte. Ein weiches Rauschfeld über der Fläche
erzeugt Dickichte und Lichtungen — und das ist der Hauptgrund, warum man kein
Raster mehr sieht: Das Auge sucht Regelmäßigkeit und findet keine.

**(b) Die Variante hängt an einem anderen Salz als der Ort.**

```js
const v = Math.floor(amOrt(x * 0.37, y * 0.41, 10007) * varianten);
```

Nimmt man dasselbe Salz wie für die Lage, wandern gleiche Varianten in
Streifen — das Auge sieht Reihen, obwohl die Punkte unregelmäßig liegen. Das
ist der Fehler, den man am schwersten findet, weil jeder einzelne Baum richtig
sitzt.

**(c) Instanzenblätter: dieselbe Variante in mehreren Stimmungen.** Acht
Bilder, hundertmal gesetzt, liest das Auge als acht Bilder — egal wie gut sie
sind. Was hilft, ist nicht ein neunter Baum, sondern derselbe Baum anders
gestimmt: nach hinten heller und kühler, nach vorn satter. Fünf Stufen mal
acht Varianten sind vierzig Erscheinungen aus acht Dateien, einmal beim Laden
gerechnet.

Dazu Spiegeln (verdoppelt die Silhouetten umsonst) und eine Größe, die nach
hinten abnimmt und zum Rand hin kleiner wird.

---

## 4 · Was die Komposition **nicht** kann

Tafel 2 zeigt es: Bei 165 Bildpunkten Höhe sieht man jeder gebackenen Krone
an, dass sie ein Vieleck mit Farbverlauf ist. Kein Schattenwurf und kein
Kronendach macht daraus Laub.

Was fehlt, ist in den Bildern und nicht im Verfahren:

* **Unregelmäßige Silhouette.** Eine Krone darf keine konvexe Form sein. Das
  Auge erkennt Blattwerk an der zerrissenen Kante, nicht an der Füllung.
* **Lesbare Binnenstruktur.** Einzelne Blattbüschel, die bei 120 px noch zu
  unterscheiden sind.
* **Sichtbarer Stamm und Astansatz** bei den Laubvarianten — mindestens im
  unteren Drittel.

---

## 5 · Was an Grafiken gebraucht wird

Zusätzlich zum Vertrag aus `KARTENWERK.md` § 4, der unverändert gilt:

| Satz | Varianten | Höhe | Zweck |
|---|---|---|---|
| `wald` | **12** (4 Nadel, 6 Laub, 2 Charakterbäume) | 380 px | die Kronen |
| `unterholz` | 6 (Busch, Farn, Jungwuchs) | 120 px | Lage 3 |
| `waldrand` | 4, asymmetrisch, Stamm deutlich | 380 px | der Saum |

**Warum zwölf und nicht acht.** Unter zehn erkennt das Auge die Wiederholung
auch durch Spiegeln und Stimmungen hindurch. Über vierzehn gewinnt man nichts
mehr und zahlt Atlasfläche.

**Charakterbäume** sind auffällige Einzelstücke — ein schiefer, ein sehr
hoher, einer mit totem Ast. Sie brauchen ein **Gewicht**, damit sie selten
gesetzt werden; zweimal dasselbe Unikat auf einem Bildschirm ist schlimmer
als gar keines. Das ist die eine Erweiterung, die der Satzvertrag noch
braucht: `gewicht: 0.1` je Variante.

**Eigenes Unterholz statt verkleinerter Bäume.** Im Nachweis sind es
geschrumpfte Kronen, und man sieht es: Ein Busch ist kein kleiner Baum,
er hat keinen Stamm.

---

## 6 · Wie es in das Kachelwerk kommt

Die Lagen sind kein neuer Renderer. Sie sind ein **Kachelmaler** mehr.

```
grund   → Lage 1 (Waldboden)
bewuchs → Lagen 2 bis 6
```

Beide Zwischenspeicher gibt es schon, beide werden gezielt entwertet, beide
haben ihren Überstand.

**Die eine neue Bedingung: Weichzeichner brauchen Rand.** Ein Weichzeichner
von 13 px, der an der Kachelgrenze aufhört, hinterlässt genau die Naht, die
die ganze Lage vermeiden soll. Jede Lage wird deshalb in einen Puffer
**mit Überstand** gezeichnet, dort verwischt und erst dann beschnitten. Der
Überstand muss mindestens das Dreifache des größten Weichzeichnerradius
betragen — heute sind es 60 Karteneinheiten, das reicht.

**Was es kostet.** Gemessen: 105 ms für 1,46 Mpx gegen 11 ms gestempelt, also
etwa das Neunfache. Auf eine Kachel von 512 × 512 Bildpunkten umgerechnet
sind das rund **19 ms statt 2 ms**. Das Zeitbudget von 8 ms je Bild bedeutet
also: Eine Kachel braucht zwei bis drei Bilder statt eines.

Das trägt die vorhandene Maschinerie — veraltete Kacheln bleiben stehen, die
gröbere Stufe springt als Vorschau ein —, aber es ist die Zahl, die **auf
einem echten Telefon nachgemessen werden muss**, bevor das verbindlich wird.

---

## 7 · Was sich dafür nicht ändert

Nichts an den Kartendaten. Nichts am Streuwerk — es liefert weiterhin eine
Liste von Orten. Nichts am Stilbuch-Vertrag. Nichts an der Bedienung.

Der Verfasser malt weiter eine Fläche und sagt „Wald". Alles andere ist
Darstellung, und Darstellung ist austauschbar — das war die ganze Absicht der
Trennung.
