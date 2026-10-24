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
