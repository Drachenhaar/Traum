/**
 * Die Chroniken von Mooshalde.
 *
 * Eine einzige kleine Beispielwelt für alle Wege – nicht fünf. Sie besteht aus
 * wenigen Einträgen, die bewusst stark miteinander verbunden sind: Genau
 * daraus entsteht der Moment, in dem jemand versteht, dass Dragoncore nicht
 * Einträge sammelt, sondern sie verbindet.
 *
 * **Sie wird nicht in die Datenbank geschrieben.** Die Schauseiten zeigen sie
 * aus dem Arbeitsspeicher und blättern danach weiter. Nichts davon muss
 * hinterher aufgeräumt werden, und niemand findet am zweiten Tag fremde
 * Figuren in seinem eigenen Buch.
 *
 * Es sind trotzdem gewöhnliche `Entry` und `Relation` – dieselben Formen wie
 * überall sonst, kein zweites Datenmodell und kein zweiter Graph. Was hier
 * gezeigt wird, ist genau das, was der Verfasser später selbst baut.
 */

import type { Entry, EntryType, Relation } from '../../types';

function eintrag(
  id: string,
  type: EntryType,
  title: string,
  patch: Partial<Entry> = {},
): Entry {
  return {
    id: `demo_${id}`,
    title,
    subtitle: '',
    type,
    category: '',
    description: '',
    tags: [],
    status: 'Freigegeben',
    favorite: false,
    createdAt: 0,
    updatedAt: 0,
    linkedEntryIds: [],
    blocks: [],
    fields: {},
    ...patch,
  };
}

function kante(from: string, to: string, type: string, patch: Partial<Relation> = {}): Relation {
  return {
    id: `demo_r_${from}_${to}_${type}`,
    fromId: `demo_${from}`,
    toId: `demo_${to}`,
    type,
    createdAt: 0,
    ...patch,
  };
}

export const DEMO_EINTRAEGE: Entry[] = [
  eintrag('mooshalde', 'location', 'Mooshalde', {
    subtitle: 'Am Rand des alten Nebelwaldes',
    category: 'Siedlung',
    description:
      'Ein kleines Dorf, das seit jeher mehr Ziegen als Einwohner zählt. Wer hier fortgeht, kommt meist wieder.',
    beginn: '874',
    tags: ['Dorf', 'Nebelwald'],
  }),
  eintrag('elian', 'character', 'Elian', {
    subtitle: 'Schmiedelehrling aus Mooshalde',
    category: 'Hauptfigur',
    description: 'Elian war siebzehn, als er Mooshalde zum ersten Mal verließ.',
    beginn: '1021',
    fields: { role: 'Schmiedelehrling' },
    tags: ['Schmied'],
  }),
  eintrag('mara', 'character', 'Mara', {
    subtitle: 'Elians Mutter',
    category: 'Nebenfigur',
    description:
      'Sie kennt einen Teil der Geschichte des Sternenschlüssels – und schweigt darüber, solange sie kann.',
    beginn: '994',
  }),
  eintrag('schluessel', 'artifact', 'Sternenschlüssel', {
    subtitle: 'Herkunft unbekannt',
    description: 'Ein alter Schlüssel, zu dem niemand mehr das Schloss kennt.',
  }),
  eintrag('arven', 'location', 'Arven', {
    subtitle: 'Befestigte Stadt im Norden',
    category: 'Siedlung',
    beginn: '702',
    ende: '1041',
  }),
  eintrag('fall', 'lore', 'Der Fall von Arven', {
    subtitle: 'Was danach nicht mehr war wie zuvor',
    category: 'Krieg',
    description: 'In einer einzigen Nacht endete, was dreihundert Jahre gestanden hatte.',
    beginn: '1041',
    ende: '1041',
  }),
  eintrag('flucht', 'lore', 'Die Flucht dreier Familien', {
    category: 'Wanderung',
    description: 'Sie nahmen mit, was sie tragen konnten, und gingen nach Süden.',
    beginn: '1041',
  }),
  eintrag('nordhain', 'location', 'Nordhain', {
    subtitle: 'Gegründet von Fortgegangenen',
    category: 'Siedlung',
    beginn: '1044',
  }),
];

export const DEMO_KANTEN: Relation[] = [
  kante('elian', 'mooshalde', 'lives_in'),
  kante('mara', 'elian', 'parent_of'),
  kante('elian', 'schluessel', 'owns', { beginn: '1038' }),
  kante('elian', 'fall', 'appears_in'),
  kante('fall', 'flucht', 'causes'),
  kante('flucht', 'nordhain', 'causes'),
  kante('mara', 'mooshalde', 'lives_in'),
];

/** Die Jahre, die auf der Zeit-Schauseite stehen. */
export const DEMO_ZEITPUNKTE: { jahr: number; was: string; id: string }[] = [
  { jahr: 1021, was: 'Elian wird geboren', id: 'demo_elian' },
  { jahr: 1038, was: 'Elian verlässt Mooshalde', id: 'demo_elian' },
  { jahr: 1041, was: 'Der Fall von Arven', id: 'demo_fall' },
  { jahr: 1044, was: 'Nordhain wird gegründet', id: 'demo_nordhain' },
  { jahr: 1057, was: 'Elian kehrt zurück', id: 'demo_mooshalde' },
];

export function demoEintrag(kurz: string): Entry {
  const e = DEMO_EINTRAEGE.find((x) => x.id === `demo_${kurz}`);
  if (!e) throw new Error(`Beispielwelt kennt „${kurz}" nicht`);
  return e;
}
