/**
 * Die Reise.
 *
 * Derselbe Graph wie überall, nur anders betreten: nicht von oben als Karte,
 * sondern von innen, aus der Sicht eines Eintrags. Man beginnt bei Elian und
 * geht seinen Weg – zu seinem Zuhause, in das Observatorium, an das Pult, ins
 * Holz, zum Baum, in den Wald.
 *
 * Der Unterschied zu einer Liste von Knoten ist die **Frage**. Eine Reise
 * bietet nicht „7 Beziehungen" an, sondern:
 *
 *     → seinen Heimatort besuchen
 *     → die Herkunft eines Materials entdecken
 *     → einer bekannten Person folgen
 *
 * Dieselbe Kante, in der Sprache eines Menschen, der unterwegs ist. Das ist
 * die ganze Datei: Kanten in Einladungen übersetzen, Pfade finden, und dabei
 * nicht im Kreis laufen.
 *
 * Zwei harte Grenzen, beide aus dem Auftrag und beide notwendig:
 *
 *   **Keine Endlosschleife.** Selbstgebaute Welten haben Zyklen – „A enthält
 *   B, B enthält A" ist schnell geschrieben. Jede Traversierung hier führt
 *   ein Gedächtnis mit.
 *
 *   **Begrenzte Länge.** Ein Pfad über zwanzig Stationen ist kein Weg mehr,
 *   sondern eine Datenbankausgabe.
 */

import type { Entry } from '../../types';
import { relationType } from '../relations';
import { bestandZu, galtZu, type Weltsicht } from './abfrage';

/** Wie weit eine vorgeschlagene Route höchstens führt. */
export const MAX_STATIONEN = 7;

/* ------------------------------------------------------- Die Einladung ---- */

/**
 * Ein möglicher nächster Schritt.
 *
 * `einladung` ist der Satz, den man liest; `warum` die Beziehung, aus der er
 * entsteht. Beides steht da, weil man dem Buch glauben können soll: Wer
 * wissen will, warum ihm dieser Weg angeboten wird, findet die Kante.
 */
export interface Schritt {
  ziel: Entry;
  einladung: string;
  warum: string;
  relationId: string;
}

/**
 * Wie eine Kante klingt, wenn man auf ihr geht.
 *
 * Der Schlüssel ist Beziehungsart plus Richtung. Was hier nicht steht, bekommt
 * eine schlichte Fassung aus dem Beziehungsregister – keine Lücke, nur weniger
 * Farbe. Deshalb ist diese Tabelle unvollständig und darf es bleiben.
 */
const EINLADUNG: Record<string, (titel: string) => string> = {
  'lives_in:hinaus': (t) => `nach ${t} gehen, wo es zuhause ist`,
  'lives_in:herein': (t) => `${t} treffen, die hier lebt`,
  'grows_in:hinaus': (t) => `dorthin, wo es wächst: ${t}`,
  'grows_in:herein': (t) => `sehen, was hier wächst: ${t}`,
  'contains:hinaus': (t) => `hineingehen: ${t}`,
  'contains:herein': (t) => `einen Schritt zurücktreten, nach ${t}`,
  'made_of:hinaus': (t) => `erfahren, woraus es besteht: ${t}`,
  'made_of:herein': (t) => `sehen, was daraus gemacht wurde: ${t}`,
  'comes_from:hinaus': (t) => `der Herkunft folgen bis ${t}`,
  'comes_from:herein': (t) => `sehen, was von hier stammt: ${t}`,
  'member_of:hinaus': (t) => `zu ${t} gehen, wohin es gehört`,
  'member_of:herein': (t) => `${t} begegnen, die dazugehört`,
  'ruled:hinaus': (t) => `das Herrschaftsgebiet betreten: ${t}`,
  'ruled:herein': (t) => `sehen, wer hier herrschte: ${t}`,
  'parent_of:hinaus': (t) => `zum Kind: ${t}`,
  'parent_of:herein': (t) => `zur Herkunft: ${t}`,
  'causes:hinaus': (t) => `sehen, was daraus folgte: ${t}`,
  'causes:herein': (t) => `zurück zur Ursache: ${t}`,
  'uses:hinaus': (t) => `dem nachgehen, was es braucht: ${t}`,
  'uses:herein': (t) => `sehen, wer das braucht: ${t}`,
  'plays_at:hinaus': (t) => `an den Schauplatz: ${t}`,
  'appears_in:hinaus': (t) => `in die Szene, in der es vorkommt: ${t}`,
};

