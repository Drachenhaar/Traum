/**
 * Die Gestenmathematik.
 *
 * Ausschließlich reine Funktionen: Zahlen hinein, Zahlen heraus. Kein React,
 * kein DOM, kein Zustand, kein Zeiger.
 *
 * Das ist keine Stilübung. Die Bedienung eines Buches, das man mit dem Daumen
 * hält, entscheidet sich in fünf Schwellenwerten – und die einzige Art, sie
 * verlässlich zu prüfen, ist, sie ohne Browser zu prüfen. „Ein Wisch unter der
 * Totzone tut nichts" ist eine Aussage über eine Funktion, nicht über eine
 * Oberfläche. Wer sie nur im Browser prüfen kann, prüft sie nicht.
 *
 * Die Oberfläche darüber (`Raumschicht.tsx`) tut deshalb fast nichts: Sie
 * sammelt Zeigerereignisse ein und fragt hier nach.
 */

import type { Raumkonfig } from './konfig';

export type Richtung = 'links' | 'rechts' | 'oben' | 'unten';
export type Ort = Richtung | 'mitte';

/** Die vier Bedeutungen des Raumkreuzes. Siehe das Gesetz „nach außen wächst die Definition". */
export const RICHTUNGEN: { id: Richtung; name: string; was: string }[] = [
  { id: 'links', name: 'Welt', was: 'Orte · Raum · Geografie' },
  { id: 'rechts', name: 'Wesen', was: 'Charaktere · Beziehungen' },
  { id: 'oben', name: 'Wissen', was: 'Zusammenhang · Tiefe' },
  { id: 'unten', name: 'Notizen', was: 'Gedanken · Fundstücke' },
];

/**
 * Der Einwärtsvektor einer Richtung.
 *
 * Wichtig und leicht zu verwechseln: Wer zu den *Wesen* will (rechts), zieht
 * vom rechten Rand **nach links**. Der Raum wird in den Bildschirm gezogen,
 * nicht der Bildschirm zur Seite geschoben. Deshalb zeigt der Vektor für
 * `rechts` nach links.
 */
export const EINWAERTS: Record<Richtung, [number, number]> = {
  links: [1, 0],
  rechts: [-1, 0],
  oben: [0, 1],
  unten: [0, -1],
};

/** Die Gegenrichtung – für den Weg zurück aus der Tiefe. */
export const GEGEN: Record<Richtung, Richtung> = {
  links: 'rechts',
  rechts: 'links',
  oben: 'unten',
  unten: 'oben',
};

export interface Feld {
  breite: number;
  hoehe: number;
  /**
   * Zusätzlicher Einzug oben und unten – die Zonen, die das Gerät für sich
   * beansprucht.
   *
   * **Hier lag ein echter Fehler.** Links und rechts funktionierte die
   * Bedienung auf dem iPhone sofort, oben und unten überhaupt nicht. Der
   * Grund steht nicht im Code, sondern im `index.html`: Die Seite läuft mit
   * `viewport-fit=cover` und reicht damit *unter* die Dynamic Island und
   * *unter* den Home-Indikator. Ein Streifen zwischen zwölf und
   * sechsundvierzig Punkten vom oberen Rand liegt also mitten in der
   * Statusleiste – und ein Zug nach unten von dort öffnet die
   * Mitteilungszentrale. Unten dasselbe mit der Geste zum Startbildschirm.
   *
   * Beide Zonen gehören iOS, und dagegen gewinnt keine Anwendung. Also weicht
   * Dragoncore ihnen aus: Die senkrechten Streifen beginnen unterhalb der
   * sicheren Fläche und oberhalb des Indikators. Waagerecht braucht es das
   * nicht – dort liegt nur Safaris Zurück-Wisch am äußersten Rand, und der
   * ist mit `randEinzugPx` bereits umgangen.
   */
  oben?: number;
  unten?: number;
}

/**
 * In welchem Randstreifen hat der Finger aufgesetzt?
 *
 * `undefined` heißt: keine Raumgeste. Dann gehört die Bewegung dem, was unter
 * dem Finger liegt – Blättern, Scrollen, ein Bild verschieben. Diese Antwort
 * ist die wichtigste der Datei, weil sie die einzige ist, die *nichts* tut.
 */
export function randRichtung(
  x: number,
  y: number,
  feld: Feld,
  k: Raumkonfig,
): Richtung | undefined {
  const von = k.geste.randEinzugPx;
  const bis = von + k.geste.randBreitePx;
  if (x >= von && x <= bis) return 'links';
  if (x >= feld.breite - bis && x <= feld.breite - von) return 'rechts';

  /* Senkrecht zusätzlich um die Systemzonen versetzt – siehe `Feld`. */
  const vonOben = von + (feld.oben ?? 0);
  const vonUnten = von + (feld.unten ?? 0);
  if (y >= vonOben && y <= vonOben + k.geste.randBreitePx) return 'oben';
  if (y >= feld.hoehe - vonUnten - k.geste.randBreitePx && y <= feld.hoehe - vonUnten)
    return 'unten';
  return undefined;
}

/**
 * Wie weit ist die Geste gezogen – als Anteil zwischen 0 und 1.
 *
 * Gemessen wird nur die Bewegung **nach innen**. Wer nach dem Aufsetzen wieder
 * nach außen zieht, hat null, nicht etwas Negatives: Der Bogen soll
 * zurücklaufen und nicht auf der anderen Seite herauswachsen.
 */
