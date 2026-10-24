# Grafiken erzeugen lassen — die Anweisung

Dieses Blatt ist zum Kopieren gedacht. Es übersetzt den Vertrag aus
`scripts/atlas/saetze.mjs` in Sätze, die ein Bildmodell versteht.

---

## Der Weg

```
1.  Bild erzeugen lassen          →  assets/karte/<satz>/roh/<art>_blatt.png
2.  npm run freistellen -- <satz> <art> 8 --blatt
3.  npm run atlas                 ←  hier fällt durch, was nicht passt
```

Mehr passiert nicht. Kein Programmteil ändert sich, keine Kartendaten ändern
sich, und wo keine Datei liegt, zeichnet weiter der Pinsel.

---

## Die wichtigste Entscheidung: **ein Blatt, nicht acht Bilder**

Acht Bäume aus acht Aufrufen haben acht Lichtrichtungen, acht Strichstärken
und acht Größen — jeder für sich gut, zusammen kein Satz. Auf einer Karte
liest sich das als Unruhe, die niemand einem einzelnen Bild zuordnen kann.

Acht Bäume in **einem** Bild sieht das Modell nebeneinander und gleicht sie
an. Danach schneidet `npm run freistellen -- … --blatt` sie auf.

Ungleiche Größen und ungleiche Fußlinien macht der Freisteller gerade — er
passt jedes Motiv einzeln in den Rahmen ein. Was er **nicht** geraderücken
kann, ist die Lichtrichtung. Die muss aus dem Bild kommen.

---

## Der Text

> Erzeuge **ein einziges Bild** mit **acht Bäumen nebeneinander in einer
> Reihe**, gleichmäßig verteilt, mit deutlichem Abstand zueinander.
>
> **Hintergrund:** ein vollkommen **einfarbiges, flaches Mittelgrau**
> (#EDEDE9). Kein Himmel, kein Boden, keine Wiese, keine Wolken, kein
> Farbverlauf, **kein Schlagschatten auf dem Boden**. Der Hintergrund muss
> sich deutlich von jedem Ton im Motiv absetzen.
>
> **Ansicht:** Schrägansicht von vorn, etwa 30° über dem Horizont — so, wie
> man einen Baum sieht, wenn man zwanzig Schritte entfernt steht. Nicht von
> oben, nicht in reiner Seitenansicht. **Alle acht aus demselben Blickwinkel.**
>
> **Licht:** ein einziges Hauptlicht von **links oben**, etwa 40° hoch. Die
> linke Seite jedes Baumes ist hell, die rechte liegt im Schatten. Bei allen
> acht gleich. Kein Gegenlicht, kein zweites Licht.
>
> **Stand:** jeder Baum steht aufrecht, der Stammfuß liegt bei allen auf
> **derselben waagerechten Linie**. Kein Baum schwebt, keiner ist
> angeschnitten.
>
> **Stil:** ruhige, gedeckte Buchillustration — wie eine handgezeichnete
> Landkarte in einem Artbook. Feine Linien, wenige Töne, kein Fotorealismus,
> keine kräftigen Farben, keine Umrisse in Schwarz.
>
> **Farben:** Laub in gedämpftem Graugrün (#7A8467 bis #99A484, Schatten
> #5C6749), Stämme in warmem Braungrau (#6B6047).
>
> **Vielfalt:** vier Nadelbäume und vier Laubbäume, in Höhe und Gestalt
> verschieden, aber erkennbar aus **einer** Hand.
>
> Seitenverhältnis des ganzen Bildes: etwa 6,4 : 1 (acht Felder zu je 0,8 : 1).

---

## Was danach schiefgehen kann — und was die Meldung bedeutet

| Meldung beim Backen | Ursache | Abhilfe |
|---|---|---|
| `das Licht kommt nicht von links oben` | Das Modell hat ein Bild anders beleuchtet. | Dieses eine Feld neu erzeugen, oder das ganze Blatt. |
| `im Satz leuchtet es teils von links, teils von rechts` | Dasselbe, über den Satz gesehen. | Blatt neu erzeugen, Lichtsatz wiederholen. |
| `der Fuß sitzt bei … % der Höhe` | Der Freisteller lief nicht, oder das Bild hat einen Schlagschatten, der als Motiv gilt. | Über `npm run freistellen` gehen; Schlagschatten aus der Anweisung streichen. |
| `Seitenverhältnis … statt …` | Von Hand zugeschnitten. | Den Freisteller machen lassen. |
| `Bild N deckt … %, der Satz im Mittel …` | Ein Baum ist viel dichter oder viel dünner gezeichnet. | Dieses Feld ersetzen. |
| `Feld N ist leer – Hintergrund zu nah am Motiv?` | Der Grund ist zu ähnlich zum Laub. | Grauen Grund verlangen, nicht grünen. |

---

## Warum es einen Prüfer gibt

Ein Bild, das die Regeln bricht, sieht **einzeln tadellos** aus. Es fällt erst
zwischen zweihundert anderen auf — und dann weiß niemand mehr, welches es
war. Das Backen ist der einzige Augenblick, in dem es billig zu finden ist.

Deshalb misst der Prüfer, statt zu mahnen, und `npm run atlas` endet mit 1.
