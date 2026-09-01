# Einbandstrukturen — Bildauftrag für Leonardo.ai

Sechs Texturen: **Leder**, **Elfenbein**, **Stoff** — jede einmal *neu* und
einmal *alt*. Sie werden zu dem, was man in „Mein Buch → Einband-Material"
wählt und was der geschlossene Band im Regal, in der Geburt und auf dem
Schreibtisch trägt.

---

## Zuerst: was der Code mit der Textur macht

Das ist keine Bildergalerie. Die Textur ist ein **Rohstoff**, über den
`coverSurface()` in `src/components/book/CoverBoard.tsx` zwei weitere
Schichten legt:

```
1. SCHATTEN   linear-gradient(150°) — das Licht, von oben links
2. Farbe      der gewählte Einbandton, per blend-mode verrechnet
3. die Textur  ← das hier wird bestellt
```

Daraus folgen vier Anforderungen, und sie sind wichtiger als jedes
Stimmungswort im Prompt:

**1. Flach und gleichmäßig ausgeleuchtet — kein Licht im Bild.**
Die Beleuchtung liefert Schicht 1. Die vorhandene `leather.jpg` verstößt
dagegen: Sie hat einen hellen Lichtsaum auf allen vier Kanten und einen
dunklen Bauch. Im Rendering aller sechs Farben sieht man deshalb ein
*angestrahltes Objekt* statt einer Fläche — und der Saum verdoppelt sich mit
dem Verlauf, der ohnehin darüberliegt. Gesucht ist ein **Materialmuster**,
wie ein Scan: Rand wie Mitte, kein Glanzpunkt, keine Vignette.

**2. In der Mitte der Helligkeit, nicht am dunklen Ende.**
Gemessen liegt `leather.jpg` bei **0,16 mittlerer Leuchtdichte**. Drei der
sechs Farben (`color`-Blend: Waldgrün, Bordeaux, Nachtblau) kommen damit gut
zurecht. Die beiden `multiply`-Farben nicht: **Umbra** — die Vorgabe für
jedes neue Buch — und **Schwarz** ersaufen zu fast strukturlosem Braunschwarz.
Ziel für die neuen Texturen: **mittlere Leuchtdichte etwa 0,40–0,55.** Die
Narbung soll im *Kontrast* sitzen, nicht in der Grundhelligkeit.

**3. Entsättigt.** Die Farbe kommt aus dem Programm — sechs Töne von Umbra bis
Nachtblau, teils per `blend: 'color'`, das *nur* die Helligkeit der Textur
übernimmt. Ein sattbraunes Lederfoto kämpft mit jedem Ton außer Braun. Fast
grau, ein Hauch Wärme — mehr nicht. (`leather.jpg` liegt bei 0,65 Sättigung;
angestrebt sind **unter 0,15**.)

**4. Kein Buch im Bild.** Kein Titel, keine Prägung, keine Bünde, keine Ecken,
keine Schließen, keine Hände, kein Tisch. Das alles zeichnet `CoverFace`
darüber. Bestellt wird ausschließlich die **Oberfläche**.

**Format:** 3:4 hochkant, mindestens 900×1200 (wie die vorhandene Datei). Sie
wird mit `background-size: cover` gelegt, also je nach Gerät beschnitten —
deshalb darf kein einzelnes Merkmal die Mitte beherrschen. Gleichmäßig über
die ganze Fläche.

---

## Die sechs Prompts

Jeder Block ist vollständig – kopieren, einfügen, erzeugen. Der Rahmen, der
die Textur flach und entsättigt hält, steckt bereits in jedem drin.

### 1 · Leder, neu

```
Full frame close-up of brand new fine bookbinding calfskin leather, tight regular pebble grain, crisp unworn surface, soft satin sheen, uniform pore structure, no creases, no wear, flat lay material swatch, shot perpendicular from directly above, completely even diffuse studio lighting edge to edge, no highlights, no shadows, no vignette, no gradient across the frame, surface fills the entire frame, desaturated near-neutral warm grey, mid-grey value range, fine even grain across the whole surface, macro material photography, texture reference sheet, seamless uniform
```

### 2 · Leder, alt

```
Full frame close-up of century-old bookbinding leather, deep irregular grain, fine spiderweb craquelure, softened and slightly polished from handling, subtle patina mottling, a few faint scuffs distributed evenly across the whole surface, no single dominant blemish, flat lay material swatch, shot perpendicular from directly above, completely even diffuse studio lighting edge to edge, no highlights, no shadows, no vignette, no gradient across the frame, surface fills the entire frame, desaturated near-neutral warm grey, mid-grey value range, fine even grain across the whole surface, macro material photography, texture reference sheet, seamless uniform
```

Wichtig ist der Halbsatz „distributed evenly … no single dominant blemish". Ohne ihn
setzt jedes Modell **einen** großen Kratzer in die Mitte — und der stünde dann auf
jedem Buch der Bibliothek an derselben Stelle.

### 3 · Elfenbein, neu

