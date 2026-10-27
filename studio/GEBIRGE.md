# Gebirge — aus einem Strich wird ein Höhenzug

Ein Finger zieht eine Linie. Daraus entsteht ein zusammenhängendes Gebirge
mit Gipfeln, Sätteln, Nebenrücken und Tälern — und zwar jedes Mal dasselbe,
auf jedem Gerät.

---

## 1 · Was gespeichert wird

```ts
Gebirgskamm {
  punkte       der Verlauf des Kamms, offen, im Kartenraum 0…1000
  breite       wie weit der Zug zu beiden Seiten reicht
  hoehe        0…1
  zerkluftung  0…1, von weichen Rücken bis zu zerrissenen Graten
  seed         einmal gezogen, danach unveränderlich
  entryId?     die Seite im Buch
}
```

**Keine Gipfel, keine Hänge, kein Bild.** Gespeicherte Gipfelpositionen wären
eine zweite Wahrheit: Wer den Kamm verschiebt, hätte dann Berge, die nicht
mehr auf ihrem Kamm stehen.

Eine **eigene Liste** und kein `Kartenfeature`. Dieselbe Überlegung wie bei
der Siedlung, nur andersherum: Eine Siedlung hat einen Ort, eine Fläche einen
Umriss — und ein Gebirge hat einen Verlauf. Es in `features` zu zwängen
hiesse, dass `punkte` mal ein geschlossener Umriss und mal ein offener Kamm
ist, und jede Stelle, die Flächen liest, müsste das unterscheiden.

Karten ohne `kaemme` sind gültige Karten. `heileKarte` gibt eine leere Liste
zurück, nicht `undefined`.

---

## 2 · Woraus die Höhe entsteht

`hoeheBei(x, y, kamm)` — eine reine Funktion, keine Zustände, keine
Reihenfolge.

```
Profil        quer zum Kamm – hoch am Grat, aus am Fuss
Kammhöhe      entlang des Kamms – Gipfel und Sättel
Rücken        Nebenrücken und Täler, zum Hang hin stärker
Zerklüftung   feine Grate und Kerben, überall
```

### Warum nichts an der Bogenlänge hängt

Der naheliegende Weg wäre, die Gipfel entlang des Kamms zu verteilen: alle
sechzig Einheiten einer, mit `rauschen(seed, t)`. Das wäre genau der Fehler,
vor dem `zufall.ts` in seinem Kopf warnt — wer vorn einen Punkt einfügt,
verschiebt jede Bogenlänge dahinter und damit jeden Gipfel. Eine Handbreit am
Westende, und das Ostende sähe anders aus.

Gefragt wird deshalb am **Fusspunkt**: an der Stelle des Kamms, die diesem
Ort am nächsten liegt, in Weltkoordinaten. Die bleibt, wo sie ist, wenn
anderswo gezogen wird.

Geprüft wird das **bitgenau**: Ein Punkt des Kamms wird verschoben, und jede
Probe jenseits der Mitte muss exakt denselben Wert liefern wie vorher.

### Drei Dinge, die beim Bauen falsch waren

**Die Nebenrücken waren Flecken.** Sie kamen aus einem Rauschen in der
Fläche, also in beliebiger Richtung; gerendert sah der ganze Zug aus wie eine
bröckelnde Stufe. Gemessen war das Höhenfeld dabei richtig — Grat 0,26 bis
0,73, Hang 0,00 bis 0,54 —, es lief nur quer zu dem, was man sieht. Ein
Nebenrücken läuft **bergab**; am Fusspunkt gefragt, ist der Wert entlang
einer Falllinie konstant, und daraus entstehen Rippen und Rinnen.

