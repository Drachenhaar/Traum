/**
 * Was eine Karte ist.
 *
 * **Nicht ein Bild.** Eine Karte ist eine Liste von Flächen, die eine
 * Bedeutung tragen – und die Darstellung wird daraus erzeugt. Der Unterschied
 * ist nicht akademisch, er entscheidet über alles Weitere:
 *
 *   Ein Bild kann man ansehen und wegwerfen.
 *   Eine Fläche mit Bedeutung kann man umfärben, umbenennen, verschieben,
 *   an eine Seite hängen, in einem anderen Stil zeigen und in zehn Jahren
 *   noch bearbeiten.
 *
 * Gespeichert wird deshalb nie eine Farbe und nie ein Baum. Gespeichert wird:
 *
 *   Geometrie + Bedeutung + Startwert
 *
 * Woraus die Darstellung entsteht, entscheidet der Stil. Dieselbe Waldfläche
 * kann morgen in Sepia stehen, ohne dass sich ein Datensatz ändert. Dieselbe
 * Trennung wie beim Buchzeichen (Form vs. Material) und bei der Anmutung
 * (Inhalt vs. Satz) – in diesem Projekt inzwischen das dritte Mal, und jedes
 * Mal aus demselben Grund.
 *
 * **Keine zweite Wahrheit.** Ein Feature kann auf einen Eintrag zeigen; dann
 * stammen Name, Beschreibung und alles Weitere von dort. Der Name steht nicht
 * zusätzlich in der Karte. Ein Wald, der auf der Karte anders heißt als im
 * Buch, wäre der Anfang von zwei Welten.
 */

import { istSiedlung, type Siedlung } from './siedlung';
import { istBauform, setzeStaette, type Bauform, type Staettenobjekt } from '../kartenwerk/staettenwerk';
export type { Staettenobjekt } from '../kartenwerk/staettenwerk';

import { neuerSeed } from './zufall';

/**
 * Was eine Fläche bedeutet.
 *
 * Drei, nicht mehr. Berge, Flüsse, Straßen, Siedlungen und Grenzen sind
 * ausdrücklich noch nicht dran – zuerst muss bewiesen sein, dass aus einem
 * groben Fleck etwas Schönes wird. Als Zeichenkette und nicht als Aufzählung
 * im Typ wäre bequemer; als Aufzählung fällt beim Erweitern jede Stelle auf,
 * die den neuen Fall nicht behandelt.
 */
export type Bedeutung = 'land' | 'wasser' | 'wald';

export const BEDEUTUNGEN: { id: Bedeutung; name: string }[] = [
  { id: 'land', name: 'Land' },
  { id: 'wasser', name: 'Wasser' },
  { id: 'wald', name: 'Wald' },
];

/** Ein Punkt im Kartenraum. Siehe `Kartenfeature.punkte`. */
export type Punkt = [number, number];

export interface Kartenfeature {
  id: string;
  art: Bedeutung;
  /**
   * Der geschlossene Umriss, im Kartenraum 0…1000.
   *
   * Bewusst eine eigene, feste Skala und keine Bildschirmpunkte: Eine Karte,
   * die in den Maßen des Geräts gespeichert wird, in dem sie gemalt wurde,
   * ist auf jedem anderen Gerät falsch. Tausend statt eins, weil ganze Zahlen
   * sich besser lesen und die Auflösung für eine Weltkarte reicht.
   */
  punkte: Punkt[];
  /**
   * Der Startwert dieser Fläche – einmal gezogen, danach unveränderlich.
   *
   * Er ist der Grund, warum ein Wald beim Neuladen derselbe Wald ist. Wer ihn
   * beim Bearbeiten neu zieht, hat einen anderen Wald gemalt.
   */
  seed: number;
  /** Auf welche Seite des Buches diese Fläche zeigt. Darf fehlen. */
  entryId?: string;
  /**
   * Wann es das gab.
   *
   * Noch von nichts gelesen – die Karte kennt keine Zeit. Die Felder stehen
   * hier, weil die Chronik sie später ohne Wanderung benutzen kann und weil
   * es billiger ist, sie jetzt vorzusehen, als sie später nachzurüsten.
   */
  beginn?: string;
  ende?: string;
}

