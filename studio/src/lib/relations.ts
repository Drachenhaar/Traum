/**
 * Das Beziehungssystem – das Herz von Dragoncore Studio.
 *
 * Eine Beziehung ist kein Link. Sie hat eine Bedeutung und eine Richtung:
 *
 *   Weggefährte  --lebt in-->  Nebeltal
 *   Nebeltal     --beherbergt--> Weggefährte     (dieselbe Kante, andersherum gelesen)
 *
 * Aus dieser Gerichtetheit entsteht alles Weitere: der Weltgraph, die
 * Entdeckung entfernter Zusammenhänge und das Weltbuch, das sich selbst
 * gliedert. Ohne Bedeutung wären es nur Fäden; mit Bedeutung wird es eine Welt.
 */

import type { Entry, Relation } from '../types';
import { newId } from './utils';

export interface RelationTypeDef {
  id: string;
  /** So liest man die Kante vorwärts: A ⟶ B */
  label: string;
  /** So liest man sie rückwärts: B ⟵ A */
  inverse: string;
  /** Beide Richtungen bedeuten dasselbe (z. B. „verwandt mit“) */
  symmetric?: boolean;
  /** Farbe im Graphen */
  color: string;
  /** Kurzer Hinweis für die Auswahl */
  hint?: string;
}

export const RELATION_TYPES: RelationTypeDef[] = [
  {
    id: 'lives_in',
    label: 'lebt in',
    inverse: 'beherbergt',
    color: '#8C6D31',
    hint: 'Figur oder Wesen an einem Ort',
  },
  {
    id: 'contains',
    label: 'enthält',
    inverse: 'gehört zu',
    color: '#55604A',
    hint: 'Ort enthält Gebäude, Gebäude enthält Möbel …',
  },
  {
    id: 'made_of',
    label: 'besteht aus',
    inverse: 'steckt in',
    color: '#A8853F',
    hint: 'Objekt aus Material',
  },
  {
    id: 'comes_from',
    label: 'stammt von',
    inverse: 'liefert',
    color: '#7A8467',
    hint: 'Material von Pflanze, Tier oder Ort',
  },
  {
    id: 'grows_in',
    label: 'wächst in',
    inverse: 'beheimatet',
    color: '#3A422F',
    hint: 'Pflanze im Biom',
  },
  {
    id: 'uses',
    label: 'benutzt',
    inverse: 'wird benutzt von',
    color: '#8C7A62',
  },
  {
    id: 'owns',
    label: 'besitzt',
    inverse: 'gehört',
    color: '#6B5B45',
  },
  {
    id: 'wears',
    label: 'trägt',
    inverse: 'wird getragen von',
    color: '#9A7C4E',
  },
  {
    id: 'appears_in',
    label: 'erscheint in',
    inverse: 'zeigt',
    color: '#5E6B7A',
    hint: 'Auftritt in Szene, Quest oder Lore',
  },
  {
    id: 'created_by',
    label: 'entstand aus',
    inverse: 'erzeugte',
    color: '#B08D57',
    hint: 'Asset aus einem Prompt',
  },
  {
    id: 'follows_dna',
    label: 'folgt der Regel',
    inverse: 'prägt',
    color: '#C0A468',
    hint: 'Verbindung zur Welt-DNA',
  },
  {
    id: 'variant_of',
    label: 'Variante von',
    inverse: 'hat Variante',
    color: '#8A8070',
  },
  /*
   * Zeit und Ursache.
   *
   * Der Auftrag verlangt einen Graphen fuer Ursache und Wirkung – „nicht als
   * starre Liste". Den gibt es hier laengst: Beziehungen sind gerichtet und
   * tragen Bedeutung. Ein zweiter Graph nur fuer Kausalitaet waere eine
   * zweite Wahrheit ueber dieselbe Welt, die irgendwann von der ersten
   * abweicht. Also bekommt der vorhandene Graph die fehlenden Kanten.
   */
  {
    id: 'causes',
    label: 'führte zu',
    inverse: 'ging hervor aus',
    color: '#8C3A32',
    hint: 'Ursache und Wirkung – der Tod des Königs führte zum Thronstreit',
  },
  {
    id: 'precedes',
    label: 'ging voraus',
    inverse: 'folgte auf',
    color: '#9A8B6E',
    hint: 'Reihenfolge ohne Ursache – das eine kam vor dem anderen',
  },
  {
    id: 'parent_of',
    label: 'Elternteil von',
    inverse: 'Kind von',
    color: '#A0724A',
    hint: 'Abstammung – trägt später den Stammbaum',
  },
  {
    id: 'married_to',
    label: 'vermählt mit',
    inverse: 'vermählt mit',
    symmetric: true,
    color: '#B08D57',
  },
  {
    id: 'ruled',
    label: 'herrschte über',
    inverse: 'stand unter',
    color: '#5E6B7A',
    hint: 'Figur über Ort, Reich oder Haus',
  },
  {
    id: 'member_of',
    label: 'gehört zu',
    inverse: 'umfasst',
    color: '#6B7A5E',
    hint: 'Zugehörigkeit zu Haus, Orden, Fraktion',
  },
  {
    id: 'related',
    label: 'verwandt mit',
    inverse: 'verwandt mit',
    symmetric: true,
    color: '#A4907A',
  },
  /*
   * Zuneigung und Feindschaft.
   *
   * Es gab bisher „verwandt mit", „gehoert zu" und „herrschte ueber" – und
   * damit liess sich sagen, wer wessen Bruder ist und wer wem untersteht,
   * aber nicht, wer wen mag. Fuer eine Weltdatenbank ging das erstaunlich
   * lange gut; fuer eine Figurenseite geht es nicht: Das Referenzbild
   * gliedert die Beziehungen einer Figur nach Familie, Verbuendeten,
   * Rivalen und Organisationen, und zwei dieser vier waren nicht sagbar.
   *
   * Beide sind bewusst **symmetrisch**. Eine einseitige Feindschaft ist
   * dramatisch interessant und hier trotzdem falsch: Sie waere eine
   * Behauptung ueber das Innenleben der anderen Seite, und die steht auf
   * deren Seite, nicht auf dieser. Wer eine einseitige Feindschaft
   * festhalten will, schreibt sie in die Notiz der Kante – dort gehoert
   * eine Aussage hin, die nur von einer Seite gilt.
   */
  {
    id: 'allied_with',
    label: 'verbündet mit',
    inverse: 'verbündet mit',
    symmetric: true,
    color: '#7A8467',
    hint: 'Freundschaft, Bündnis, Gefolgschaft',
  },
  {
    id: 'opposed_to',
    label: 'verfeindet mit',
    inverse: 'verfeindet mit',
    symmetric: true,
    color: '#8C4A31',
    hint: 'Rivalität, Feindschaft, offene Rechnung',
  },
  /*
   * Roman und Welt.
   *
   * Eine Szene hat keine Felder „Ort" und „POV". Sie hat Kanten – dieselben
   * Kanten, aus denen der Rest der Welt besteht. Deshalb weiss der Ort von
   * der Szene, ohne dass der Ort etwas vom Roman wissen muesste, und
   * deshalb steht auf der Seite von Arven spaeter „kommt vor in: Ankunft in
   * Arven", ohne dass jemand das gebaut hat.
   *
   * `appears_in` gibt es schon und meint genau das Richtige fuer Figuren in
   * einer Szene. Neu sind nur die beiden Kanten, die es noch nicht gab.
   */
  {
    id: 'plays_at',
    label: 'spielt in',
    inverse: 'Schauplatz von',
    color: '#7A8467',
    hint: 'Szene an einem Ort',
  },
  {
    id: 'pov',
    label: 'aus der Sicht von',
    inverse: 'erzählt',
    color: '#8C6D31',
    hint: 'Perspektivfigur einer Szene',
  },
];