**Von jedem Knick lief ein harter Strahl.** Der nächste Punkt auf dem Kamm
*springt*: Auf der Innenseite einer Biegung sind zwei Abschnitte gleich weit
weg, und einen Schritt weiter gewinnt der andere. Der Abstand ändert sich
dabei stetig, die Stelle nicht — und an ihr hängt das ganze Rauschen. Der
Fusspunkt wird deshalb über alle Abschnitte gemittelt, gewichtet nach Nähe;
der Abstand bleibt das echte Minimum.

**Das Licht stand zu tief.** 29 Grad, bei Hängen von 35 — damit lag fast
alles im Schatten. Physikalisch richtig und als Karte unbrauchbar: Eine
Reliefschummerung zeigt Form, nicht Tageszeit. Jetzt 45 Grad, und die
Helligkeit wird über eine Wurzelkurve abgebildet statt über ein Fenster:
Sonst fiel der ganze abgewandte Hang in dieselbe Schattenfarbe, und die
halbe Landschaft war eine glatte Fläche.

---

## 3 · Wie es gezeichnet wird

**Ein Kachelmaler mehr, keine zweite Zeichenmaschine.**

`useKartenleinwand.ts` hatte die Stelle von Anfang an vorgesehen und
beschrieben: Das Kachelwerk kennt zwei Lagen, `grund` und `bewuchs`, und
bisher lief nur die zweite. Das Gebirge ist die erste.

```
SVG        Land, Wasser, Wald als Flächen – und alle Fangbereiche
grund      das Gebirgsrelief                      (Leinwand, gekachelt)
bewuchs    Bäume, Unterholz, Kronendach           (Leinwand, gekachelt)
SVG        Namen, Siedlungszeichen, Auswahl
```

Damit gilt für das Gebirge alles, was für den Wald schon galt: je Kachel
gerechnet, gezielt entwertet, nach Budget gebacken, beim Schieben nur
kopiert. **Beim Schwenken und Zoomen wird nichts neu gerechnet.**

Gerechnet wird auf einem gröberen Gitter — ein Gitterpunkt je vier
Bildpunkte — und beim Setzen weich vergrössert. Eine Schattierung ist von
Natur aus glatt. Das Gitter hängt an der **Welt** und nicht an der Kachel:
Zwei Nachbarkacheln fragen an ihrer Grenze exakt dieselben Orte.

### Was es kostet

| | |
|---|---|
| Reliefkachel, erster Anlauf | **51 ms** |
| Reliefkachel heute | **8,3 ms** |
| Anteil am Schiebebild | unverändert, das Relief liegt im Speicher |

Der Unterschied ist eine Vorsortierung: `gebirgsfeld` wirft je Kachel weg,
welcher Zug und welcher Abschnitt sie gar nicht erreichen kann. Vorher ging
jede der sechzehntausend Proben alle fünfundvierzig Abschnitte durch, auch
die am anderen Ende der Karte.

Das hatte einen Preis, der erst im Bild auffiel: Weggelassene Abschnitte
zogen über die weiche Mittelung noch am Fusspunkt, und an jeder Kachelgrenze
stand eine **senkrechte Naht**. Seitdem ist die Einflussweite eines
Abschnitts begrenzt, und der Filter rechnet mit genau diesem Mass. Dass
schneller und schlicht dasselbe ergeben, ist geprüft.

---

## 4 · Was der Verfasser tut

* **Gebirge** wählen, mit einem Finger den Kamm ziehen. Zwei Finger
  verschieben und zoomen wie überall.
* Auf den Kamm tippen wählt ihn aus. Der Fangbereich ist der **Kamm**, nicht
  der ganze Höhenzug: Ein Gebirge *ist* seine Linie.
* Im Bedienfeld drei Regler — Breite, Höhe, Zerklüftung — und die
  Seitenzuordnung. Keine Zahlenfelder: Wie breit „breit" ist, hängt davon
  ab, wie gross die Karte daneben ist.
* Am gewählten Kamm sitzen **Griffe**. Einen zu ziehen verschiebt den
  Verlauf; gespeichert wird beim Loslassen, also ein Schritt im Rückgängig
  und nicht sechzig.

