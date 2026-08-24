/**
 * Das Maß.
 *
 * Eine Setzerei hat ein Maß, und alles auf der Seite richtet sich danach. Was
 * hier steht, ist keine Sammlung von Vorschlägen, sondern die einzige Stelle,
 * an der über Ränder, Zeilenabstände und Schriftgrade entschieden wird. Wer
 * eine Zahl braucht, holt sie hier – wer eine neue erfindet, bricht das
 * Raster, und das sieht man dem Buch an, lange bevor man sagen kann warum.
 *
 * ---
 *
 * **Warum Zahlen und nicht nur CSS.**
 *
 * Die Werte stehen als TypeScript da, weil zwei verschiedene Dinge sie
 * brauchen: das Stilblatt (über CSS-Variablen) und die Bauteile, die rechnen
 * müssen – etwa um zu prüfen, ob ein Bild noch auf die Seite passt. Zwei
 * Wahrheiten über denselben Rand wären die nächste Stelle, die auseinander
 * läuft.
 */

/* ------------------------------------------------------ Grundlinienraster -- */

/**
 * Die eine Einheit, aus der alle senkrechten Abstände gebaut sind.
 *
 * Unter der Seite liegt ein Raster, das niemand sehen soll. Man merkt es erst,
 * wenn es fehlt: Dann steht jeder Abschnitt ein bisschen anders, und die
 * Seite wirkt zusammengeschoben statt gesetzt.
 *
 * 28 Punkte, weil der Lesetext 16 Punkte groß ist – das ergibt einen
 * Zeilenabstand von 1,75. Großzügig genug für ein Buch, nicht so weit, dass
 * der Absatz auseinanderfällt. Und 28 teilt sich sauber in 14 und 7, damit es
 * auch halbe und viertel Schritte gibt.
 */
export const ZEILE = 28;

/** Ein Vielfaches der Grundlinie – so entstehen Abstände, nie frei erfunden. */
export const zeilen = (n: number): number => Math.round(ZEILE * n);

/* -------------------------------------------------------------- Schriftgrade -- */

/**
 * Die Größenhierarchie.
 *
 * Sechs Stufen, mehr nicht. Der Brief sagt es deutlich, und er hat recht: Die
 * Rangfolge soll aus Größe, Abstand, Lage und Kapitälchen entstehen – nicht
 * daraus, dass überall etwas fett gesetzt wird.
 *
 * Der Name bricht als einziger absichtlich aus dem Raster aus. Ein Titel, der
 * sich brav auf die Grundlinie stellt, sieht aus wie eine Überschrift; einer,
 * der sich Luft nimmt, sieht aus wie ein Titel.
 */
export const GRAD = {
  /** DENNISSE – groß, ruhig, gesperrt, nicht fett. */
  name: { px: 40, zeile: 44, sperre: '0.14em' },
  /** CHARAKTERISTISCHER BUCHAUFTRITT – Abschnittstitel mit Haarlinien. */
  abschnitt: { px: 14, zeile: 20, sperre: '0.18em' },
  /** WESEN, ALTER, HERKUNFT – die Rubrik im Nachschlagewerk. */
  rubrik: { px: 11, zeile: 16, sperre: '0.22em' },
  /** Der Lesetext. */
  fliess: { px: 16, zeile: ZEILE, sperre: '0' },
  /** Das Zitat – bekommt mehr Raum als jede Information. */
  zitat: { px: 21, zeile: 32, sperre: '0.005em' },
  /** Randnotizen am äußeren Rand. */
  rand: { px: 12, zeile: 18, sperre: '0.01em' },
  /** Bildunterschriften – klein, ruhig, nah am Bild. */
  bildunter: { px: 11.5, zeile: 16, sperre: '0.02em' },
} as const;

/* ------------------------------------------------------------- Satzspiegel -- */

/**
 * Die Ränder.
 *
 * Der Innenrand am Falz ist breiter als der Außenrand, und der Fußsteg ist der
 * größte von allen. Das ist keine Willkür, sondern der klassische Satzspiegel:
 * Am Falz verschwindet Papier in der Bindung, und unten braucht die Seite
 * einen Stand, sonst kippt der Text aus dem Blatt.
 *
 * Die Zahlen sind Punkte auf dem Telefon. Auf breiteren Geräten wachsen sie
 * mit – siehe `.satz-spiegel` im Stilblatt.
 */
export const STEG = {
  /** Am Falz – etwas breiter. */
  innen: 30,
  /** Zur Schnittkante – hier stehen die Randnotizen. */
  aussen: 34,
  /** Kopfsteg: ruhig, nach dem Kolumnentitel. */
  oben: zeilen(1),
  /** Fußsteg: der großzügigste. „Leere Fläche ist Teil des Inhalts.“ */
  unten: zeilen(2.5),
} as const;

/**
 * Die Zeilenlänge – und warum sie auf dem Telefon nicht einzuhalten ist.
 *
 * Der Auftrag nennt 50 bis 70 Zeichen. Das ist das richtige Maß, und es ist
 * ein **Druckmaß**. Gemessen auf 390 Punkten Breite, mit Innensteg, Außensteg
 * und dem Daumenregister daneben, bleiben 270 Punkte übrig:
 *
 *     15 px  →  44 Zeichen
 *     16 px  →  41 Zeichen
 *     17 px  →  39 Zeichen
 *
 * Wer die 50 erzwingen wollte, müsste den Grad auf etwa 13 Punkte senken – und
 * hätte ein Buch, das man nicht mehr gern liest. Zwischen „50 Zeichen" und
 * „angenehm lesbar" gewinnt das Lesen; 40 Zeichen sind auf einem Telefon die
 * übliche und richtige Spalte.
 *
 * Deshalb ist das Maß hier eine **Obergrenze und keine Zielgröße**: Auf dem
 * Telefon ist die Spalte ohnehin schmaler und die Regel tut nichts. Sobald
 * Breite da ist – iPad, Schreibtisch –, greift sie und verhindert die
 * dreißig Zentimeter lange Zeile, die kein Auge mehr zurückfindet.
 *
 * 28em bei 0,408em je Zeichen sind rund 68 Zeichen.
 */
export const MASS_EM = 28;

/* ------------------------------------------------------------------ Ausgabe -- */

/**
 * Das Maß als CSS-Variablen.
 *
 * Wird einmal an der Wurzel gesetzt. Damit steht dieselbe Zahl im Stilblatt
 * und im Bauteil, ohne sie zweimal zu schreiben.
 */
export function massAlsCss(): Record<string, string> {
  const raus: Record<string, string> = {
    '--satz-raster': `${ZEILE}px`,
    '--satz-mass': `${MASS_EM}em`,
    '--satz-steg-innen': `${STEG.innen}px`,
    '--satz-steg-aussen': `${STEG.aussen}px`,
    '--satz-steg-oben': `${STEG.oben}px`,
    '--satz-steg-unten': `${STEG.unten}px`,
  };
  for (const [name, g] of Object.entries(GRAD)) {
    raus[`--satz-${name}`] = `${g.px}px`;
    raus[`--satz-${name}-zeile`] = `${g.zeile}px`;
    raus[`--satz-${name}-sperre`] = g.sperre;
  }
  return raus;
}