function einladung(art: string, hinaus: boolean, titel: string): string {
  const bauen = EINLADUNG[`${art}:${hinaus ? 'hinaus' : 'herein'}`];
  if (bauen) return bauen(titel);
  const def = relationType(art);
  return `${hinaus ? def.label : (def.inverse)}: ${titel}`;
}

/**
 * Wohin man von hier aus gehen kann.
 *
 * `gesehen` sind die Stationen, an denen man schon war – sie werden nicht
 * erneut angeboten. Ohne das führte jeder zweite Schritt dorthin zurück, wo
 * man herkam, und eine Reise, die zurückführt, ist ein Spaziergang um den
 * Block.
 *
 * `zeitpunkt` verengt auf das, was damals bestand. Ohne Angabe gilt alles.
 */
export function wegeVon(
  sicht: Weltsicht,
  vonId: string,
  gesehen: Set<string> = new Set(),
  zeitpunkt?: number,
): Schritt[] {
  const schritte: Schritt[] = [];
  const nimm = (relId: string, art: string, zielId: string, hinaus: boolean) => {
    if (gesehen.has(zielId)) return;
    const ziel = sicht.byId.get(zielId);
    if (!ziel) return;
    if (zeitpunkt !== undefined && !bestandZu(sicht, zielId, zeitpunkt)) return;
    schritte.push({
      ziel,
      einladung: einladung(art, hinaus, ziel.title),
      warum: hinaus ? relationType(art).label : (relationType(art).inverse),
      relationId: relId,
    });
  };

  for (const r of sicht.index.out.get(vonId) ?? []) {
    if (zeitpunkt !== undefined && !galtZu(sicht, r, zeitpunkt)) continue;
    nimm(r.id, r.type, r.toId, true);
  }
  for (const r of sicht.index.in.get(vonId) ?? []) {
    if (zeitpunkt !== undefined && !galtZu(sicht, r, zeitpunkt)) continue;
    nimm(r.id, r.type, r.fromId, false);
  }
  return schritte;
}

/* ---------------------------------------------------- Fertige Routen ------ */

/**
 * Eine Route, die das Buch von selbst gefunden hat.
 *
 * `spur` ist die Kette von Beziehungsarten, der gefolgt wird. Sie steht als
 * Daten da und nicht als Code, weil eine neue Route dann eine Zeile ist.
 */
export interface Routenart {
  id: string;
  name: string;
  /** Was einen dort erwartet – erscheint unter dem Namen. */
  verspricht: string;
  /** Von welchen Typen aus sie überhaupt beginnt. Leer heißt: von überall. */
  start: string[];
  /** Die Kette. `herein` kehrt die Richtung um. */
  spur: { art: string; richtung: 'hinaus' | 'herein' }[];
}

export const ROUTEN: Routenart[] = [
  {
    id: 'herkunft',
    name: 'Die Herkunftsreise',
    verspricht: 'Von einem Gegenstand zurück bis zu dem Boden, auf dem er gewachsen ist.',
    start: ['prop', 'furniture', 'artifact', 'clothing', 'architecture'],
    spur: [
      { art: 'made_of', richtung: 'hinaus' },
      { art: 'comes_from', richtung: 'hinaus' },
      { art: 'grows_in', richtung: 'hinaus' },
      { art: 'contains', richtung: 'herein' },
    ],
  },
  {
    id: 'zuhause',
    name: 'Der Weg nach Hause',
    verspricht: 'Von einer Figur über ihr Zuhause bis dorthin, wo dieses liegt.',
    start: ['character', 'creature', 'animal'],
    spur: [
      { art: 'lives_in', richtung: 'hinaus' },
      { art: 'contains', richtung: 'herein' },
      { art: 'contains', richtung: 'herein' },
    ],
  },
  {
    id: 'politik',
    name: 'Die politische Reise',
    verspricht: 'Von einer Figur zu dem, wozu sie gehört – und zu dessen Gebiet.',
    start: ['character'],
    spur: [
      { art: 'member_of', richtung: 'hinaus' },
      { art: 'ruled', richtung: 'hinaus' },
      { art: 'contains', richtung: 'hinaus' },
    ],
  },
  {
    id: 'hinein',
    name: 'Immer weiter hinein',
    verspricht: 'Von einer Gegend über den Ort und das Bauwerk bis zu dem, was darin steht.',
    start: ['biome', 'location'],
    spur: [
      { art: 'contains', richtung: 'hinaus' },
      { art: 'contains', richtung: 'hinaus' },
      { art: 'contains', richtung: 'hinaus' },
    ],
  },
  {
    id: 'folgen',
    name: 'Ursache und Folge',
    verspricht: 'Von einem Ereignis zu dem, was daraus wurde.',
    start: ['lore', 'quest', 'moment', 'epoche'],
    spur: [
      { art: 'causes', richtung: 'hinaus' },
      { art: 'causes', richtung: 'hinaus' },
      { art: 'causes', richtung: 'hinaus' },
    ],
  },
];

