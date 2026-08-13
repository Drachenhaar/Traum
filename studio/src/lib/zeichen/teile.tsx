/**
 * Die Teile, aus denen ein Zeichen entsteht.
 *
 * Eine Ablage, kein Bildschirm. Jedes Teil steht genau einmal hier, und die
 * Werkstatt liest diese Liste – sie kennt kein einziges Symbol beim Namen.
 * Ein neues Teil ist ein Eintrag und sonst nichts.
 *
 * **Alles ohne Farbe.** Jede Linie erbt `currentColor`, keine Fläche trägt
 * einen Wert. Das ist die Trennung, die der Auftrag verlangt und die dieses
 * Buch schon hatte: Die Geometrie beschreibt die Form, der Einband entscheidet,
 * ob sie in Gold, in Tinte oder als Prägung im Leder erscheint. Ein Zeichen,
 * das seine Farbe mitbringt, müsste für jedes Material neu gezeichnet werden.
 *
 * **Alles im selben Feld von 100 × 100**, Mittelpunkt bei 50/50. Nur dadurch
 * lassen sich Teile übereinanderlegen, ohne dass jedes einzeln eingepasst
 * werden muss – und nur dadurch bedeutet `scale: 0.72` bei jedem Teil
 * dasselbe.
 *
 * **Linien, keine Flächen.** Ein geprägtes Siegel lebt von der Kante. Eine
 * gefüllte Silhouette sieht am Bildschirm satter aus und wird auf Leder zu
 * einem Fleck.
 */

import type { ReactNode } from 'react';

export type Teilart = 'form' | 'rahmen' | 'symbol';

export interface Teil {
  id: string;
  label: string;
  art: Teilart;
  /** Nur bei Symbolen: wonach man sucht. */
  gruppe?: 'kreatur' | 'natur' | 'ding' | 'zeichen';
  zeichnung: ReactNode;
  /**
   * Wo dieses Teil gern steht, wenn die Inspiration es dazulegt.
   *
   * Nur ein Wunsch, keine Regel – der Verfasser schiebt danach, wohin er will.
   * Ohne solche Wünsche würfelt die Inspiration Sterne in Bauchhöhe und Kronen
   * unter die Füße, und das Ergebnis wäre der Beweis, dass Zufall allein nicht
   * reicht.
   */
  gernOben?: boolean;
  gernHinten?: boolean;
}

/* Kurzschreibweisen – die Datei besteht sonst zu drei Vierteln aus Attributen. */
const S = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const p = (d: string, w = 3) => <path d={d} strokeWidth={w} {...S} />;
const kreis = (cx: number, cy: number, r: number, w = 3) => (
  <circle cx={cx} cy={cy} r={r} strokeWidth={w} {...S} />
);

/* ------------------------------------------------------------- Formen ---- */

export const FORMEN: Teil[] = [
  { id: 'keine', label: 'Ohne Form', art: 'form', zeichnung: null },
  { id: 'kreis', label: 'Kreis', art: 'form', zeichnung: kreis(50, 50, 38) },
  {
    id: 'oval',
    label: 'Oval',
    art: 'form',
    zeichnung: <ellipse cx={50} cy={50} rx={30} ry={40} strokeWidth={3} {...S} />,
  },
  {
    id: 'quadrat',
    label: 'Quadrat',
    art: 'form',
    zeichnung: <rect x={15} y={15} width={70} height={70} rx={4} strokeWidth={3} {...S} />,
  },
  { id: 'raute', label: 'Raute', art: 'form', zeichnung: p('M50 10 L88 50 L50 90 L12 50 Z') },
  {
    id: 'schild',
    label: 'Schild',
    art: 'form',
    zeichnung: p('M18 16 H82 V52 Q82 76 50 90 Q18 76 18 52 Z'),
  },
  {
    id: 'langschild',
    label: 'Langes Schild',
    art: 'form',
    zeichnung: p('M26 8 H74 V58 Q74 82 50 94 Q26 82 26 58 Z'),
  },
  {
    id: 'wappen',
    label: 'Wappen',
    art: 'form',
    /* Die Kerbe oben macht aus einem Schild ein Wappen – ein Zug, mehr nicht. */
    zeichnung: p('M18 14 H44 L50 22 L56 14 H82 V54 Q82 78 50 92 Q18 78 18 54 Z'),
  },
  { id: 'sechseck', label: 'Sechseck', art: 'form', zeichnung: p('M50 10 L85 30 V70 L50 90 L15 70 V30 Z') },
  {
    id: 'achteck',
    label: 'Achteck',
    art: 'form',
    zeichnung: p('M35 12 H65 L88 35 V65 L65 88 H35 L12 65 V35 Z'),
  },
  {
    id: 'offen',
    label: 'Offene Form',
    art: 'form',
    /* Unten offen – ein Zeichen, das nicht eingeschlossen sein will. */
    zeichnung: p('M22 82 V40 Q22 12 50 12 Q78 12 78 40 V82'),
  },
];