/** Kanten, die eine Aussage über zeitliche Abfolge machen. */
export const ZEITLICHE_TYPEN = ['causes', 'precedes'] as const;

const BY_ID = new Map(RELATION_TYPES.map((r) => [r.id, r]));

export function relationType(id: string): RelationTypeDef {
  return BY_ID.get(id) ?? RELATION_TYPES[RELATION_TYPES.length - 1];
}

export function makeRelation(fromId: string, toId: string, type: string, note?: string): Relation {
  return { id: newId('rel'), fromId, toId, type, note, createdAt: Date.now() };
}

/* --------------------------------------------------------------- Nachschlagen */

/**
 * Vorbereiteter Index über alle Beziehungen.
 *
 * Wird einmal je Änderung gebaut und dann überall genutzt – so bleibt auch bei
 * vielen tausend Kanten jede Abfrage sofort beantwortet.
 */
export interface RelationIndex {
  /** Alle Kanten, bei denen der Eintrag Ausgangspunkt ist */
  out: Map<string, Relation[]>;
  /** Alle Kanten, bei denen der Eintrag Ziel ist */
  in: Map<string, Relation[]>;
  /** Nachbarn ohne Richtung – für Graph und Entdeckung */
  neighbours: Map<string, Set<string>>;
  all: Relation[];
}

export function buildRelationIndex(relations: Relation[]): RelationIndex {
  const out = new Map<string, Relation[]>();
  const inn = new Map<string, Relation[]>();
  const neighbours = new Map<string, Set<string>>();

  const push = (map: Map<string, Relation[]>, key: string, rel: Relation) => {
    const list = map.get(key);
    if (list) list.push(rel);
    else map.set(key, [rel]);
  };
  const link = (a: string, b: string) => {
    const set = neighbours.get(a);
    if (set) set.add(b);
    else neighbours.set(a, new Set([b]));
  };

  for (const rel of relations) {
    push(out, rel.fromId, rel);
    push(inn, rel.toId, rel);
    link(rel.fromId, rel.toId);
    link(rel.toId, rel.fromId);
  }

  return { out, in: inn, neighbours, all: relations };
}

