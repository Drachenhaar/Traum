# Entwurf: Kartenwerk

Ein **lauffähiger vertikaler Prototyp** des in `../../KARTENWERK.md`
beschriebenen hybriden Renderers. Er gehört nicht zur Anwendung und wird
nicht gebaut; er ist der Nachweis, dass die Pipeline trägt.

    kartenwerk.js   die fünf Stufen: Gelände · Streuwerk · Atlas · Kachelwerk · Maler
    stilbuch.js     zwei Stilbücher, die Backfunktionen der Grafiken, die Pinsel
    demo.html       ein Kartendokument, beide Stile nebeneinander, die Messung

Ansehen:

    python3 -m http.server 8111
    # dann http://localhost:8111/entwurf/kartenwerk/demo.html

Ein Modulskript braucht einen Server — über `file://` greift die
Ursprungsregel des Browsers.

## Was hier bewusst Behelf ist

Die Atlasfelder werden beim Start **aus Code gebacken**, weil die echten
Grafiken noch fehlen. Wenn sie kommen, tritt ein `ladeAtlas()` an die Stelle
von `backeAtlas()` — und sonst ändert sich nichts. Genau das sollte der
Prototyp zeigen.

Die Anforderungen an diese Grafiken stehen in `../../KARTENWERK.md`,
Abschnitt 4.
