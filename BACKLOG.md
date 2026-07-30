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
- Pro-Ort-Effekte (`effects.js`): Nebel/Lichtstrahlen/Wasserringe/Blätter/
  Koi/Libelle/Vogel/Wasserschimmer laufen jetzt nur noch dort, wo sie
  passen. See: alles an. Tal: Nebel/Strahlen/Blätter/Vogel, kein Wasser
  (kein stiller See in der Szene). Bibliothek/Gedankenkuppel: nur die
  Orbs, kein Nebel/Wasser/Getier – dort tragen die gemalten Details
  (Kerzenlicht, Sternenhimmel) die Stimmung schon allein. Fog/Rays/
  Wasserringe/Blätter/Kreaturen sind jetzt sauber start-/stoppbar
  (jedes Modul liefert `{stop()}`), getestet über alle vier Orte inkl.
  Rückwechsel zum See ohne Dopplungen oder Element-Reste
- Chronik-Ansicht: neuer Tab "Chronik" im Buch (`chronicleui.js`), macht die
  bisher unsichtbaren Chronicle-Daten als ruhige, erzählende Sätze sichtbar
  (Anwesenheit, Stille, geborene Gedanken mit Zitat, Begegnungen mit
  Erstmal/Rückkehr-Unterscheidung), neueste zuerst, mit eigenem Leerzustand-
  Text ("Noch nichts zu erzählen…") solange keine Einträge vorliegen
- Chronik nach Tagen gruppiert (Zwischenüberschriften "Heute"/"Gestern"/
  volles Datum), Einträge zeigen darunter nur noch die Uhrzeit statt des
  vollen Datums – deutlich übersichtlicher bei vielen Einträgen
- Notizbuch: neuer Tab "Notizen" im Buch (`checklist.js`/`checklistui.js`),
  eine einfache Checkliste zum Abhaken – Eintrag über ein Textfeld
  hinzufügen (Enter), per Klick auf das Kästchen abhaken (durchgestrichen,
  bleibt sichtbar), per ✕ entfernen, persistiert in localStorage
- Parallax-Tiefe beim Wischen/Ziehen (`worldstage.js`): Nebel und
  Lichtstrahlen (ferne Atmosphäre) bewegen sich beim Pannen langsamer als
  der Hintergrund, fallende Blätter (Vordergrund) schneller – klassischer
  Multiplane-Trick für mehr Tiefe, ohne neue Bild-Assets. Hintergrund,
  Wasserglanz, Wasserringe und Kreaturen bleiben bewusst unverändert
  (1:1 mit dem Hintergrund), da ihre Positionen an konkrete Bildinhalte
  gebunden sind
- Wasserfall-Animation am Stillen See (`waterfall.js`): die beiden gemalten
  Wasserfälle bekommen einen endlos abwärts fließenden Schimmer
  (`mix-blend-mode: screen`), nur am See aktiv, bleibt wie Wasserringe/
  Kreaturen 1:1 mit dem Hintergrund (kein Parallax). Nach mehreren
  Anpassungsrunden (Rechteck wirkte klobig, dann einzelne Stränge) folgt
  der Effekt jetzt einer aus dem Originalbild abgeleiteten Pixel-Maske
  (`see-waterfall-mask.png`, Helligkeit/Sättigung pro Pixel klassifiziert,
  als Alpha-Kanal codiert) – der Schimmer scheint nur exakt dort durch,
  wo im Bild tatsächlich Wasser zu sehen ist, bis auf einzelne
  Tropfenspuren genau

- Werkzeug-Checkliste (`praxis/toolkit.js`/`praxis/toolkitui.js`):
  praktisches Werkzeug, drei Unter-Ansichten: Gerichte (Name, Kategorie
  Markt/Catering/frei erweiterbar, benötigte Werkzeuge mit Stückzahl je
  Gericht pflegen), Bestand (Gesamtstückzahl je Werkzeug), Packliste
  (Gerichte + Anzahl für einen Termin auswählen, App zeigt Bedarf vs.
  Bestand inkl. Fehlmengen-Warnung und zieht auf Knopfdruck ab, mit Verlauf
  der letzten Abzüge). Persistiert in localStorage
- Kasse & Tische (`praxis/kasse.js`/`praxis/kasseui.js`): ein Tischsystem
  wie bei orderbird, aber bewusst nur als Notizblock: keine echte
  Zahlungsabwicklung, sondern Vorbereitung dessen, was später an der
  echten Kasse eingebongt wird. Drei Unter-Ansichten: Tische (Kachel-Grid,
  frei/belegt farblich unterschieden, neue Tische anlegen, Tisch antippen
  öffnet Detailansicht mit Bestellliste, Mengen-Stepper pro Position,
  laufender Summe, Notizfeld für Sonderwünsche und Artikel-Schnellwahl
  gefiltert nach Kategorie), Artikel (Katalog mit Name/Preis/Kategorie,
  frei erweiterbare Kategorien wie beim Werkzeug), Verlauf (Bons, die per
  "An der Kasse eingebongt & Tisch leeren" aus einem Tisch übertragen
  wurden – der Tisch wird dabei geleert/wieder frei, der Bon bleibt zur
  Kontrolle im Verlauf und lässt sich danach löschen). Persistiert in
  localStorage
- Werkzeuge & Kasse aus Dragoncore in eine eigenständige App unter
  `praxis/` ausgelagert: eigenes helles Praxis-Design ohne
  Traumwelt-Bezug, eigener Einstieg (`praxis/index.html`) statt Tabs im
  Buch-Overlay. Dragoncores Buch hat dadurch wieder nur die vier
  thematischen Tabs Gedanken/Chronik/Orte/Notizen
- Kasse: Kategorien selbst verwalten (Artikel-Tab, neuer Abschnitt
  "Kategorien verwalten") – Liste aller Kategorien mit Artikel-Anzahl,
  Umbenennen wirkt sich sofort auf alle zugehörigen Artikel aus (merged
  automatisch, falls der neue Name schon existiert), Löschen nur möglich
  wenn kein Artikel mehr in der Kategorie steckt (sonst Hinweis statt
  Löschung)

## Nächste Kandidaten (klein, auf jetziger Basis machbar)

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
- [ ] Gedankenwelt als eigener interaktiver räumlicher Bereich (Außen-/
      Innenansicht, schwebende Gedanken-Cluster) statt nur Eingabefeld +
      gelegentliche Orb-Erinnerung – die "Gedankenkuppel" als Ort (oben)
      ist erstmal nur eine gemalte Szene, kein Ersatz dafür
- [ ] Koloss-Wesen (Drache/Phönix/uralte Schildkröte) – sehr seltene, große,
      kaum bewegte Erscheinungen; erst sinnvoll mit passendem Artwork

## Offene Fragen / brauchen Input von dir

- Willst du weitere Kreaturen-Bilder in Auftrag geben (Prompts kann ich wie
  beim Koi/Libelle/Vogel schreiben), oder bleibt es vorerst bei den drei?
