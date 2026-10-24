# Die Grafiken des Artbook-Satzes

Hier liegen die **gemalten** Bilder. Jede Datei, die hier liegt, verdrängt
beim Backen das gebackene Bild derselben Variante:

    wald_00.png … wald_07.png      die acht Baumvarianten
    npm run atlas                   backen und prüfen

Was fehlt, zeichnet der Pinsel aus `scripts/atlas/pinsel.mjs`. Das Verzeichnis
`public/karte/artbook/atlas.json` vermerkt je Variante `gemalt` oder
`gebacken`.

## Was hier liegt

Acht Baumzeichnungen – vier Nadel, vier Laub –, aus einem einzigen Blatt
erzeugt und daraus geschnitten. **Alle acht halten den Vertrag** aus
`scripts/atlas/saetze.mjs`: Fußpunkt auf der Unterkante, Licht von links
oben, freier Rand, Seitenverhältnis 0,8 : 1.

Das Rohbild liegt unter `roh/wald_blatt.png` und bringt seine
Durchsichtigkeit schon mit. Der Weg von dort hierher:

    npm run freistellen -- artbook wald 8 --blatt --frei
    npm run atlas

`--frei` sagt: Nicht noch einmal freistellen. Geteilt und eingepasst wird
trotzdem – ein Blatt mit acht Bäumen ist auch freigestellt noch kein Satz
aus acht Dateien.

## Das Unterholz

    unterholz_00.png … unterholz_14.png

Fünfzehn Stück aus `roh/unterholz_blatt.png`, geschnitten mit

    npm run freistellen -- artbook unterholz 15 --blatt --teile --frei --spiegeln \
      --auswahl=19,21,27,28,29,30,31,32,33,34,36,38,44,48,54

`--teile` trennt nach Zusammenhang statt an leeren Spalten – auf diesem
Blatt gibt es keine. `--spiegeln`, weil der Prüfer bei allen fünfzehn
dasselbe meldete: Das Licht kam von rechts, um 9 bis 30 %.

Die Nummern stammen aus `window.zerlege`, das dasselbe Blatt nummeriert
zeigt. Felsbrocken, Totholz und Jungbäume sind bewusst nicht dabei: Diese
Art füllt die Stammzone, und was höher ist als ein Knie, gehört nicht
hinein.

## Was noch hier liegt und noch nicht verwendet wird

    roh/wald_blatt_zwei.png    Einzelbäume, Waldgruppen, Unterholz

Beide sind sauber freigestellt. Gemessen wurde, wie gross die einzelnen
Stücke darin sind – denn das entscheidet, wofür sie taugen.

**Die Schranke.** Ein Bild wird in eine Kachel gemalt, und die feinste
Kachelstufe hat einen festen Maßstab: `KACHEL_PX × Dichte ÷ Kachelmass`,
heute **16,4 Bildpunkte je Karteneinheit**. Was auf der Karte `k`
Einheiten hoch steht, braucht also `k × 16,4` Bildpunkte – sonst sieht man
es, und zwar genau so, wie die Bäume bei 190 statt 430 aussahen.

| Blatt | Stücke | Höhe in Punkten | reicht für |
|---|---|---|---|
| `wald_blatt_zwei` Einzelbäume | ~8 | bis 479 | 29 Einheiten – Bäume stehen auf 26 |
| `wald_blatt_zwei` Waldgruppen | ~8 | 293 – 338 | **20 Einheiten** |
| `unterholz_blatt` alles | 79 | 55 – 276, median 110 | **6,7 Einheiten** im Mittel |

Daraus folgt dreierlei:

* Die **Einzelbäume** reichen knapp, bringen aber nichts Neues –
  `wald_blatt.png` gibt mit 440 bis 530 Punkten mehr her.
* Die **Waldgruppen** sind zu klein. Eine Gruppe soll grösser sein als ein
  Baum, also etwa 60 Einheiten; dafür bräuchte sie **rund 1000 Punkte** und
  hat 338. Bei 20 Einheiten gezeichnet wäre sie kleiner als zwei Bäume und
  damit sinnlos, bei 60 wäre sie Matsch.
* Das **Unterholz** passt. Das Waldwerk zeichnet seine Unterholzlage auf
  0,2 bis 0,36 der Baumhöhe, also 5 bis 9 Einheiten – genau die Spanne,
  die 110 Punkte decken. Heute nimmt es dafür verkleinerte Baumbilder;
  echte Büsche, Farne und Steine wären der nächste echte Gewinn.

**Was der Freisteller dafür noch lernen muss.** Er trennt heute an leeren
Spalten. Auf diesen Blättern gibt es keine: Sie haben 25 bzw. 36 leere
Zeilen auf tausend, die Stücke berühren sich. Nötig ist eine
Zusammenhangsanalyse – gemessen findet sie 31 bzw. 79 Stücke sauber.