/**
 * Eine Siedlung auf der Karte.
 *
 * **Kein Feature.** Eine Fläche hat einen Umriss, eine Siedlung hat einen
 * Ort – das ist nicht dieselbe Sorte Ding. Sie in `features` zu zwängen
 * hiesse, dass `punkte` manchmal ein Umriss und manchmal ein einzelner
 * Punkt ist, und jede Stelle, die Flächen liest – Küstensaum, Relief,
 * Ebenenfolge, Namenslage –, müsste das wissen. Eine eigene Liste ist
 * billiger und ehrlicher.
 *
 * Und sie steht genau dort, wo jemand getippt hat. Siehe `siedlung.ts`.
 */
export interface Kartenmarke {
  id: string;
  art: Siedlung;
  /** Wo sie steht, im Kartenraum 0…1000 – wie `Kartenfeature.punkte`. */
  bei: Punkt;
  /** Fuer spaeteres: eine Hand zeichnet zweimal nicht genau gleich. */
  seed: number;
  /** Auf welche Seite des Buches sie zeigt. Darf fehlen. */
  entryId?: string;
}

/**
 * Ein Gebirgszug auf der Karte.
 *
 * ---
 *
 * **Eine Linie, keine Fläche.** Dieselbe Überlegung wie bei der Siedlung,
 * nur andersherum: Eine Siedlung hat einen Ort, eine Fläche einen Umriss –
 * und ein Gebirge hat einen **Verlauf**. Es in `features` zu zwängen hiesse,
 * dass `punkte` mal ein geschlossener Umriss und mal ein offener Kamm ist,
 * und jede Stelle, die Flächen liest – Küstensaum, Relief, Ebenenfolge,
 * Namenslage, Streuwerk –, müsste das unterscheiden.
 *
 * ---
 *
 * **Was hier nicht steht.** Keine Gipfel, keine Hänge, kein Bild. Gespeichert
 * wird der Kamm und vier Zahlen; woraus daraus ein Gebirge wird, rechnet
 * `gebirge.ts` bei jedem Öffnen neu – und wegen des Ortszufalls jedes Mal
 * gleich.
 *
 * Gespeicherte Gipfelpositionen wären eine zweite Wahrheit: Wer den Kamm
 * verschöbe, hätte dann Berge, die nicht mehr auf ihrem Kamm stehen.
 */
export interface Gebirgskamm {
  id: string;
  /** Der Verlauf des Kamms, im Kartenraum 0…1000. Offen, nicht geschlossen. */
  punkte: Punkt[];
  /**
   * Wie weit der Höhenzug zu beiden Seiten des Kamms reicht, im Kartenmaß.
   *
   * Eine halbe Breite und keine ganze: Gerechnet wird überall vom Abstand
   * zum Kamm aus, und ein Mass, das man vor jedem Gebrauch halbieren muss,
   * wird irgendwann einmal nicht halbiert.
   */
  breite: number;
  /** Wie hoch, 0…1. Der Stil entscheidet, wie viel Schatten das ergibt. */
  hoehe: number;
  /** Von weichen Rücken (0) bis zu zerrissenen Graten (1). */
  zerkluftung: number;
  /** Einmal gezogen, danach unveränderlich – wie bei einer Fläche. */
  seed: number;
  /** Auf welche Seite des Buches dieser Zug zeigt. Darf fehlen. */
  entryId?: string;
  beginn?: string;
  ende?: string;
}