Rückgängig, Speichern und Wiederherstellen tragen die Gebirge mit.

---

## 4a · Die Baumgrenze

Wälder und Gebirge wussten nichts voneinander: Ein Wald lief ungerührt über
einen Gipfel. Jetzt fragt das Streuwerk für jeden Baum die Höhe an seinem
Ort und dünnt oberhalb einer Grenze aus, lässt die verbliebenen kümmern und
hört darüber ganz auf.

**Eine Höhe und kein Anteil.** Das ist der Unterschied zwischen einer
Landschaft und einer Zeichnung: Ein Hügel trägt bis zum Gipfel Wald, ein
hoher Zug wird oben kahl. Als Anteil gerechnet wäre jeder Gipfel gleich
kahl, egal wie hoch er ist — und zwei Berge nebeneinander sähen aus wie zwei
Kopien desselben.

**Eine Rampe und keine Kante.** Oben stehen zuerst weniger Bäume, dann
kleinere, dann keine. Eine Kante ergäbe eine saubere Höhenlinie quer durch
den Wald, und so etwas gibt es in der Natur nicht.

**Es steht im Streuwerk und nicht im Stilbuch.** Das Streuwerk sagt, *wo*
etwas steht; dass oberhalb einer Höhe keine Bäume mehr stehen, ist eine
Aussage über den Ort und in jedem Stil dieselbe.

**Ohne Gebirge ändert sich nichts.** `hoeheUeberall` gibt ohne Kämme überall
null zurück; jede Karte, die es schon gibt, sieht aus wie vorher — Baum für
Baum, bitgenau geprüft.

Dabei kam ein stiller Fehler heraus: Eine Kammänderung entwertete nur die
**Reliefkacheln**. Seit es eine Baumgrenze gibt, ändert ein verschobener
Kamm aber auch, welche Bäume oben noch stehen — die Bewuchskacheln blieben
mit ihrem alten Wald liegen, und weil sie vollständig aussahen, forderte sie
niemand neu an. Ein Wald auf einem Berg, den es dort nicht mehr gibt.

Und eine Zeile ist verschwunden, die nichts tat: `if (ueber >= 1) continue;`
vor der Ausdünnung. `zahl` liegt immer unter eins, also entfernt der Wurf
bei voller Höhe ohnehin jeden Baum. Die Gegenprobe hat es gezeigt — sie
konnte nicht scheitern, also prüfte nichts sie.

---

## 5 · Die Erweiterungsstelle für gemalte Berge

`gratpunkte(kamm)` in `gebirgswerk.ts` liefert je Abschnitt einen Ort auf dem
Kamm, seine Höhe und die Richtung, in die der Grat dort zeigt.

```ts
{ x, y, hoehe, richtung }
```

Genau das braucht ein Bildersatz, um gemalte Felswände zu setzen: an den
Gipfeln die grossen, in den Sätteln die kleinen, gedreht wie der Grat. Heute
liest das niemand, und das ist Absicht — die Stelle gehört angelegt, solange
man weiss, warum.

**Der zweite Schritt wäre damit kein Umbau, sondern derselbe Weg wie beim
Wald:**

1. Ein Blatt mit Felswänden, Graten und Schneefeldern, einheitlich von links
   oben beleuchtet — derselbe `VERTRAG` wie für die Bäume.
2. `npm run freistellen -- artbook fels N --teile --frei` schneidet es.
3. Eine Art `fels` in `scripts/atlas/saetze.mjs`, `npm run atlas`.
4. Im Gebirgswerk nach dem Relief: über `gratpunkte` laufen und zeichnen,
   nach Höhe sortiert, von hinten nach vorn.

Das Relief bleibt darunter liegen. Es ist nicht das Provisorium, das die
Bilder ablösen — es ist der Grund, auf dem sie stehen, und es trägt die
Stellen, die kein Bild abdeckt.

### Die Masse, gemessen statt geschätzt

