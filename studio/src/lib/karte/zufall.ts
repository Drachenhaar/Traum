/**
 * Der Zufall, der keiner ist.
 *
 * Die wichtigste Datei des Kartensystems, und sie hat zwölf Zeilen Substanz.
 * Alles, was auf der Karte hübsch aussieht – die Streuung der Bäume, die
 * Unruhe einer Küstenlinie –, muss **jedes Mal gleich** herauskommen. Sonst
 * tanzt der Wald bei jedem Neuladen, und die Karte fühlt sich nie fertig an.
 *
 * Deshalb gibt es hier keinen Zufallsgenerator im üblichen Sinn: keinen
 * Zustand, keine Folge, kein „nächster Wert". Sondern eine **Funktion vom
 * Ort**. Man fragt nicht „gib mir eine Zahl", sondern „welche Zahl gehört zu
 * dieser Zelle in diesem Wald".
 *
 * Der Unterschied ist der ganze Punkt und entscheidet über die schwierigste
 * Anforderung des Auftrags:
 *
 *   Eine Folge  – wer vorn einen Punkt einfügt, verschiebt alle danach.
 *                 Eine kleine Änderung am Rand des Waldes ergäbe einen
 *                 vollkommen anderen Wald.
 *   Ein Ort     – wer den Wald erweitert, fragt neue Orte. Die alten
 *                 antworten weiterhin dasselbe.
 *
 * Kleine Geometrieänderung → kleine sichtbare Änderung. Nicht als Absicht,
 * sondern als Folge der Bauart.
 */

/**
 * Eine Zahl aus drei Zahlen – gleichmäßig zwischen 0 und 1.
 *
 * Ganzzahlmischung nach Art von `hashwithoutname`/`xxhash`: multiplizieren,
 * verschieben, verodern. Nichts davon ist kryptografisch, und das soll es
 * auch nicht sein; verlangt wird nur, dass benachbarte Eingaben weit
 * auseinanderliegende Ausgaben haben. Ohne diese Durchmischung stünden die
 * Bäume in sichtbaren Diagonalen, weil `x + y` für Nachbarzellen fast
 * dasselbe ergibt.
 */
export function zahl(seed: number, x: number, y: number, salz = 0): number {
  let h = (seed | 0) ^ 0x9e3779b9;
  h = Math.imul(h ^ (x | 0), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h ^ (y | 0), 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h ^ (salz | 0), 0x27d4eb2f);
  h ^= h >>> 15;
  /* `>>> 0` macht aus der vorzeichenbehafteten 32-Bit-Zahl eine positive. */
  return (h >>> 0) / 4294967296;
}

/** Dieselbe Zahl, aber zwischen zwei Grenzen. */
export function zwischen(
  seed: number,
  x: number,
  y: number,
  min: number,
  max: number,
  salz = 0,
): number {
  return min + zahl(seed, x, y, salz) * (max - min);
}

/**
 * Ein Startwert für ein neues Feature.
 *
 * Einmal beim Anlegen gezogen und danach nie wieder – er wird gespeichert und
 * ist von da an eine Eigenschaft dieser Fläche wie ihre Form. Ein Wald ohne
 * festen Startwert wäre bei jedem Öffnen ein anderer Wald.
 */
export function neuerSeed(): number {
  return (Math.random() * 0x7fffffff) | 0;
}

/**
 * Sanftes Rauschen entlang einer Linie – für die Küste.
 *
 * Zwei Lagen, die zweite halb so stark und doppelt so fein. Mehr Lagen
 * wären mehr Aufwand für einen Unterschied, den auf einer Karte niemand
 * sieht; eine Lage allein sieht nach Sinuswelle aus.
 *
 * Der Rückgabewert liegt zwischen −1 und 1.
 */
export function rauschen(seed: number, t: number, salz = 0): number {
  const lage = (schrittweite: number, gewicht: number, s: number) => {
    const p = t / schrittweite;
    const i = Math.floor(p);
    const f = p - i;
    /* Weich zwischen zwei Stützstellen – ohne Glättung sieht man die Kanten. */
    const weich = f * f * (3 - 2 * f);
    const a = zahl(seed, i, 0, s) * 2 - 1;
    const b = zahl(seed, i + 1, 0, s) * 2 - 1;
    return (a + (b - a) * weich) * gewicht;
  };
  return lage(1, 0.66, salz) + lage(0.5, 0.34, salz + 1);
}
