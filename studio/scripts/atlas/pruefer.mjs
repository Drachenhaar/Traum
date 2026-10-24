/**
 * Der Prüfer – was eine gemalte Grafik einhalten muss.
 *
 * ---
 *
 * **Warum es ihn gibt.**
 *
 * Eine Karte besteht aus hunderten Bildern, die zusammen *eine* Zeichnung
 * ergeben sollen. Das gelingt nicht dadurch, dass jedes Bild für sich gut
 * ist – es gelingt durch Gleichförmigkeit: gleiche Perspektive, gleiches
 * Licht, gleicher Fußpunkt, gleiche Größenverhältnisse.
 *
 * Genau das lässt sich beim Zeichnen am leichtesten verlieren und am
 * schwersten wiederfinden. Ein Bild, dessen Licht von rechts kommt, sieht
 * einzeln tadellos aus und fällt erst zwischen zweihundert anderen auf –
 * und dann weiß niemand mehr, welches von ihnen es war.
 *
 * Deshalb wird jede hereinkommende Datei **gemessen**, nicht angesehen. Was
 * durchfällt, fällt beim Backen durch, mit Namen und Zahl.
 *
 * ---
 *
 * **Was er ausdrücklich nicht prüft.**
 *
 * Ob ein Bild schön ist. Das kann er nicht, und er soll es nicht versuchen.
 * Er prüft den Rahmen, in dem Schönheit zusammenpasst.
 */

/**
 * Ein Bild vermessen.
 *
 * Läuft im Browser, weil dort die Bildpunkte liegen. Zurück kommen Zahlen,
 * keine Urteile – das Urteil fällt `pruefe`.
 */
export function vermesse(bild) {
  const c = document.createElement('canvas');
  c.width = bild.width;
  c.height = bild.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bild, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;

  let obersteZeile = c.height;
  let untersteZeile = -1;
  let linkesteSpalte = c.width;
  let rechtesteSpalte = -1;
  let deckend = 0;

  /* Helligkeit je Hälfte, nur dort, wo das Bild deckt. */
  let hellLinks = 0, zahlLinks = 0, hellRechts = 0, zahlRechts = 0;

  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      const a = d[i + 3];
      if (a < 40) continue;
      deckend++;
      if (y < obersteZeile) obersteZeile = y;
      if (y > untersteZeile) untersteZeile = y;
      if (x < linkesteSpalte) linkesteSpalte = x;
      if (x > rechtesteSpalte) rechtesteSpalte = x;
      /* Wahrgenommene Helligkeit, grob – die Gewichte der Leuchtdichte. */
      const h = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      if (x < c.width / 2) { hellLinks += h; zahlLinks++; }
      else { hellRechts += h; zahlRechts++; }
    }
  }

  if (deckend === 0) {
    return { leer: true, breite: c.width, hoehe: c.height };
  }

  const links = zahlLinks ? hellLinks / zahlLinks : 0;
  const rechts = zahlRechts ? hellRechts / zahlRechts : 0;

  return {
    leer: false,
    breite: c.width,
    hoehe: c.height,
    verhaeltnis: c.width / c.height,
    /* Alles als Anteil, damit es von der Auflösung unabhängig ist. */
    fuss: (untersteZeile + 1) / c.height,
    kopf: obersteZeile / c.height,
    randLinks: linkesteSpalte / c.width,
    randRechts: 1 - (rechtesteSpalte + 1) / c.width,
    deckung: deckend / (c.width * c.height),
    hellLinks: links,
    hellRechts: rechts,
    lichtVorsprung: (links - rechts) / Math.max(1, (links + rechts) / 2),
  };
}

/**
 * Das Urteil.
 *
 * Gibt eine Liste von Beanstandungen zurück – leer heißt bestanden. Jede
 * Beanstandung nennt die gemessene Zahl und die erlaubte, denn „passt nicht"
 * hilft niemandem beim Nachzeichnen.
 */
