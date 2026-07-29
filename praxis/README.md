# Praxis – Kasse & Werkzeuge

Eigenständige, schlichte App für den praktischen Einsatz – unabhängig von
Dragoncore, kein Traumwelt-Bezug, helles funktionales Design.

## Dateien
- `index.html` – Grundgerüst, zwei Bereiche: Kasse und Werkzeuge
- `style.css` – helles Praxis-Design
- `app.js` – verdrahtet Kasse/Werkzeuge und die Bereichs-Umschaltung
- `kasse.js` / `kasseui.js` – Datenmodell und Rendering für Kasse & Tische
- `toolkit.js` / `toolkitui.js` – Datenmodell und Rendering für die
  Werkzeug-Checkliste

## Kasse & Tische
Notizblock für die Bedienung, wie bei einem Tischsystem (z. B. orderbird),
aber bewusst ohne echte Zahlungsabwicklung: Bestellungen werden Tischen
zugeordnet, im Blick behalten und per "An der Kasse eingebongt & Tisch
leeren" als Bon in den Verlauf übertragen, sobald sie an der echten Kasse
eingegeben wurden.

- **Tische**: Kachel-Übersicht (frei/belegt), Tisch antippen öffnet die
  Detailansicht mit Bestellliste, Mengen-Stepper, laufender Summe,
  Notizfeld für Sonderwünsche und Artikel-Schnellwahl nach Kategorie
- **Artikel**: Katalog mit Name, Preis, frei erweiterbaren Kategorien
- **Verlauf**: bereits übertragene Bons zur Kontrolle, einzeln löschbar

## Werkzeug-Checkliste
Drei Unter-Ansichten: Gerichte (Name, Kategorie, benötigte Werkzeuge mit
Stückzahl), Bestand (Gesamtstückzahl je Werkzeug), Packliste (Gerichte +
Anzahl für einen Termin auswählen, Bedarf vs. Bestand inkl.
Fehlmengen-Warnung, Abzug auf Knopfdruck mit Verlauf).

Beide Bereiche persistieren unabhängig voneinander in `localStorage`.
