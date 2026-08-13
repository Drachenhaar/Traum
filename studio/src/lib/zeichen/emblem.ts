/**
 * Ein Zeichen als Bauplan.
 *
 * Gespeichert wird die **Konstruktion**, nie das Ergebnis. Das ist die eine
 * Entscheidung, an der später alles hängt: Ein Zeichen, das als Bild abgelegt
 * wird, ist fertig – man kann es ansehen und wegwerfen, aber nicht mehr
 * öffnen. Ein Zeichen als Ebenenliste bleibt für immer aufmachbar, und dieses
 * Buch soll jemandem jahrelang gehören.
 *
 * Und es ist zugleich die Antwort auf die Materialfrage: Weil hier nur Form
 * steht und keine Farbe, kann derselbe Bauplan als Goldprägung auf dunklem
 * Leder und als Tinte auf Papier erscheinen, ohne zweimal zu existieren.
 *
 *   Bauplan + Material = das, was man sieht
 *
 * **Keine Ebenenart darf nur einmal vorkommen.** Der Auftrag sagt es
 * ausdrücklich, und es ist auch die einzige Bauart, die trägt: Zwei Sterne
 * über einem Berg, drei Ringe umeinander, ein gespiegeltes Wolfspaar – all
 * das entsteht dadurch, dass `layers` eine Liste ist und keine Handvoll
 * benannter Felder.
 */

import { teilById, SYMBOLE } from './teile';

export type Ebenenart = 'form' | 'rahmen' | 'haupt' | 'zusatz';

/**
 * Eine Ebene.
 *
 * `x` und `y` sind Anteile der Bildbreite, nicht Pixel: −0.28 heißt „ein gutes
 * Viertel nach oben", gleichgültig ob das Zeichen 26 Punkt auf dem Regal misst
 * oder 130 auf dem Einband. In Pixeln gespeicherte Werte hätten bedeutet, dass
 * ein Zeichen nur in genau der Größe stimmt, in der es gebaut wurde.
 */
export interface Ebene {
  id: string;
  /** Welches Teil aus der Ablage – siehe `teile.tsx`. */
  teil: string;
  art: Ebenenart;
  x: number;
  y: number;
  scale: number;
  /** Grad. */
  drehung: number;
  gespiegelt: boolean;
  deckkraft: number;
}

export interface Emblem {
  /**
   * Die Ebenen von hinten nach vorn.
   *
   * Die Reihenfolge *ist* die Stapelfolge – kein `zIndex` daneben. Zwei
   * Wahrheiten über dieselbe Sache laufen auseinander, sobald jemand eine
   * Ebene entfernt und die Zahlen Lücken bekommen.
   */
  layers: Ebene[];
}

export const LEERES_EMBLEM: Emblem = { layers: [] };

let zaehler = 0;
function neueId(): string {
  zaehler += 1;
  return `eb${Date.now().toString(36)}${zaehler.toString(36)}`;
}

/** Die Vorgaben einer frisch gelegten Ebene. */
export function neueEbene(teil: string, art: Ebenenart, patch: Partial<Ebene> = {}): Ebene {
  const t = teilById(teil);
  return {
    id: neueId(),
    teil,
    art,
    x: 0,
    y: art === 'zusatz' && t?.gernOben ? -0.3 : 0,
    /*
     * Ein Zusatz ist klein. Wer einen Stern in Hauptgroesse dazulegt, hat
     * zwei Hauptsymbole – und muesste als Erstes verkleinern. Die Vorgabe
     * soll die haeufige Absicht treffen, nicht die neutrale.
     */
    scale: art === 'zusatz' ? 0.3 : art === 'haupt' ? 0.62 : 1,
    drehung: 0,
    gespiegelt: false,
    deckkraft: 1,
    ...patch,
  };
}

/* ------------------------------------------------------- Ebenen ordnen ---- */

/**
 * Wohin eine neue Ebene im Stapel gehört.
 *
 * Form ganz hinten, dann alles, was gern hinten steht, dann Hauptsymbol,
 * Zusätze, Rahmen zuoberst. Das ist kein Gesetz – der Verfasser schiebt
 * danach, wohin er will –, aber es ist die Anordnung, die in neun von zehn
 * Fällen gemeint war, und sie erspart den ersten Handgriff.
 */
const TIEFE: Record<Ebenenart, number> = { form: 0, haupt: 2, zusatz: 3, rahmen: 4 };

function tiefeVon(e: Ebene): number {
  return teilById(e.teil)?.gernHinten ? 1 : TIEFE[e.art];
}

export function einfuegen(emblem: Emblem, ebene: Ebene): Emblem {
  const layers = [...emblem.layers, ebene].sort((a, b) => tiefeVon(a) - tiefeVon(b));
  return { layers };
}

/**
 * Eine Ebene ersetzen, die es nur einmal geben soll.
 *
 * Gilt für Form und Rahmen: Zwei Grundformen übereinander sind kein Entwurf,
 * sondern ein Versehen. Für Symbole gilt es ausdrücklich **nicht**.
 */
export function setzeEinzeln(emblem: Emblem, art: 'form' | 'rahmen', teil: string): Emblem {
  const ohne = { layers: emblem.layers.filter((l) => l.art !== art) };
  if (!teil || teil === 'keine' || teil === 'keiner') return ohne;
  return einfuegen(ohne, neueEbene(teil, art));
}

export function aendere(emblem: Emblem, id: string, patch: Partial<Ebene>): Emblem {
  return { layers: emblem.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) };
}

export function entferne(emblem: Emblem, id: string): Emblem {
  return { layers: emblem.layers.filter((l) => l.id !== id) };
}

