# Dragoncore 0.5 – Neues Fundament

Diese Version ist formatiert und lesbar.

## Dateien
- index.html
- style.css
- script.js – UI, Reveal-Texte, Orbs
- chronicle.js – zeichnet Anwesenheits- und Stille-Phasen auf (localStorage)
- thoughts.js – Gedanken-Eingabe, die dauerhaft gespeichert wird und später
  wieder als Orb-Nachricht auftauchen kann
- creatures.js – lässt Wesen-Bilder langsam erscheinen, sobald sie vorhanden sind

## Bild
Lege dein Masterbild hier ab:

assets/backgrounds/dragoncore-master-4k.png

Falls dein Bild anders heißt, ändere in `style.css` nur diese Stelle:

url("assets/backgrounds/dragoncore-master-4k.png")

## Wesen (optional)
`creatures.js` blendet nach einer Weile Bilder ein – sobald sie unter
folgenden Pfaden liegen, erscheinen sie automatisch, vorher bleiben sie
unsichtbar (kein kaputtes Bild-Icon):

- assets/creatures/koi.png – erscheint nach 3 Minuten
- assets/creatures/dragonfly.png – erscheint nach 5 Minuten
- assets/creatures/bird.png – erscheint nach 10 Minuten

Die Bilder sollten freigestellt (transparenter Hintergrund) und im selben
gemalten Stil wie das Hauptbild sein, damit sie sich einfügen statt
aufzufallen.

## Dragoncore Studio (separate App)

Unter `studio/` liegt **Dragoncore Studio** – der Creative-Workspace und die
lebendige Art Bible des Projekts: Charaktere, Kreaturen, Orte, Assets, Prompts und
Bilder, alles lokal im Browser gespeichert und auf dem iPhone bedienbar.

Eigenes Projekt mit eigenem Build:

```bash
cd studio && npm install && npm run dev
```

Details siehe `studio/README.md`.

## Praxis-Werkzeuge (separate App)

Unter `praxis/` liegt eine eigenständige, schlichte App für Kasse & Tische
und die Werkzeug-Checkliste – bewusst getrennt von Dragoncore, eigenes
helles Design, kein Traumwelt-Bezug. Aufrufbar unter `praxis/index.html`
bzw. live unter `drachenhaar.github.io/Traum/praxis/`. Details siehe
`praxis/README.md`.
