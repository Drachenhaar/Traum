# Stättenwerk – erster unabhängiger Technikversuch

## Ziel

Eine ruhige Dragoncore-Szene mit verschiebbaren einzelnen Häusern statt eines fertigen Wimmelbilds. Der Versuch ist **kein** fertiger Kartenrenderer und verändert weder `Kartendokument` noch `IndexedDB`.

## Öffnen

`demo.html` in einem Browser öffnen. Enthält ausschließlich Canvas-2D, CSS und JavaScript; keine Bibliotheken, kein Netzwerk. Auf dem iPhone mit Safari testbar, wenn die Datei über einen Webserver ausgeliefert wird.

## Schon erlebbar

- Drei Häuser als separate Objekte mit festem Fußpunkt.
- Drag per Finger/Maus und einfache Tiefensortierung anhand der Y-Koordinate.
- Weitere Häuser hinzufügen; Zurücksetzen und Abendlicht schalten.
- Ruhiges Umfeld: ein Weg, eine Wasserfläche, zwei Bäume, eine Brücke.
- Reduzierte Farbpalette und viel Freiraum; kein Wimmelbild.

## Bewusste Grenzen

- Gebäude sind **prozedural gezeichnete Platzhalter** statt gemalter freigestellter Dragoncore-Assets.
- Hintergrund ist statisch; kein Zoom, keine Kachelpipeline, keine dauerhafte Speicherung.
- Mobile FPS, Gesten, Hitboxen und Farbwiedergabe müssen vor Integration am tatsächlichen iPhone überprüft werden.
- Der bestehende `studio/src/lib/kartenwerk`-Kachelrenderer wird hier **nicht** ersetzt.

## Integration: folgende kontrollierte Schritte

1. Ein `Stättenobjekt` mit stabiler ID, Fußpunkt, Stilvariante und Bezug zum zugehörigen Eintrag **im bestehenden Kartendokument**, optional und heilbar speichern. Das ist etwas anderes als das Siedlungssymbol (`Kartenmarke`). Datenmodell, `heileKarte` und Zod/Sicherungen gemeinsam ändern, um keinen Verlust zu riskieren.
2. Stättenobjekte als `Staffage` mit `EBENE.bauwerk` in `streuwerk.ts` in globaler Tiefensortierung einhängen.
3. Zeichnung durch Stilbuch (`art: 'bauwerk'`) liefern; wo keine gemalte Grafik existiert, Pinsel-Fallback. Import via bestehendem Atlas-Vertrag.
4. Kachel-Invaliderung anhand alter/neuer Gebäudebox, inklusive Überstand; nie die ganze Welt bei einem versetzten Haus neu zeichnen.
5. Touch-Ziehen und Auswahl mit passender Fangfläche am vorhandenen `Weltkarte.tsx` anbinden; Ein-Finger-Zeichnen/ Zwei-Finger-Schieben ausdrücklich erhalten.
6. Regressionstests für Alt-Karten, Speichern/Wiederherstellen, zwei übereinanderliegende Häuser und mobile Kachelperformance.

## Stilregel

**Ruhe ist der Normalzustand, Magie der besondere Moment.** Die Atmosphäre kommt aus Raum, Licht, Material und maßvollen Details – nicht aus der Zahl der Gegenstände.