Hier stand „eine Felswand von 40 Karteneinheiten braucht 650 Punkte". Das war
geschätzt. `npm run felsbogen` misst es stattdessen, und zwar am höchsten
Grat des Hauptkamms, senkrecht zum Verlauf:

| | |
|---|---|
| Gipfelhöhe | **98 Karteneinheiten** |
| Fussbreite | **222 Karteneinheiten** |
| Verhältnis | **2,27 : 1** |
| zum Vergleich: ein Baum | 26 Einheiten |

**Ein Gipfel ist also ein breiter Buckel und keine Zacke** — knapp vier
Fichten hoch und achtmal so breit wie eine. Wer eine Felsnadel malt, malt
gegen das, was darunter gerechnet wird, und der Widerspruch fällt genau dann
auf, wenn man heranzoomt.

Bei der **Auflösung** gilt die Schranke der Bäume nicht unverändert. Dort
sind es `karteHoehe × 16,4`, weil man an einen Baum ganz heranfährt; ein
Gipfel von 222 Einheiten Breite passt beim engsten Zoom längst nicht mehr
aufs Bild. Massgeblich ist der nächste Zoom, bei dem er **ganz** zu sehen
ist: 222 Einheiten auf 2048 Punkten, also 9,2 je Einheit — **900 Punkte
Höhe, 2043 Breite**. Wer näher herangeht, sieht eine Vergrösserung, aber dort
trägt die gerechnete Schattierung die Feinheit, und die hat keine
Auflösungsgrenze.

### Der Vorlagenbogen

`npm run felsbogen` erzeugt `.testbau/felsbogen/felsbogen.png`: acht Felder in
genau dieser Grösse, jedes mit

- der **echten Silhouette** eines anderen Gipfels, aus `hoeheUeberall`
  senkrecht zum Kamm geschnitten — die Linie, hinter der die gemalte Wand
  verschwinden darf und vor der sie nicht herausragen sollte,
- der **Fusslinie** bei 96 % der Höhe, auf der die Wand den Boden berührt,
- dem **Rand**, in dem nichts stehen darf, damit die Glättung nicht
  anschneidet,
- dem **Lichtpfeil** von links oben,
- und einem **Baum als Mass**.

Ein erster Entwurf hat statt der Silhouette die Schattierung aus
`maleGebirge` untergelegt. Das war die falsche Projektion: Die Schattierung
sieht von **oben** auf das Gelände, eine gemalte Wand steht **aufrecht** wie
ein Baum. Wer auf eine Draufsicht malt, malt eine Wand, die nie passt.

**Eines sagt der Bogen auch über das Gebirge selbst:** Die acht Querschnitte
sehen einander ähnlich. Die Zerklüftung verändert die Flanken, nicht die
Grundform. Wenn die gemalten Berge mehr Eigenart haben sollen als der
Untergrund hergibt, ist das keine Frage an den Pinsel, sondern an
`GEBIRGE.gipfel`, `kerbe` und `schwankung`.

---

## 6 · Was ausdrücklich nicht passiert ist

Keine zweite Kartenimplementierung. Keine Änderung an Wäldern, Flüssen,
Küsten oder Siedlungen. Keine erfundene Geografie ausserhalb des gezeichneten
Zuges — wo kein Kamm ist, ist kein Berg.

Dabei kam ein **Datenverlust** heraus, der älter ist als das Gebirge:
`heileKarte` kopierte `worldId` nicht. Der Laden holt Karten mit
`db.karten.where('worldId')`; eine geheilte Karte kam ohne Welt zurück, wurde
beim nächsten Strich so gespeichert — und war beim nächsten Öffnen weg. Nicht
gelöscht, nur unauffindbar, was schlimmer ist. Gefunden hat es die
Gebirgssonde: `{id:'k_mess', book:'b1', world:undefined, f:3, g:1}` — alle
Daten da, die Karte trotzdem leer.