/* ------------------------------------------------------------- Rahmen ---- */

/** Gleichmäßig verteilte Punkte auf einem Kreis – für Ringe mit Kerben. */
function ring(n: number, r: number, zeichne: (x: number, y: number, i: number) => ReactNode) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return <g key={i}>{zeichne(50 + Math.cos(a) * r, 50 + Math.sin(a) * r, i)}</g>;
  });
}

export const RAHMEN: Teil[] = [
  { id: 'keiner', label: 'Ohne Rahmen', art: 'rahmen', zeichnung: null },
  { id: 'ring', label: 'Ring', art: 'rahmen', zeichnung: kreis(50, 50, 46, 2) },
  {
    id: 'doppelring',
    label: 'Doppelring',
    art: 'rahmen',
    zeichnung: (
      <>
        {kreis(50, 50, 46, 2)}
        {kreis(50, 50, 41, 1.2)}
      </>
    ),
  },
  {
    id: 'ring-offen',
    label: 'Unterbrochener Ring',
    art: 'rahmen',
    zeichnung: (
      <circle
        cx={50}
        cy={50}
        r={46}
        strokeWidth={2.4}
        strokeDasharray="14 7"
        {...S}
      />
    ),
  },
  {
    id: 'runenring',
    label: 'Runenring',
    art: 'rahmen',
    zeichnung: (
      <>
        {kreis(50, 50, 46, 1.6)}
        {ring(16, 41, (x, y) => <circle cx={x} cy={y} r={1.4} strokeWidth={0} fill="currentColor" />)}
      </>
    ),
  },
  {
    id: 'dornen',
    label: 'Dornen',
    art: 'rahmen',
    zeichnung: (
      <>
        {kreis(50, 50, 42, 1.8)}
        {ring(12, 42, (x, y, i) => {
          const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
          return p(
            `M${x} ${y} L${50 + Math.cos(a) * 50} ${50 + Math.sin(a) * 50}`,
            1.6,
          );
        })}
      </>
    ),
  },
  {
    id: 'aeste',
    label: 'Äste',
    art: 'rahmen',
    /* Zwei Bögen statt eines Rings: ein Kranz ist unten offen. */
    zeichnung: (
      <>
        {p('M20 72 Q10 44 30 22', 2)}
        {p('M80 72 Q90 44 70 22', 2)}
        {ring(5, 38, (x, y) => (y > 30 ? p(`M${x} ${y} l-5 -4`, 1.4) : null))}
      </>
    ),
  },
  {
    id: 'geometrisch',
    label: 'Geometrischer Ring',
    art: 'rahmen',
    zeichnung: (
      <>
        {p('M50 6 L88 28 V72 L50 94 L12 72 V28 Z', 2)}
        {kreis(50, 50, 34, 1)}
      </>
    ),
  },
  {
    id: 'ornament',
    label: 'Ornamentrahmen',
    art: 'rahmen',
    zeichnung: (
      <>
        {kreis(50, 50, 44, 1.4)}
        {ring(8, 44, (x, y) => kreis(x, y, 4, 1.4))}
      </>
    ),
  },
  {
    id: 'wappenrand-schmal',
    label: 'Schmaler Wappenrand',
    art: 'rahmen',
    zeichnung: p('M10 8 H90 V54 Q90 82 50 98 Q10 82 10 54 Z', 1.6),
  },
  {
    id: 'wappenrand-breit',
    label: 'Breiter Wappenrand',
    art: 'rahmen',
    zeichnung: (
      <>
        {p('M8 6 H92 V55 Q92 84 50 100 Q8 84 8 55 Z', 3.4)}
        {p('M15 13 H85 V54 Q85 78 50 92 Q15 78 15 54 Z', 1)}
      </>
    ),
  },
  {
    id: 'strahlen',
    label: 'Strahlenkranz',
    art: 'rahmen',
    zeichnung: ring(24, 40, (x, y, i) => {
      const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
      const l = i % 2 ? 6 : 10;
      return p(`M${x} ${y} L${x + Math.cos(a) * l} ${y + Math.sin(a) * l}`, 1.6);
    }),
  },
];