export function pruefe(mass, soll, vertrag) {
  const klagen = [];
  if (mass.leer) return ['das Bild ist vollständig durchsichtig'];

  if (mass.deckung < vertrag.mindestensDeckung) {
    klagen.push(
      `fast leer: ${(mass.deckung * 100).toFixed(1)} % gedeckt, ` +
      `mindestens ${(vertrag.mindestensDeckung * 100).toFixed(0)} %`,
    );
  }

  const sollVerhaeltnis = soll.breiteZuHoehe;
  const ab = Math.abs(mass.verhaeltnis - sollVerhaeltnis) / sollVerhaeltnis;
  if (ab > vertrag.verhaeltnisAbweichung) {
    klagen.push(
      `Seitenverhältnis ${mass.verhaeltnis.toFixed(2)} statt ${sollVerhaeltnis.toFixed(2)} ` +
      `(± ${(vertrag.verhaeltnisAbweichung * 100).toFixed(0)} %)`,
    );
  }

  if (mass.fuss < vertrag.fussAb) {
    klagen.push(
      `der Fuß sitzt bei ${(mass.fuss * 100).toFixed(0)} % der Höhe, ` +
      `er muss ab ${(vertrag.fussAb * 100).toFixed(0)} % stehen – ` +
      'das Bild schwebt, statt den Boden zu berühren',
    );
  }

  if (mass.kopf < vertrag.randFrei) {
    klagen.push(`oben kein freier Rand (${(mass.kopf * 100).toFixed(1)} %)`);
  }
  if (mass.randLinks < vertrag.randFrei || mass.randRechts < vertrag.randFrei) {
    klagen.push(
      `seitlich kein freier Rand (links ${(mass.randLinks * 100).toFixed(1)} %, ` +
      `rechts ${(mass.randRechts * 100).toFixed(1)} %)`,
    );
  }

  if (vertrag.lichtVonLinks && mass.lichtVorsprung < vertrag.lichtVorsprung) {
    klagen.push(
      `das Licht kommt nicht von links oben: links ${mass.hellLinks.toFixed(0)}, ` +
      `rechts ${mass.hellRechts.toFixed(0)} – Vorsprung ${(mass.lichtVorsprung * 100).toFixed(1)} %, ` +
      `nötig ${(vertrag.lichtVorsprung * 100).toFixed(1)} %`,
    );
  }

  return klagen;
}

/**
 * Und die Probe auf den **Satz**, nicht auf das einzelne Bild.
 *
 * Acht Bäume, von denen jeder für sich passt, können trotzdem nicht
 * zusammengehören: wenn einer doppelt so dicht gezeichnet ist wie die
 * anderen, oder wenn die Fußpunkte um ein Zehntel auseinanderliegen. Auf
 * der Karte liest sich das als Unruhe, die niemand einem einzelnen Bild
 * zuordnen kann.
 */
export function pruefeSatz(masse, vertrag) {
  const klagen = [];
  const echte = masse.filter((m) => m && !m.leer);
  if (echte.length < 2) return klagen;

  const spanne = (werte) => Math.max(...werte) - Math.min(...werte);

  const fuesse = spanne(echte.map((m) => m.fuss));
  if (fuesse > 0.06) {
    klagen.push(`die Fußpunkte liegen ${(fuesse * 100).toFixed(0)} % auseinander (höchstens 6 %)`);
  }

  const deckungen = echte.map((m) => m.deckung);
  const mittel = deckungen.reduce((a, b) => a + b, 0) / deckungen.length;
  for (let i = 0; i < echte.length; i++) {
    if (deckungen[i] > mittel * 2.2 || deckungen[i] < mittel / 2.2) {
      klagen.push(
        `Bild ${i} deckt ${(deckungen[i] * 100).toFixed(1)} %, der Satz im Mittel ` +
        `${(mittel * 100).toFixed(1)} % – es gehört sichtbar nicht dazu`,
      );
    }
  }

  const vorspruenge = echte.map((m) => m.lichtVorsprung);
  if (Math.min(...vorspruenge) < 0 && Math.max(...vorspruenge) > 0) {
    klagen.push('im Satz leuchtet es teils von links, teils von rechts');
  }

  return klagen;
}