```
Full frame close-up of polished new ivory-toned bone plate, smooth cool surface, very fine parallel growth striations, waxy translucent depth, almost no relief, immaculate, flat lay material swatch, shot perpendicular from directly above, completely even diffuse studio lighting edge to edge, no highlights, no shadows, no vignette, no gradient across the frame, surface fills the entire frame, desaturated near-neutral pale grey, mid-grey value range, fine even grain across the whole surface, macro material photography, texture reference sheet, seamless uniform
```

### 4 · Elfenbein, alt

```
Full frame close-up of antique aged ivory-toned bone plate, fine hairline age cracks in an irregular network, gentle yellowed mottling, worn smooth and slightly uneven, faint darkened lines settled into the cracks, flat lay material swatch, shot perpendicular from directly above, completely even diffuse studio lighting edge to edge, no highlights, no shadows, no vignette, no gradient across the frame, surface fills the entire frame, desaturated near-neutral pale grey, mid-grey value range, fine even grain across the whole surface, macro material photography, texture reference sheet, seamless uniform
```

### 5 · Stoff, neu

```
Full frame close-up of new bookbinding buckram cloth, tight even plain weave, crisp warp and weft clearly visible, matte finish, regular thread spacing, no fraying, flat lay material swatch, shot perpendicular from directly above, completely even diffuse studio lighting edge to edge, no highlights, no shadows, no vignette, no gradient across the frame, surface fills the entire frame, desaturated near-neutral grey, mid-grey value range, fine even grain across the whole surface, macro material photography, texture reference sheet, seamless uniform
```

### 6 · Stoff, alt

```
Full frame close-up of old library buckram book cloth, coarse plain weave gone soft with age, slightly fuzzed and pilled fibres, weave loosened unevenly, faint dust settled between the threads, gently worn all over, flat lay material swatch, shot perpendicular from directly above, completely even diffuse studio lighting edge to edge, no highlights, no shadows, no vignette, no gradient across the frame, surface fills the entire frame, desaturated near-neutral grey, mid-grey value range, fine even grain across the whole surface, macro material photography, texture reference sheet, seamless uniform
```

### Negativ-Prompt — für alle sechs derselbe

```
book, cover, spine, title, text, letters, typography, emboss, gold, foil, ornament, border, frame, edges of object, corners, clasp, hands, table, background, vignette, spotlight, dramatic lighting, rim light, glow, reflection, saturated colour, colourful, blur, depth of field, bokeh, perspective, angle, tilt, 3d render, illustration, painting, watermark, signature
```

---

## Einstellungen

- **Seitenverhältnis 3:4**, hochkant. Auflösung so hoch wie möglich, danach
  auf 900×1200 herunterrechnen — herunterskalieren beruhigt das Korn,
  hochskalieren erfindet welches.
- Ein **photorealistisches Modell**, kein illustratives. Was bei Leonardo
  gerade so heißt, ändert sich; entscheidend ist, dass es Fotografie macht
  und nicht Malerei.
- **Prompt-Treue eher hoch.** Die Vorgaben oben sind Verbote, und Verbote
  brauchen Strenge.
- **Vier Varianten je Material erzeugen und die flachste nehmen** — nicht die
  hübscheste. Die schönste hat fast immer das dramatischste Licht, und
  genau das ist hier der Fehler.

**Die Probe vor dem Einbauen:** Bild in eine Bildbearbeitung, Sättigung auf
null, dann Gradationskurve ansehen. Der Berg soll in der Mitte liegen und
nicht am linken Rand kleben. Kippt die Helligkeit sichtbar von einer Ecke
zur anderen, ist es unbrauchbar, egal wie gut das Material aussieht.

Als JPEG bei Qualität ~82 speichern. Die vorhandene Datei wiegt 188 KB und
liegt im Bündel; sechs Texturen in der Größe sind gut 1 MB, den jeder Aufruf
lädt.

---

## Was danach im Programm zu tun ist

Die Bilder allein reichen nicht — das ist derselbe Punkt wie beim Band, der
drei Ebenen tief lag. Es fehlt:

1. **Ein zweiter Schacht.** `TEXTURES` in `src/lib/textures.ts` kennt heute
   genau ein `leather`. Sechs Texturen brauchen sechs Einträge.
2. **Vier neue Einträge in `COVER_MATERIALS`** (`src/lib/bookIdentity.ts`) und
   je ein Fall in `coverSurface()`. Der Kommentar dort sagt es schon: „Ein
   neues Material braucht einen Eintrag hier und einen Fall dort — sonst
   nichts."
3. **Eine Entscheidung zu *alt* und *neu*.** Zwei Wege:
   - **Sechs Materialien** in der Liste („Leder, neu" / „Leder, alt" …).
     Billig zu bauen, aber die Wahl wird doppelt so lang.
   - **Ein zweiter Schalter** — Material *und* Zustand, zwei Fragen statt
     einer. Sauberer, und der Zustand könnte später von selbst wachsen: ein
     Buch, das lange benutzt wird, altert. `Leaf` führt bereits ein `wear`
     mit, das genau das täte.

   Ich würde den zweiten Weg nehmen, aber das ist deine Wahl — sie ändert,
   wie sich das Buch über Jahre anfühlt, nicht nur, wie es aussieht.