/* ------------------------------------------------------------ Symbole ---- */

export const SYMBOLE: Teil[] = [
  /* ------------------------------------------------------------ Kreaturen */
  {
    id: 'drache',
    label: 'Drache',
    art: 'symbol',
    gruppe: 'kreatur',
    /* Kopf im Profil mit zwei zurückgeschwungenen Hörnern – die Silhouette trägt. */
    zeichnung: (
      <>
        {p('M28 62 Q30 40 48 34 Q64 29 74 38 L86 34 L78 46 Q80 60 66 66 L52 70 Q34 74 28 62 Z')}
        {p('M48 34 Q40 20 26 18 Q36 26 38 36', 2.2)}
        {p('M60 31 Q56 18 44 12 Q54 22 54 32', 2.2)}
        <circle cx={68} cy={44} r={2.2} fill="currentColor" strokeWidth={0} />
      </>
    ),
  },
  {
    id: 'wolf',
    label: 'Wolf',
    art: 'symbol',
    gruppe: 'kreatur',
    zeichnung: (
      <>
        {p('M26 34 L34 52 Q34 76 50 84 Q66 76 66 52 L74 34 L60 42 H40 Z')}
        <circle cx={43} cy={56} r={2} fill="currentColor" strokeWidth={0} />
        <circle cx={57} cy={56} r={2} fill="currentColor" strokeWidth={0} />
        {p('M50 66 L46 72 h8 Z', 2)}
      </>
    ),
  },
  {
    id: 'rabe',
    label: 'Rabe',
    art: 'symbol',
    gruppe: 'kreatur',
    zeichnung: (
      <>
        {p('M30 70 Q28 44 48 36 Q62 30 70 34 L82 30 L74 40 Q76 58 58 68 Z')}
        {p('M48 36 Q40 52 44 68', 2)}
        <circle cx={66} cy={38} r={1.8} fill="currentColor" strokeWidth={0} />
      </>
    ),
  },
  {
    id: 'hirsch',
    label: 'Hirsch',
    art: 'symbol',
    gruppe: 'kreatur',
    zeichnung: (
      <>
        {p('M40 56 Q40 76 50 82 Q60 76 60 56 Q60 46 50 44 Q40 46 40 56 Z')}
        {p('M43 44 Q34 30 22 24 M43 44 Q38 32 30 34 M43 44 Q40 26 34 18', 2)}
        {p('M57 44 Q66 30 78 24 M57 44 Q62 32 70 34 M57 44 Q60 26 66 18', 2)}
      </>
    ),
  },
  {
    id: 'schlange',
    label: 'Schlange',
    art: 'symbol',
    gruppe: 'kreatur',
    zeichnung: p('M24 74 Q24 54 42 54 Q60 54 60 40 Q60 26 46 26 Q34 26 34 36'),
  },
  {
    id: 'fisch',
    label: 'Fisch',
    art: 'symbol',
    gruppe: 'kreatur',
    zeichnung: (
      <>
        {p('M22 50 Q42 30 66 50 Q42 70 22 50 Z')}
        {p('M66 50 L82 38 V62 Z')}
        <circle cx={34} cy={47} r={1.8} fill="currentColor" strokeWidth={0} />
      </>
    ),
  },
  {
    id: 'falke',
    label: 'Falke',
    art: 'symbol',
    gruppe: 'kreatur',
    zeichnung: (
      <>
        {p('M50 34 V72')}
        {p('M50 40 Q28 34 14 48 Q34 46 48 58')}
        {p('M50 40 Q72 34 86 48 Q66 46 52 58')}
      </>
    ),
  },

  /* ---------------------------------------------------------------- Natur */
  {
    id: 'baum',
    label: 'Baum',
    art: 'symbol',
    gruppe: 'natur',
    zeichnung: (
      <>
        {p('M50 86 V44')}
        {kreis(50, 38, 24, 2.6)}
        {p('M50 58 L34 44 M50 52 L66 38 M50 68 L38 58', 2)}
      </>
    ),
  },
  {
    id: 'blatt',
    label: 'Blatt',
    art: 'symbol',
    gruppe: 'natur',
    zeichnung: (
      <>
        {p('M50 84 Q22 62 30 32 Q60 26 72 46 Q80 70 50 84 Z')}
        {p('M50 84 Q50 54 44 36', 2)}
      </>
    ),
  },
  {
    id: 'berg',
    label: 'Berg',
    art: 'symbol',
    gruppe: 'natur',
    zeichnung: (
      <>
        {p('M14 76 L38 34 L52 56 L64 40 L86 76 Z')}
        {p('M30 54 L38 46 L44 54', 2)}
      </>
    ),
  },
  {
    id: 'welle',
    label: 'Welle',
    art: 'symbol',
    gruppe: 'natur',
    zeichnung: p('M14 56 Q26 42 38 56 T62 56 T86 56 M14 72 Q26 58 38 72 T62 72 T86 72'),
  },
  {
    id: 'flamme',
    label: 'Flamme',
    art: 'symbol',
    gruppe: 'natur',
    zeichnung: (
      <>
        {p('M50 84 Q24 70 32 44 Q38 26 50 14 Q56 34 66 40 Q78 52 68 70 Q62 80 50 84 Z')}
        {p('M50 78 Q40 68 46 56 Q52 48 54 40 Q60 56 56 66 Q54 74 50 78 Z', 2)}
      </>
    ),
  },
  {
    id: 'sonne',
    label: 'Sonne',
    art: 'symbol',
    gruppe: 'natur',
    zeichnung: (
      <>
        {kreis(50, 50, 18, 2.6)}
        {ring(12, 28, (x, y, i) => {
          const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
          return p(`M${x} ${y} L${50 + Math.cos(a) * 38} ${50 + Math.sin(a) * 38}`, 2);
        })}
      </>
    ),
  },
  {
    id: 'mond',
    label: 'Mond',
    art: 'symbol',
    gruppe: 'natur',
    gernHinten: true,
    zeichnung: p('M62 16 Q34 24 34 50 Q34 76 62 84 Q38 78 38 50 Q38 22 62 16 Z'),
  },
  {
    id: 'stern',
    label: 'Stern',
    art: 'symbol',
    gruppe: 'natur',
    gernOben: true,
    zeichnung: p('M50 18 L58 42 L84 42 L63 57 L71 82 L50 66 L29 82 L37 57 L16 42 L42 42 Z', 2.4),
  },
  {
    id: 'kristall',
    label: 'Kristall',
    art: 'symbol',
    gruppe: 'natur',
    zeichnung: (
      <>
        {p('M50 12 L74 40 L62 84 H38 L26 40 Z')}
        {p('M26 40 H74 M50 12 V84', 1.6)}
      </>
    ),
  },
  {
    id: 'bluete',
    label: 'Blüte',
    art: 'symbol',
    gruppe: 'natur',
    zeichnung: (
      <>
        {ring(6, 20, (x, y) => kreis(x, y, 13, 2))}
        {kreis(50, 50, 6, 2)}
      </>
    ),
  },

  /* ----------------------------------------------------------------- Ding */
  {
    id: 'schwert',
    label: 'Schwert',
    art: 'symbol',
    gruppe: 'ding',
    zeichnung: (
      <>
        {p('M50 8 L56 26 V62 H44 V26 Z')}
        {p('M30 62 H70', 3.4)}
        {p('M50 62 V88 M42 84 H58', 3)}
      </>
    ),
  },
  {
    id: 'schluessel',
    label: 'Schlüssel',
    art: 'symbol',
    gruppe: 'ding',
    zeichnung: (
      <>
        {kreis(50, 26, 14, 3)}
        {p('M50 40 V86 M50 62 H66 M50 74 H62')}
      </>
    ),
  },
  {
    id: 'krone',
    label: 'Krone',
    art: 'symbol',
    gruppe: 'ding',
    gernOben: true,
    zeichnung: (
      <>
        {p('M18 72 L24 32 L37 50 L50 24 L63 50 L76 32 L82 72 Z')}
        {p('M18 80 H82', 3)}
      </>
    ),
  },
  {
    id: 'buch',
    label: 'Buch',
    art: 'symbol',
    gruppe: 'ding',
    zeichnung: (
      <>
        {p('M14 24 Q32 18 50 26 Q68 18 86 24 V78 Q68 72 50 80 Q32 72 14 78 Z')}
        {p('M50 26 V80', 2)}
      </>
    ),
  },
  {
    id: 'feder',
    label: 'Feder',
    art: 'symbol',
    gruppe: 'ding',
    zeichnung: (
      <>
        {p('M82 16 Q46 24 32 56 Q26 70 24 84')}
        {p('M82 16 Q56 18 42 44 Q34 60 30 76 Q54 74 68 54 Q78 40 82 16 Z', 2.2)}
      </>
    ),
  },
  {
    id: 'laterne',
    label: 'Laterne',
    art: 'symbol',
    gruppe: 'ding',
    zeichnung: (
      <>
        {p('M38 32 H62 L68 74 H32 Z')}
        {p('M34 32 H66 M36 74 H64', 2.4)}
        {p('M50 32 V18 Q50 10 42 10', 2)}
        {kreis(50, 52, 8, 2)}
      </>
    ),
  },
  {
    id: 'kompass',
    label: 'Kompass',
    art: 'symbol',
    gruppe: 'ding',
    zeichnung: (
      <>
        {kreis(50, 50, 32, 2.6)}
        {p('M50 22 L58 50 L50 78 L42 50 Z', 2)}
      </>
    ),
  },
  {
    id: 'kelch',
    label: 'Kelch',
    art: 'symbol',
    gruppe: 'ding',
    zeichnung: (
      <>
        {p('M30 22 H70 Q70 52 50 58 Q30 52 30 22 Z')}
        {p('M50 58 V78 M34 84 H66', 3)}
      </>
    ),
  },
  {
    id: 'hammer',
    label: 'Hammer',
    art: 'symbol',
    gruppe: 'ding',
    zeichnung: (
      <>
        {p('M26 22 H74 V44 H26 Z')}
        {p('M50 44 V86', 3.4)}
      </>
    ),
  },

  /* --------------------------------------------------------------- Zeichen */
  {
    id: 'auge',
    label: 'Auge',
    art: 'symbol',
    gruppe: 'zeichen',
    zeichnung: (
      <>
        {p('M12 50 Q50 20 88 50 Q50 80 12 50 Z')}
        {kreis(50, 50, 12, 2.6)}
        <circle cx={50} cy={50} r={4} fill="currentColor" strokeWidth={0} />
      </>
    ),
  },
  {
    id: 'spirale',
    label: 'Spirale',
    art: 'symbol',
    gruppe: 'zeichen',
    zeichnung: p(
      'M50 50 Q56 50 56 44 Q56 34 44 34 Q28 34 28 52 Q28 74 52 74 Q80 74 80 44 Q80 14 46 14',
      2.6,
    ),
  },
  {
    id: 'rune',
    label: 'Rune',
    art: 'symbol',
    gruppe: 'zeichen',
    zeichnung: p('M36 14 V86 M36 32 L66 14 M36 50 L66 32 M36 68 L66 86'),
  },
  {
    id: 'dreieck',
    label: 'Dreiklang',
    art: 'symbol',
    gruppe: 'zeichen',
    zeichnung: (
      <>
        {p('M50 16 L84 78 H16 Z', 2.6)}
        {kreis(50, 58, 14, 2)}
      </>
    ),
  },
];

/* ------------------------------------------------------------ Nachschlag -- */

export const ALLE_TEILE: Teil[] = [...FORMEN, ...RAHMEN, ...SYMBOLE];

const NACH_ID = new Map(ALLE_TEILE.map((t) => [t.id, t]));

export function teilById(id: string): Teil | undefined {
  return NACH_ID.get(id);
}

export const SYMBOLGRUPPEN: { id: NonNullable<Teil['gruppe']>; label: string }[] = [
  { id: 'kreatur', label: 'Wesen' },
  { id: 'natur', label: 'Natur' },
  { id: 'ding', label: 'Dinge' },
  { id: 'zeichen', label: 'Zeichen' },
];