export function fortschritt(
  start: [number, number],
  jetzt: [number, number],
  richtung: Richtung,
  feld: Feld,
  k: Raumkonfig,
): number {
  const [ex, ey] = EINWAERTS[richtung];
  const weg = (jetzt[0] - start[0]) * ex + (jetzt[1] - start[1]) * ey;
  const achse = ex !== 0 ? feld.breite : feld.hoehe;
  const voll = Math.max(1, achse * k.geste.wegAnteil);
  return Math.max(0, Math.min(1, weg / voll));
}

/**
 * Zeigt die Bewegung überhaupt in die richtige Richtung?
 *
 * Ohne diese Prüfung würde jedes Scrollen, das am rechten Rand beginnt, den
 * Wesensraum andeuten. Der Winkel entscheidet, und die Toleranz ist ein
 * Regler: Wie schief ein Daumen zieht, weiß man erst am Gerät.
 */
export function passtRichtung(
  dx: number,
  dy: number,
  richtung: Richtung,
  k: Raumkonfig,
): boolean {
  const laenge = Math.hypot(dx, dy);
  if (!laenge) return false;
  const [ex, ey] = EINWAERTS[richtung];
  const kosinus = (dx * ex + dy * ey) / laenge;
  return kosinus >= Math.cos((k.geste.richtungstoleranzGrad * Math.PI) / 180);
}

export type Phase =
  | 'ruhe'
  | 'andeutung'
  | 'ergriffen'
  | 'verpflichtend'
  | 'einrastend'
  | 'heimkehrend';

/**
 * Welche Phase gehört zu diesem Fortschritt?
 *
 * Drei Stufen, und die Grenze dazwischen ist der ganze Unterschied zwischen
 * „die App zuckt" und „die App atmet":
 *
 *   ruhe        Es passiert nichts. Der Finger hat sich kaum bewegt.
 *   andeutung   Ein sehr feiner Bogen. Keine Information, kein Tick.
 *   ergriffen   Die Richtung ist erkannt. Jetzt darf es sich melden.
 */
export function phaseVon(wert: number, k: Raumkonfig): Phase {
  if (wert <= 0) return 'ruhe';
  if (wert < k.geste.andeutung) return 'andeutung';
  return 'ergriffen';
}

/**
 * Loslassen – und dann?
 *
 * Zwei Wege zum Öffnen. Der lange Zug ist der für den ersten Tag; der kurze,
 * schnelle Wisch ist der für den hundertsten. Wer die Bedienung kennt, soll
 * nicht jedes Mal denselben Weg zurücklegen müssen.
 */
export function entscheide(
  wert: number,
  tempoPxProMs: number,
  k: Raumkonfig,
): 'oeffnen' | 'zurueck' {
  if (wert >= k.geste.verpflichtung) return 'oeffnen';
  if (wert >= k.geste.schnellMindestweg && tempoPxProMs >= k.geste.schnellTempoPxProMs)
    return 'oeffnen';
  return 'zurueck';
}

export interface Stand {
  ort: Ort;
  tiefe: number;
}

/**
 * Wohin führt eine geöffnete Geste?
 *
 * Die Regel in drei Zeilen, und jede hat einen Grund:
 *
 *   In der Mitte      → jede Richtung führt in ihre erste Tiefe.
 *   Dieselbe Richtung → eine Ebene tiefer, bis zur dritten.
 *   Die Gegenrichtung → eine Ebene zurück, bis zur Mitte.
 *
 * Und der Fall, der bewusst *nichts* tut: eine quer dazu stehende Richtung aus
 * der Tiefe heraus. Wer im Beziehungsnetz steht und vom oberen Rand zieht,
 * würde sonst ohne Übergang in einem ganz anderen Bedeutungsraum landen. Das
 * ist keine Tiefe mehr, das ist Verirren. Der Weg dorthin führt über die Mitte
 * – und die ist einen Doppeltipp entfernt.
 */
export function naechsterStand(stand: Stand, geste: Richtung, k: Raumkonfig): Stand {
  if (stand.ort === 'mitte' || stand.tiefe === 0) return { ort: geste, tiefe: 1 };
  if (geste === stand.ort)
    return { ort: stand.ort, tiefe: Math.min(k.geste.hoechsteTiefe, stand.tiefe + 1) };
  if (geste === GEGEN[stand.ort]) {
    const tiefer = stand.tiefe - 1;
    return tiefer <= 0 ? { ort: 'mitte', tiefe: 0 } : { ort: stand.ort, tiefe: tiefer };
  }
  return stand;
}

/**
 * Sind das zwei Tipps oder zwei Berührungen?
 *
 * Zeit *und* Ort. Nur die Zeit zu prüfen hieße, dass ein Tipp oben und ein
 * Tipp unten als Doppeltipp gelten – auf einer Buchseite, auf der man liest
 * und dabei tippt, passiert das ständig.
 */
export function istDoppeltipp(
  erster: { x: number; y: number; t: number } | null,
  zweiter: { x: number; y: number; t: number },
  k: Raumkonfig,
): boolean {
  if (!erster) return false;
  if (zweiter.t - erster.t > k.doppeltipp.abstandMs) return false;
  return Math.hypot(zweiter.x - erster.x, zweiter.y - erster.y) <= k.doppeltipp.maxWegPx;
}