/** Eine Beziehung aus Sicht eines bestimmten Eintrags gelesen. */
export interface ReadableRelation {
  relation: Relation;
  /** Der jeweils andere Eintrag */
  otherId: string;
  /** Beschriftung aus Sicht des betrachteten Eintrags */
  label: string;
  /** Zeigt die Kante vom betrachteten Eintrag weg? */
  outgoing: boolean;
  color: string;
}

/** Alle Beziehungen eines Eintrags, bereits richtig herum formuliert. */
export function relationsOf(index: RelationIndex, entryId: string): ReadableRelation[] {
  const result: ReadableRelation[] = [];

  for (const rel of index.out.get(entryId) ?? []) {
    const def = relationType(rel.type);
    result.push({
      relation: rel,
      otherId: rel.toId,
      label: def.label,
      outgoing: true,
      color: def.color,
    });
  }
  for (const rel of index.in.get(entryId) ?? []) {
    const def = relationType(rel.type);
    result.push({
      relation: rel,
      otherId: rel.fromId,
      label: def.symmetric ? def.label : def.inverse,
      outgoing: false,
      color: def.color,
    });
  }
  return result;
}

/** Beziehungen nach Beschriftung gruppieren – so liest sich die Detailseite. */
export function groupRelations(list: ReadableRelation[]): { label: string; color: string; items: ReadableRelation[] }[] {
  const groups = new Map<string, { label: string; color: string; items: ReadableRelation[] }>();
  for (const r of list) {
    const group = groups.get(r.label);
    if (group) group.items.push(r);
    else groups.set(r.label, { label: r.label, color: r.color, items: [r] });
  }
  return [...groups.values()];
}

/* ------------------------------------------------------------------ Entdecken */

export interface Discovery {
  entryId: string;
  /** Der Weg dorthin, als lesbarer Satz */
  path: string;
  /** Über welchen Eintrag führt der Weg? */
  viaId: string;
  distance: number;
}

/**
 * Zweiter Grad: Was hängt mit meinen Nachbarn zusammen, aber noch nicht mit mir?
 *
 * Das ist der Moment, in dem die Welt etwas über sich selbst erzählt:
 * „Der Waldkoi und die Nebelfarne teilen sich ein Biom – wusstest du das?“
 */
export function discoverRelated(
  index: RelationIndex,
  entryId: string,
  entriesById: Map<string, Entry>,
  limit = 6,
): Discovery[] {
  const direct = index.neighbours.get(entryId);
  if (!direct?.size) return [];

  const seen = new Set<string>([entryId, ...direct]);
  const found: Discovery[] = [];

  for (const viaId of direct) {
    const via = entriesById.get(viaId);
    if (!via) continue;
    const viaLabel = via.title;

    for (const rel of relationsOf(index, viaId)) {
      if (seen.has(rel.otherId)) continue;
      const target = entriesById.get(rel.otherId);
      if (!target || target.deletedAt) continue;
      seen.add(rel.otherId);
      found.push({
        entryId: rel.otherId,
        viaId,
        distance: 2,
        path: `über ${viaLabel} · ${rel.label}`,
      });
      if (found.length >= limit * 2) break;
    }
    if (found.length >= limit * 2) break;
  }

  return found.slice(0, limit);
}

/**
 * Kürzester Weg zwischen zwei Einträgen – für die Anzeige
 * „Charakter → Dorf → Gebäude → Möbel → Material“.
 */
export function findPath(
  index: RelationIndex,
  fromId: string,
  toId: string,
  maxDepth = 6,
): string[] | null {
  if (fromId === toId) return [fromId];
  const queue: string[][] = [[fromId]];
  const visited = new Set([fromId]);

  while (queue.length) {
    const path = queue.shift()!;
    const last = path[path.length - 1];
    if (path.length > maxDepth) continue;

    for (const next of index.neighbours.get(last) ?? []) {
      if (visited.has(next)) continue;
      const extended = [...path, next];
      if (next === toId) return extended;
      visited.add(next);
      queue.push(extended);
    }
  }
  return null;
}

/** Wie stark ist ein Eintrag vernetzt? Wird für Knotengröße im Graphen genutzt. */
export function degreeOf(index: RelationIndex, entryId: string): number {
  return index.neighbours.get(entryId)?.size ?? 0;
}

/**
 * Einträge ohne jede Beziehung. Sie sind nicht „falsch“ – aber die App darf
 * sanft darauf hinweisen, damit die Welt zusammenwächst statt zu zerfallen.
 */
export function findOrphans(entries: Entry[], index: RelationIndex): Entry[] {
  return entries.filter((e) => !e.deletedAt && !(index.neighbours.get(e.id)?.size ?? 0));
}
