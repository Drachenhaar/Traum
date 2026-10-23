/**
 * Siedlungszeichen – Hütte, Dorf, Burg.
 *
 * ---
 *
 * **Drei Zeichen, nicht dreissig.**
 *
 * Eine Karte in dieser Grösse kann nicht mehr sagen. Mühle, Kloster,
 * Leuchtturm, Ruine – jedes davon wäre bei zwölf Bildpunkten derselbe
 * Fleck, und der Verfasser hätte dreissig Wörter für drei Bedeutungen.
 *
 * Alle drei sind aus **denselben vier Strichen** gebaut: Giebel, zwei
 * Wände, Grundlinie. Ein Dorf ist eine Hütte mehrmals, eine Burg ist eine
 * Hütte mit Zinnen. Das ist nicht Sparsamkeit – es ist der Grund, warum sie
 * zusammengehörig aussehen, ohne dass jemand sie aufeinander abstimmen
 * müsste.
 *
 * ---
 *
 * **Was dieses Modul nicht tut.**
 *
 * Es weiss nicht, *wo* eine Siedlung liegt. Es weiss, *wie eine aussieht*.
 * Die Lage kommt aus `Kartenmarke.bei`, und dorthin kommt sie, weil jemand
 * getippt hat – Gesetz 4. Eine Karte, die sich ihre Dörfer selbst verteilt,
 * erfindet Geografie.
 *
 * ---
 *
 * **Warum alles in einem Einheitsquadrat steht.**
 *
 * Die Striche unten laufen von −1 bis 1 um den Nullpunkt, und der
 * Nullpunkt liegt auf der Grundlinie – da, wo das Haus den Boden berührt.
 * So lässt sich ein Zeichen verschieben und skalieren, ohne dass es vom
 * Boden abhebt. Ein Zeichen, dessen Mittelpunkt in der Luft liegt, rutscht
 * beim Vergrössern nach unten weg, und niemand sieht gleich, warum.
 */

/** Was auf der Karte stehen kann. Mehr gibt es nicht, siehe oben. */
export type Siedlung = 'huette' | 'dorf' | 'burg';

export const SIEDLUNGEN: { id: Siedlung; name: string }[] = [
  { id: 'huette', name: 'Hütte' },
  { id: 'dorf', name: 'Dorf' },
  { id: 'burg', name: 'Burg' },
];

export function istSiedlung(wert: unknown): wert is Siedlung {
  return SIEDLUNGEN.some((s) => s.id === wert);
}

/** Ein Zug der Feder: eine offene Linie aus mindestens zwei Punkten. */
export type Zug = [number, number][];

/**
 * Das Grundzeichen: Dach, zwei Wände, Boden.
 *
 * `b` ist die halbe Breite, `h` die Wandhöhe, `f` die Firsthöhe. Das Dach
 * steht über die Wände hinaus – ohne diesen Überstand liest sich das Zeichen
 * als Fünfeck und nicht als Haus. Gemessen an meinen eigenen Entwürfen: Das
 * war der Unterschied zwischen „irgendein Vieleck" und „Haus".
 */
function haus(b: number, h: number, f: number, dx = 0): Zug[] {
  return [
    [[dx - b * 1.45, -h], [dx, -f], [dx + b * 1.45, -h]],
    [[dx - b, -h], [dx - b, 0]],
    [[dx + b, -h], [dx + b, 0]],
    [[dx - b * 1.1, 0], [dx + b * 1.1, 0]],
  ];
}

/**
 * Zinnen als Zickzack über einer Breite.
 *
 * Sie sind das ganze Burgzeichen. Ohne sie ist es ein Turm, und einen Turm
 * erkennt bei dieser Grösse niemand als Burg.
 */
function zinnen(x0: number, x1: number, y: number, n: number, zacke: number): Zug {
  const p: Zug = [[x0, y]];
  const b = (x1 - x0) / (n * 2 - 1);
  for (let i = 0; i < n; i++) {
    const a = x0 + i * 2 * b;
    p.push([a, y - zacke], [a + b, y - zacke], [a + b, y]);
    if (i < n - 1) p.push([a + 2 * b, y]);
  }
  p.push([x1, y]);
  return p;
}

/**
 * Die Striche eines Zeichens, im Einheitsquadrat.
 *
 * Alles hängt an `art`; die Grösse kommt erst beim Zeichnen dazu. So gibt es
 * die Gestalt genau einmal – im Bauteil steht keine Zahl, die hier auch
 * steht (Gesetz 5).
 */
export function zeichen(art: Siedlung): Zug[] {
  if (art === 'huette') {
    return haus(0.34, 0.42, 0.82);
  }

  if (art === 'dorf') {
    /*
     * Drei Häuser, ungleich gross und ungleich weit auseinander.
     *
     * Gleichmässig gesetzte Häuser sehen gedruckt aus, nicht gezeichnet –
     * und ein Dorf, dessen Häuser alle gleich sind, ist eine Siedlung aus
     * dem Katalog. Die Zahlen sind von Hand gesetzt und nicht gewürfelt:
     * Ein Zeichen muss immer gleich aussehen, sonst springt die Karte.
     */
    return [
      ...haus(0.24, 0.30, 0.58, -0.52),
      ...haus(0.30, 0.40, 0.90, 0.02),
      ...haus(0.20, 0.26, 0.50, 0.52),
      /* Der Turm des mittleren Hauses – daran erkennt man ein Dorf. */
      [[0.02, -0.90], [0.02, -1.18]],
      [[-0.09, -1.10], [0.13, -1.10]],
    ];
  }

  /*
   * Die Burg: Bergfried mit Zinnen, Seitenturm, Mauerkrone, Fels darunter.
   *
   * Der Fels ist der Strich, der sie auf einen Berg stellt. Ohne ihn steht
   * sie in der Ebene, und eine Burg in der Ebene sieht aus wie ein grosses
   * Haus.
   */
  const bh = 1.05;
  const bb = 0.26;
  const th = 0.62;
  const tx = 0.62;
  const tb = 0.19;
  return [
    [[-bb, 0], [-bb, -bh]],
    [[bb, 0], [bb, -bh]],
    zinnen(-bb, bb, -bh, 3, 0.16),
    [[tx - tb, 0], [tx - tb, -th]],
    [[tx + tb, 0], [tx + tb, -th]],
    zinnen(tx - tb, tx + tb, -th, 2, 0.13),
    [[bb, -0.34], [tx - tb, -0.34]],
    [[-bb * 1.9, 0], [tx + tb * 1.5, 0]],
  ];
}

/**
 * Die Striche als `d`-Angabe, verschoben und skaliert.
 *
 * Der Name trägt „Siedlung" mit, weil `modell.ts` schon ein `alsPfad` für
 * Flächen hat. Zwei Funktionen gleichen Namens in einer Datei nebeneinander
 * sind der Anfang eines langen Nachmittags.
 *
 * `gr` ist die Höhe des Zeichens im selben Mass wie `bei` – also im
 * Kartenraum, wenn die Lage im Kartenraum steht.
 */
export function alsSiedlungspfad(art: Siedlung, bei: [number, number], gr: number): string {
  return zeichen(art)
    .map(
      (zug) =>
        zug
          .map(
            ([x, y], i) =>
              (i === 0 ? 'M' : 'L') +
              (bei[0] + x * gr).toFixed(2) +
              ' ' +
              (bei[1] + y * gr).toFixed(2),
          )
          .join(' '),
    )
    .join(' ');
}