export interface Route {
  art: Routenart;
  /** Die Stationen, mit dem Ausgangspunkt vorn. */
  stationen: Entry[];
}

/**
 * Einer Spur folgen, so weit sie trägt.
 *
 * Bricht ab, sobald ein Glied fehlt – lieber eine kurze Reise als eine, die
 * einen Schritt erfindet. Führt eine Art zu mehreren Zielen, wird das
 * erstbeste genommen: Eine Route ist ein Vorschlag, keine Vollständigkeit.
 */
function folgeSpur(sicht: Weltsicht, startId: string, art: Routenart, zeitpunkt?: number): Entry[] {
  const start = sicht.byId.get(startId);
  if (!start) return [];
  const stationen = [start];
  const gesehen = new Set([startId]);
  let hier = startId;

  for (const glied of art.spur) {
    if (stationen.length >= MAX_STATIONEN) break;
    const kanten =
      glied.richtung === 'hinaus' ? sicht.index.out.get(hier) : sicht.index.in.get(hier);
    const naechste = (kanten ?? [])
      .filter((r) => r.type === glied.art)
      .filter((r) => zeitpunkt === undefined || galtZu(sicht, r, zeitpunkt))
      .map((r) => (glied.richtung === 'hinaus' ? r.toId : r.fromId))
      .find((id) => !gesehen.has(id) && sicht.byId.has(id));
    if (!naechste) break;
    gesehen.add(naechste);
    stationen.push(sicht.byId.get(naechste)!);
    hier = naechste;
  }
  return stationen;
}

/**
 * Welche Reisen von hier aus lohnen.
 *
 * Nur solche mit mindestens drei Stationen. Eine Reise aus zwei Punkten ist
 * eine Beziehung, und die sieht man ohnehin schon auf der Seite – sie hier
 * noch einmal als „Route" anzubieten wäre eine Behauptung von Tiefe, die
 * nicht da ist.
 */
export function routenVon(sicht: Weltsicht, startId: string, zeitpunkt?: number): Route[] {
  const start = sicht.byId.get(startId);
  if (!start) return [];
  return ROUTEN.filter((a) => !a.start.length || a.start.includes(start.type))
    .map((art) => ({ art, stationen: folgeSpur(sicht, startId, art, zeitpunkt) }))
    .filter((r) => r.stationen.length >= 3);
}

/**
 * Der weiteste Weg, den man von hier aus gehen kann.
 *
 * Für den Fall, dass keine der fertigen Routen greift: eine Tiefensuche mit
 * Gedächtnis, die den längsten kreuzungsfreien Weg nimmt. Kein Anspruch auf
 * den *besten* – nur darauf, dass es einer ist und dass er endet.
 */
export function weitesterWeg(sicht: Weltsicht, startId: string, zeitpunkt?: number): Entry[] {
  let beste: string[] = [startId];

  const gehe = (hier: string, weg: string[], gesehen: Set<string>) => {
    if (weg.length > beste.length) beste = [...weg];
    if (weg.length >= MAX_STATIONEN) return;
    for (const s of wegeVon(sicht, hier, gesehen, zeitpunkt)) {
      gesehen.add(s.ziel.id);
      weg.push(s.ziel.id);
      gehe(s.ziel.id, weg, gesehen);
      weg.pop();
      gesehen.delete(s.ziel.id);
    }
  };

  gehe(startId, [startId], new Set([startId]));
  return beste.map((id) => sicht.byId.get(id)).filter((e): e is Entry => !!e);
}
