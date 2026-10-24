# Entwurf: Waldwerk

Der Nachweis zu `../../WALDWERK.md`. Gehört nicht zur Anwendung und wird
nicht gebaut.

    wald.html   drei Tafeln: gestempelt · komponiert · komponiert mit feineren Bildern
    fein.mjs    backt den feineren Bildersatz für die dritte Tafel

Ansehen — er liest den **echten** Bildersatz aus `public/karte/`:

    cd studio && cp -r public/karte entwurf/waldwerk/karte
    node entwurf/waldwerk/fein.mjs          # legt karte/fein/ an
    python3 -m http.server 8141 --directory entwurf/waldwerk
    # dann http://localhost:8141/wald.html

Dass Tafel 1 und 2 aus **demselben** Bildersatz kommen, ist der Kern: Der
Unterschied zwischen ihnen ist allein die Anordnung.
