# Dragoncore – Backlog

Sammelstelle für Aufgaben, die wir uns vorgenommen haben. Kein starrer Plan –
wir ergänzen, verschieben und verwerfen hier laufend. Grundlage ist der
Master-Prompt (Vision/Prinzipien), umgesetzt bewusst auf der bestehenden
HTML/CSS/JS-Basis mit gemaltem Hintergrundbild (kein React/Three.js).

Leitfrage vor jedem Punkt: Fühlt sich das wie ein natürlicher Teil einer
lebenden Welt an, oder nur wie eine neue Funktion? Wenn Zweiteres, stärker
in die Welt einbetten statt nur "hinzufügen".

## Erledigt

- Gemaltes Master-Hintergrundbild als visuelle Basis (statt Three.js-Primitiven)
- Orbs mit gelegentlichen Botschaften
- Chronicle: Anwesenheits- und Stille-Tracking (`chronicle.js`)
- ThoughtGarden: Gedanken-Eingabe, gespeichert, tauchen später als Orb-Nachricht wieder auf
- Koi, Libelle, Vogel als freigestellte Bilder mit individuellen Bewegungs-
  Zuständen (nicht synchron, unregelmäßig, Koi taucht ab/auf)
- Nebel, Lichtstrahlen, fallende Blätter, perspektivische Wasserringe
- Menü-Toggle (UI ausblendbar)
- Mobile/Touch-Hardening (100dvh, safe-area, touch-action, kein Scroll-Bounce)
- `prefers-reduced-motion` wird respektiert (JS + CSS-Fallback)
- Chronicle: echte `encounter`-Einträge (isFirst/isReturn), einmal pro Sitzung
- GitHub Pages Deployment (live unter drachenhaar.github.io/Traum)
- "Das Buch öffnen" verdrahtet: zeigt die eigenen gespeicherten Gedanken in
  einem Buch-Overlay (`book.js`), dazu ein dauerhaftes Buch-Icon zum
  Wiederöffnen, ohne die Intro-Sequenz erneut durchlaufen zu müssen
- Bugfix: Hintergrund wurde per `background-size: cover` bildschirmformat-
  abhängig zugeschnitten, wodurch Prozent-Positionen (Wasserringe, Koi,
  Libelle) auf schmalen Screens nicht mehr zum tatsächlichen Bildinhalt
  passten. Jetzt läuft alles über `worldstage.js`: eine Bühne in echter
  Bildgröße, die auf schmalen Screens breiter als der Viewport ist und
  sich per Wisch-/Ziehgeste horizontal verschieben lässt – löst beides:
  korrekte Positionen unabhängig vom Seitenverhältnis, und Mobile kann
  jetzt links/rechts wischen, um die abgeschnittenen Bildteile zu sehen
- Orte-Gerüst: `places.js` (Datenmodell), `placesui.js` (Karten-Rendering),
  `worldstage.js` kann den Hintergrund jetzt zur Laufzeit wechseln
  (`setImage`). Karten-Seite im Buch (Tab "Orte") zeigt Der stille See
  (aktiv), Die Bibliothek und Das Tal (beide "entsteht noch", grau,
  nicht klickbar) – sobald echtes Artwork da ist, reicht `available:true`
  + Bildpfad in `places.js`, Rest funktioniert bereits (getestet mit
  Platzhalter-Bild: Wechsel, Hervorhebung, Persistenz über Reload)
- Artwork für Die Bibliothek und Das Tal ergänzt (`library.png`,
  `valley.png`), beide jetzt `available: true` und live durchgetestet
  (Ort-Wechsel, Hervorhebung im Buch, Darstellung im World-Stage)
- Artwork für Die Gedankenkuppel ergänzt (`thoughtdome.png`), jetzt
  vierter aktiver Ort – alle vier Orte (See, Bibliothek, Tal,
  Gedankenkuppel) sind jetzt vollständig nutzbar

## Nächste Kandidaten (klein, auf jetziger Basis machbar)

- [ ] Einfache Chronik-Ansicht: bisher nur unsichtbar in localStorage – ein
      ruhiger Buch-artiger Screen, der die letzten Chronik-Einträge zeigt
- [ ] Tag/Nacht- bzw. Tageszeit-Lichtstimmung: Hintergrund/Filter dezent an
      die echte Uhrzeit des Nutzers anpassen (Farbstich, Helligkeit)
- [ ] Favicon ergänzen (kosmetisch, verursacht aktuell einen 404 pro Ladevorgang)
- [ ] Erste, sehr einfache "WorldState"-Datenstruktur (visitCount,
      totalPresenceTime, lastVisitAt) aus den Chronicle-Daten ableiten –
      Grundlage für spätere Resonanz, ohne noch selbst etwas zu verändern

## Größere Bausteine (bewusst vertagt, brauchen eigene Entscheidung)

- [ ] Kreaturenbuch: Katalog der begegneten Wesen, Infos schalten sich nach
      wiederholter Begegnung frei (Silhouette → Art → Verhalten → eigener Name)
- [ ] Resonance Engine: Wahrscheinlichkeiten (Begegnungen, Nebeldichte, Licht)
      abhängig von Anwesenheitsdauer/Rückkehr-Abstand statt fester Timer
- [ ] Audio-Schichten (Wind, Wasser, entfernte Vögel) – nur nach Nutzer-
      Interaktion startend, einzeln deaktivierbar, keine hörbaren kurzen Loops
- [ ] Pro-Ort-Effekte: aktuell laufen Nebel/Wasserringe/Koi/Libelle/Vogel
      immer, unabhängig vom gewählten Ort (macht in der Bibliothek z. B.
      keinen Sinn) – braucht ein-/ausschaltbare Effekt-Sets pro Ort
- [ ] Gedankenwelt als eigener interaktiver räumlicher Bereich (Außen-/
      Innenansicht, schwebende Gedanken-Cluster) statt nur Eingabefeld +
      gelegentliche Orb-Erinnerung – die "Gedankenkuppel" als Ort (oben)
      ist erstmal nur eine gemalte Szene, kein Ersatz dafür
- [ ] Koloss-Wesen (Drache/Phönix/uralte Schildkröte) – sehr seltene, große,
      kaum bewegte Erscheinungen; erst sinnvoll mit passendem Artwork

## Offene Fragen / brauchen Input von dir

- Willst du weitere Kreaturen-Bilder in Auftrag geben (Prompts kann ich wie
  beim Koi/Libelle/Vogel schreiben), oder bleibt es vorerst bei den drei?
- Soll die Chronik irgendwann sichtbar werden, oder bewusst unsichtbar im
  Hintergrund bleiben (nur Datenbasis für spätere Resonanz)?
