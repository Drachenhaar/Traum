# Die Grafiken des Artbook-Satzes

Hier liegen die **gemalten** Bilder. Jede Datei, die hier liegt, verdrängt
beim Backen das gebackene Bild derselben Variante:

    wald_00.png … wald_07.png      die acht Baumvarianten
    npm run atlas                   backen und prüfen

Was fehlt, zeichnet der Pinsel aus `scripts/atlas/pinsel.mjs`. Das Verzeichnis
`public/karte/artbook/atlas.json` vermerkt je Variante `gemalt` oder
`gebacken`.

Die Regeln, die eine Datei einhalten muss, stehen in
`scripts/atlas/saetze.mjs` (`VERTRAG`) und werden beim Backen gemessen. Der
Weg von einem Rohbild dorthin:

    assets/karte/artbook/roh/wald_blatt.png     das Rohbild
    npm run freistellen -- artbook wald 8 --blatt
    npm run atlas

## Was hier gerade liegt

`wald_00.png` ist ein **Platzhalter**, von Hand gerechnet – kein Werk eines
Bildmodells und nicht das Qualitätsziel. Sie steht hier, damit der
Austauschweg an einer echten Datei geprüft ist.

`roh/wald_blatt.png` ist ebenfalls ein Platzhalter: ein nachgestelltes
Modellergebnis (acht Bäume nebeneinander auf einfarbigem Grund, mit
absichtlich uneinheitlichen Fußlinien), an dem der Freisteller geprüft wird.