export interface Kartendokument {
  id: string;
  bookId: string;
  /** Zu welcher Welt diese Karte gehört – siehe `db/db.ts`, Fassung 8. */
  worldId?: string;
  /** Der Startwert der Karte selbst – für alles, was nicht zu einer Fläche gehört. */
  seed: number;
  styleId: string;
  features: Kartenfeature[];
  /**
   * Die Siedlungen. Darf fehlen – jede Karte von vor dieser Runde hat keine,
   * und eine Karte ohne Dörfer ist keine beschädigte Karte.
   */
  marken?: Kartenmarke[];
  /** Frei gesetzte Gebäude. Anders als Siedlungszeichen werden sie als Staffage gemalt. */
  staetten?: Staettenobjekt[];
  /**
   * Die Gebirgszüge. Darf fehlen – jede Karte von vor dieser Runde hat
   * keine, und eine Karte ohne Berge ist keine beschädigte Karte.
   */
  kaemme?: Gebirgskamm[];
  createdAt: number;
  updatedAt: number;
}

/** Der Kartenraum. Alles rechnet in diesem Feld. */
export const FELD = 1000;

let zaehler = 0;
function neueId(prefix: string): string {
  zaehler += 1;
  return `${prefix}_${Date.now().toString(36)}${zaehler.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function neueKarte(bookId: string): Kartendokument {
  const jetzt = Date.now();
  return {
    id: neueId('karte'),
    bookId,
    seed: neuerSeed(),
    styleId: 'artbook',
    features: [],
    marken: [],
    staetten: [],
    kaemme: [],
    createdAt: jetzt,
    updatedAt: jetzt,
  };
}

export function neuesFeature(art: Bedeutung, punkte: Punkt[]): Kartenfeature {
  return { id: neueId('f'), art, punkte, seed: neuerSeed() };
}

export function neueMarke(art: Siedlung, bei: Punkt): Kartenmarke {
  return { id: neueId('m'), art, bei, seed: neuerSeed() };
}

export function neueStaette(art: Bauform, bei: Punkt): Staettenobjekt {
  return setzeStaette(neueId('s'), art, bei, art === 'bruecke' ? 22 : 32, neuerSeed());
}

/**
 * Die Vorgabewerte eines frisch gezogenen Gebirges.
 *
 * Sie stehen hier und nicht im Werkzeug, weil sie zum Datentyp gehören: Wer
 * einen Kamm ohne Breite speichert, hat kein Gebirge gespeichert.
 */
export const GEBIRGE_VORGABE = { breite: 110, hoehe: 0.78, zerkluftung: 0.5 };

export function neuerKamm(punkte: Punkt[]): Gebirgskamm {
  return { id: neueId('g'), punkte, ...GEBIRGE_VORGABE, seed: neuerSeed() };
}

/* ------------------------------------------------------------- Heilung ---- */

/**
 * Eine gespeicherte Karte einlesen – auch wenn sie beschädigt ist.
 *
 * Dieselbe Vorsicht wie bei Einträgen: Feld für Feld, mit Rückfällen. Eine
 * Fläche mit weniger als drei Punkten ist keine Fläche und fällt weg; ein
 * fehlender Startwert wird ergänzt, damit wenigstens *ab jetzt* Ruhe ist.
 */
export function heileKarte(roh: unknown): Kartendokument | undefined {
  if (!roh || typeof roh !== 'object') return undefined;
  const k = roh as Record<string, unknown>;
  if (typeof k.id !== 'string' || typeof k.bookId !== 'string') return undefined;

  const zahl = (v: unknown, r: number) =>
    typeof v === 'number' && Number.isFinite(v) ? v : r;

  const features: Kartenfeature[] = [];
  for (const rohesFeature of Array.isArray(k.features) ? k.features : []) {
    if (!rohesFeature || typeof rohesFeature !== 'object') continue;
    const f = rohesFeature as Record<string, unknown>;
    if (!BEDEUTUNGEN.some((b) => b.id === f.art)) continue;
    const punkte = (Array.isArray(f.punkte) ? f.punkte : [])
      .filter(
        (p): p is Punkt =>
          Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === 'number' && Number.isFinite(n)),
      )
      .map(([x, y]) => [x, y] as Punkt);
    if (punkte.length < 3) continue;
    features.push({
      id: typeof f.id === 'string' ? f.id : neueId('f'),
      art: f.art as Bedeutung,
      punkte,
      seed: zahl(f.seed, neuerSeed()) | 0,
      entryId: typeof f.entryId === 'string' ? f.entryId : undefined,
      beginn: typeof f.beginn === 'string' ? f.beginn : undefined,
      ende: typeof f.ende === 'string' ? f.ende : undefined,
    });
  }

  /*
   * Die Marken, Feld für Feld – dieselbe Vorsicht wie bei den Flächen.
   *
   * Eine Marke ohne gültige Art oder ohne Lage ist keine. Sie fällt weg
   * statt mit einem Rückfall dazustehen: Ein Dorf, das plötzlich eine Burg
   * ist, wäre eine Behauptung über die Welt, die niemand aufgestellt hat.
   * Ein fehlender Startwert dagegen ist harmlos und bekommt einen.
   */
  const marken: Kartenmarke[] = [];
  for (const roheMarke of Array.isArray(k.marken) ? k.marken : []) {
    if (!roheMarke || typeof roheMarke !== 'object') continue;
    const m = roheMarke as Record<string, unknown>;
    if (typeof m.id !== 'string') continue;
    if (!istSiedlung(m.art)) continue;
    const bei = m.bei;
    if (!Array.isArray(bei) || bei.length !== 2) continue;
    if (!bei.every((z) => typeof z === 'number' && Number.isFinite(z))) continue;
    marken.push({
      id: m.id,
      art: m.art,
      bei: [bei[0] as number, bei[1] as number],
      seed: zahl(m.seed, 1),
      entryId: typeof m.entryId === 'string' ? m.entryId : undefined,
    });
  }

  /*
   * Die Gebirgszüge, Feld für Feld.
   *
   * Ein Kamm braucht **zwei** Punkte, nicht drei: Eine Fläche mit zwei
   * Punkten ist keine Fläche, eine Linie mit zwei Punkten ist eine Linie.
   *
   * Die drei Zahlen werden geklemmt statt verworfen. Eine Breite von null
   * ergäbe ein unsichtbares Gebirge, das trotzdem dasteht – schlimmer als
   * ein schmales, denn man sähe nicht, was fehlt.
   */
  const klemme = (v: unknown, min: number, max: number, rueck: number) => {
    const n = typeof v === 'number' && Number.isFinite(v) ? v : rueck;
    return Math.max(min, Math.min(max, n));
  };
  const kaemme: Gebirgskamm[] = [];
  for (const roherKamm of Array.isArray(k.kaemme) ? k.kaemme : []) {
    if (!roherKamm || typeof roherKamm !== 'object') continue;
    const g = roherKamm as Record<string, unknown>;
    const punkte = (Array.isArray(g.punkte) ? g.punkte : [])
      .filter(
        (p): p is Punkt =>
          Array.isArray(p) && p.length === 2 &&
          p.every((n) => typeof n === 'number' && Number.isFinite(n)),
      )
      .map(([x, y]) => [x, y] as Punkt);
    if (punkte.length < 2) continue;
    kaemme.push({
      id: typeof g.id === 'string' ? g.id : neueId('g'),
      punkte,
      breite: klemme(g.breite, 8, 320, GEBIRGE_VORGABE.breite),
      hoehe: klemme(g.hoehe, 0.05, 1, GEBIRGE_VORGABE.hoehe),
      zerkluftung: klemme(g.zerkluftung, 0, 1, GEBIRGE_VORGABE.zerkluftung),
      seed: zahl(g.seed, neuerSeed()) | 0,
      entryId: typeof g.entryId === 'string' ? g.entryId : undefined,
      beginn: typeof g.beginn === 'string' ? g.beginn : undefined,
      ende: typeof g.ende === 'string' ? g.ende : undefined,
    });
  }

  /* Einzelbauten bleiben durch Backup, Neubeginn und Heilung erhalten. */
  const staetten: Staettenobjekt[] = [];
  for (const rohStaette of Array.isArray(k.staetten) ? k.staetten : []) {
    if (!rohStaette || typeof rohStaette !== 'object') continue;
    const s = rohStaette as Record<string, unknown>;
    if (typeof s.id !== 'string' || !s.id || !istBauform(s.bauform)) continue;
    if (!Array.isArray(s.bei) || s.bei.length !== 2 || !s.bei.every(
      (n) => typeof n === 'number' && Number.isFinite(n))) continue;
    staetten.push({
      id: s.id,
      bauform: s.bauform,
      bei: [s.bei[0] as number, s.bei[1] as number],
      hoehe: klemme(s.hoehe, 8, 32, s.bauform === 'bruecke' ? 22 : 32),
      variante: Math.floor(klemme(s.variante, 0, 1000, 0)),
      seed: zahl(s.seed, 1),
      entryId: typeof s.entryId === 'string' ? s.entryId : undefined,
    });
  }

  return {
    id: k.id,
    bookId: k.bookId,
    /*
     * **Die Welt muss mit.**
     *
     * Hier fehlte sie, und der Verlust war still: Der Laden holt Karten mit
     * `db.karten.where('worldId')`. Eine geheilte Karte kam ohne Welt
     * zurück, wurde beim nächsten Strich so gespeichert – und war beim
     * nächsten Öffnen **weg**. Nicht gelöscht, nur unauffindbar, was
     * schlimmer ist.
     *
     * Gemessen mit der Gebirgssonde: Nach dem Zeichnen stand in der
     * Datenbank `{id:'k_mess', book:'b1', world:undefined, f:3, g:1}` – alle
     * Daten da, die Karte trotzdem leer.
     *
     * Dass es bisher niemandem auffiel, liegt an der Heimatpflege beim
     * Start (`useStudio.ts`), die heimatlose Karten der aktiven Welt
     * zuschlägt. Sie repariert den Schaden einen Start später; richtig ist,
     * ihn nicht anzurichten.
     */
    worldId: typeof k.worldId === 'string' ? k.worldId : undefined,
    seed: zahl(k.seed, 1) | 0,
    styleId: typeof k.styleId === 'string' ? k.styleId : 'artbook',
    features,
    marken,
    staetten,
    kaemme,
    createdAt: zahl(k.createdAt, Date.now()),
    updatedAt: zahl(k.updatedAt, Date.now()),
  };
}

/* ------------------------------------------------------------ Geometrie --- */

/** Liegt der Punkt in der Fläche? Strahlensatz, wie üblich. */
export function imPolygon(p: Punkt, poly: Punkt[]): boolean {
  let drin = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) drin = !drin;
  }
  return drin;
}

/** Der umschließende Kasten – für alles, was nicht jede Fläche absuchen will. */
export function kasten(poly: Punkt[]): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const [x, y] of poly) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}

/** Abstand eines Punktes zur nächsten Kante – für den lockeren Waldrand. */
export function randabstand(p: Punkt, poly: Punkt[]): number {
  let beste = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j];
    const [bx, by] = poly[i];
    const dx = bx - ax;
    const dy = by - ay;
    const laenge = dx * dx + dy * dy;
    const t = laenge ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / laenge)) : 0;
    const qx = ax + t * dx - p[0];
    const qy = ay + t * dy - p[1];
    const d = Math.hypot(qx, qy);
    if (d < beste) beste = d;
  }
  return beste;
}

/** Als SVG-Pfad. Geschlossen, weil eine Fläche geschlossen ist. */
export function alsPfad(poly: Punkt[]): string {
  if (!poly.length) return '';
  return `M${poly.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`;
}