/** Eine Ebene im Stapel bewegen. */
export function schiebe(emblem: Emblem, id: string, richtung: 'vor' | 'zurueck'): Emblem {
  const i = emblem.layers.findIndex((l) => l.id === id);
  const j = richtung === 'vor' ? i + 1 : i - 1;
  if (i < 0 || j < 0 || j >= emblem.layers.length) return emblem;
  const layers = [...emblem.layers];
  [layers[i], layers[j]] = [layers[j], layers[i]];
  return { layers };
}

/**
 * Ein Spiegelpaar.
 *
 * Die billigste Art, aus wenigen Teilen ein Wappen zu machen: Aus einem Wolf
 * werden zwei, die einander ansehen. Der Auftrag nennt es zu Recht wichtig –
 * mit fünfundzwanzig Symbolen und diesem einen Handgriff entstehen Zeichen,
 * für die man sonst fünfzig bräuchte.
 *
 * Das Ursprungsteil rückt dabei zur Seite, statt stehen zu bleiben und einen
 * Zwilling danebenzustellen: Zwei Wölfe, von denen einer in der Mitte klebt,
 * sind kein Paar.
 */
export function spiegelpaar(emblem: Emblem, id: string): Emblem {
  const l = emblem.layers.find((x) => x.id === id);
  if (!l) return emblem;
  const abstand = Math.max(0.18, l.scale * 0.42);
  const links: Ebene = { ...l, x: l.x - abstand };
  const rechts: Ebene = {
    ...l,
    id: neueId(),
    x: l.x + abstand,
    gespiegelt: !l.gespiegelt,
  };
  const i = emblem.layers.findIndex((x) => x.id === id);
  const layers = [...emblem.layers];
  layers.splice(i, 1, links, rechts);
  return { layers };
}

/* ------------------------------------------------------------- Heilung ---- */

/**
 * Ein gespeichertes Zeichen einlesen.
 *
 * Ebenen, deren Teil es nicht mehr gibt, fallen weg. Das ist der Fall, den
 * eine Sicherung aus einer künftigen Fassung mitbringen kann – lieber ein
 * Zeichen ohne eine Ebene als gar keines.
 */
export function heileEmblem(roh: unknown): Emblem | undefined {
  if (!roh || typeof roh !== 'object') return undefined;
  const e = roh as { layers?: unknown };
  if (!Array.isArray(e.layers)) return undefined;
  const zahl = (v: unknown, r: number, min: number, max: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : r;

  const layers: Ebene[] = [];
  for (const roheEbene of e.layers) {
    if (!roheEbene || typeof roheEbene !== 'object') continue;
    const l = roheEbene as Record<string, unknown>;
    if (typeof l.teil !== 'string' || !teilById(l.teil)) continue;
    const art = ['form', 'rahmen', 'haupt', 'zusatz'].includes(l.art as string)
      ? (l.art as Ebenenart)
      : 'zusatz';
    layers.push({
      id: typeof l.id === 'string' ? l.id : neueId(),
      teil: l.teil,
      art,
      x: zahl(l.x, 0, -1, 1),
      y: zahl(l.y, 0, -1, 1),
      scale: zahl(l.scale, 0.6, 0.05, 3),
      drehung: zahl(l.drehung, 0, -360, 360),
      gespiegelt: l.gespiegelt === true,
      deckkraft: zahl(l.deckkraft, 1, 0.05, 1),
    });
  }
  return layers.length ? { layers } : undefined;
}

/* --------------------------------------------------------- Inspiration ---- */

/**
 * Ein Vorschlag aus vorhandenen Teilen.
 *
 * Kein Modell, keine Erzeugung – ein Würfel mit Anstand. Der Unterschied zu
 * blindem Zufall steckt in zwei Zeilen: Ein Zusatz, der gern oben steht, wird
 * oben abgelegt, und ein Zusatz, der gern hinten steht, wandert hinter das
 * Hauptsymbol. Ohne das würfelte man Kronen unter Füße und Monde vor Gesichter,
 * und das Ergebnis wäre der Beweis, dass Zufall allein nicht reicht.
 *
 * Das Ergebnis ist ein Anfang, kein Entwurf. Wer es behält, wie es ist, hat
 * Glück gehabt; gemeint ist, dass er daran weiterbaut.
 */
export function inspiration(
  formen: string[],
  rahmen: string[],
  wuerfel: () => number = Math.random,
): Emblem {
  const aus = <T,>(liste: T[]): T => liste[Math.floor(wuerfel() * liste.length)];

  let emblem: Emblem = LEERES_EMBLEM;
  /* Eine Form in zwei von drei Fällen – nicht jedes Zeichen will eingefasst sein. */
  if (wuerfel() < 0.66) emblem = setzeEinzeln(emblem, 'form', aus(formen));
  if (wuerfel() < 0.6) emblem = setzeEinzeln(emblem, 'rahmen', aus(rahmen));

  const haupt = aus(SYMBOLE);
  emblem = einfuegen(emblem, neueEbene(haupt.id, 'haupt'));

  if (wuerfel() < 0.55) {
    /* Der Zusatz kommt aus einer anderen Gruppe – sonst zweimal dasselbe Thema. */
    const andere = SYMBOLE.filter((s) => s.gruppe !== haupt.gruppe);
    const zusatz = aus(andere.length ? andere : SYMBOLE);
    emblem = einfuegen(
      emblem,
      neueEbene(zusatz.id, 'zusatz', {
        y: zusatz.gernOben ? -0.32 : zusatz.gernHinten ? -0.05 : 0.28,
        scale: zusatz.gernHinten ? 0.8 : 0.26,
        deckkraft: zusatz.gernHinten ? 0.85 : 1,
      }),
    );
  }
  return emblem;
}
