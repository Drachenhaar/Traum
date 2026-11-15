# Dragoncore – Lebendige Weltkarte: erstes Integrationspaket

## Gebaut
- Die bisherige Semantik bleibt erhalten: Flächen, Siedlungszeichen und Gebirgskämme bleiben verschieden.
- Drei **Einzelbauten** (Haus, Turm, Brücke) werden als eigene Daten mit Fußpunkt, Seed und optionalem `entryId` gespeichert.
- `heileKarte` erhält gültige Stätten und liest auch ältere Kartendateien weiter.
- Die Atlas-/Canvas-Architektur rendert Bauwerke per stilgebundenem Pinsel-Fallback, bis gemalte Bauwerksgrafiken hinzukommen.
- Freie Stätten erscheinen im flachen Bild **und** im erhobenen Relief.
- Mit dem Finger setzen, auswählen, in der Ansicht `Ansehen` bewegen, einer Buchseite zuordnen oder löschen.
- Ein Bauwerk pro Loslassen = ein rückgängig machbarer Schritt.
- Kachelwerk entwertet gezielt nur alte und neue Gebäudeboxen.
- Beim Import in ein neues Buch werden die Seitennamen über die neuen Eintrag-IDs aufgelöst.

## Absichtlich nicht vorgetäuscht
- Keine neuen Bewohner auf einer Karte ohne explizite Platzierung.
- Noch kein spielbarer Spaziergang in der **realen** Karte; die selbständige Figur bleibt im separaten Prototyp aus PR #97.
- Keine eigenständige 3D-Runtime; die flache Kartenengine bleibt React + SVG + Canvas.
- Gebäude sind aktuell sauber gezeichnete Platzhalter; malerische Asset-Sets lassen sich später über den Atlas anbieten.

## Öffnen nach Freigabe
`https://drachenhaar.github.io/Traum/studio/` → Buch → Weltkarte. Dieser PR ist zunächst ein Entwurf; vor dem Merge ändert sich der veröffentlichte Stand nicht.

## Technische Prüfung
`cd studio && npm run typecheck && npm test && npm run build`

## Vor dem Merge zu überprüfen
- Mobile Zwei-Finger-Zoomgeste und Gebäudedrag unter Safari, besonders der zweite Finger während eines Drags.
- Stätten setzen → Seite wählen → umbenennen → neu laden → Rückgängig → sichern und importieren.
- Stätten auf leerer Karte, im Wald und auf erhöhtem Gelände.
- Kachelnähte bei Zoomstufe 4/5.
- Darstellung eines Hauses in einem Atlas, wenn echte Assets geliefert werden.
