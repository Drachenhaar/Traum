/**
 * Felder nach menschlichen Fragen ordnen, nicht nach Speicherreihenfolge.
 *
 * Eine Vorlage zaehlt heute achtzehn Felder auf, in der Reihenfolge, in der
 * sie eingetragen wurden. Das ist die Ordnung der Datenbank, nicht die des
 * Denkens: Niemand fragt sich „Feld 7 bis 12", sondern „Wer ist das?", „Was
 * tut es?", „Wo lebt es?".
 *
 * **Zugeordnet wird nach Feldschluessel, nicht je Vorlage.** Die Schluessel
 * wiederholen sich quer durch alle Vorlagen – `size`, `behaviour`, `habitat`
 * stehen bei Tier, Kreatur und Pflanze gleichermassen. Eine Zuordnung hier
 * deckt damit alle achtundzwanzig Vorlagen ab, ohne eine einzige davon
 * anzufassen. Und eine neue Vorlage ist automatisch mit geordnet, solange sie
 * bekannte Schluessel benutzt.
 *
 * Was nicht zugeordnet ist, verschwindet nicht – es faellt ans Ende unter
 * „Weiteres". Das ist der wichtige Teil: Die Oberflaeche wird ruhiger, aber
 * kein Feld geht verloren.
 */

export interface Feldgruppe {
  id: string;
  /** Ueberschrift beim Bearbeiten. Leer heisst: kein eigener Abschnitt. */
  label: string;
  /** Frage im Lesemodus. Leer heisst: keine Frage ueber den Text setzen. */
  frage: string;
  /** Steht der Abschnitt beim Oeffnen offen? */
  offen: boolean;
}

export const FELDGRUPPEN: Feldgruppe[] = [
  { id: 'wesen', label: 'Wer oder was ist das?', frage: 'Wer oder was ist das?', offen: true },
  { id: 'wirkung', label: 'Was tut es?', frage: 'Was tut es?', offen: true },
  { id: 'umfeld', label: 'Wo gehört es hin?', frage: 'Wo gehört es hin?', offen: false },
  { id: 'leben', label: 'Sein Werden und Vergehen', frage: 'Sein Werden und Vergehen', offen: false },
  { id: 'sinne', label: 'Wie es sich anfühlt', frage: 'Wie es sich anfühlt', offen: false },
  { id: 'inneres', label: 'Was darunter liegt', frage: 'Was darunter liegt', offen: false },
  { id: 'handwerk', label: 'Für die Herstellung', frage: 'Für die Herstellung', offen: false },
  /*
   * „Weiteres" ist eine Schublade, keine Frage. Beim Bearbeiten braucht sie
   * eine Beschriftung, damit klar ist, was da unten liegt – im Lesemodus
   * waere „Weiteres" ueber einem Absatz nur ein Achselzucken.
   */
  { id: 'weiteres', label: 'Weiteres', frage: '', offen: false },
];

/**
 * Wenn nicht gegliedert wird, kommt alles hierher: eine Gruppe, keine
 * Ueberschrift, keine Frage.
 */
const ALLES: Feldgruppe = { id: 'alles', label: '', frage: '', offen: true };

/**
 * Ab wie vielen Feldern lohnt sich die Gliederung?
 *
 * Sechs Felder liest man am Stueck. Erst darueber wird die Liste zur Wand,
 * und erst dann traegt eine Ueberschrift mehr ein, als sie kostet. Die
 * Musik-Vorlage hat vier Felder – die in vier Abschnitte zu zerlegen waere
 * das Gegenteil von Ordnung.
 */
const AB_HIER = 7;

/**
 * Schluessel → Gruppe.
 *
 * Bewusst als flache Tabelle: Wer ein Feld verschieben will, aendert eine
 * Zeile. Wer eine neue Gruppe braucht, traegt sie oben ein.
 */
const NACH_SCHLUESSEL: Record<string, string> = {};

function zuordnen(gruppe: string, schluessel: string[]) {
  for (const k of schluessel) NACH_SCHLUESSEL[k] = gruppe;
}

zuordnen('wesen', [
  'appearance', 'face', 'hair', 'species', 'subcategory', 'size', 'sizes', 'age',
  'role', 'personality', 'quirks', 'marks', 'shapes', 'clothing', 'fabric', 'cut',
  'bodyParts', 'scale', 'orientation', 'owner', 'maker', 'speaker', 'teller', 'listener',
]);

zuordnen('wirkung', [
  'behaviour', 'habits', 'routine', 'voice', 'sound', 'speech', 'dialect', 'manner',
  'movement', 'locomotion', 'tempo', 'effect', 'magic', 'rule', 'principle', 'limit',
  'trigger', 'consequence', 'usage', 'handling', 'purpose', 'intent', 'ritual',
  'steps', 'chain', 'because', 'doThis', 'notThis', 'reward', 'hook', 'goals',
]);

zuordnen('umfeld', [
  'habitat', 'territory', 'region', 'places', 'climate', 'ground', 'lifeforms',
  'symbiosis', 'interior', 'construction', 'foundAt', 'origin',
  'sleep', 'diet', 'mating', 'migration', 'tracks', 'occasion', 'scene', 'perspective',
]);

zuordnen('leben', [
  'growth', 'aging', 'decay', 'rebirth', 'era', 'span', 'making', 'wear', 'states',
  'variants', 'change', 'loop', 'season', 'timeOfDay',
]);

zuordnen('sinne', [
  'light', 'smell', 'weather', 'air', 'water', 'mood', 'atmosphere', 'feeling',
  'palette', 'finish', 'hardness', 'details', 'symbolism',
]);

zuordnen('inneres', [
  'wishes', 'fears', 'memories', 'truth', 'unsaid', 'known', 'story', 'pivot',
  'summary', 'notes', 'source',
  /*
   * `background` heisst „Vergangenheit" – was geschah, bevor wir die Figur
   * treffen. Das ist kein Umfeld, auch wenn das Wort danach klingt: Es
   * gehoert zu dem, was unter der Oberflaeche liegt.
   */
  'background',
  /*
   * Der Buchauftritt und das Zitat gehoeren hierher und nicht ans Ende.
   *
   * Beide sagen nichts ueber das Umfeld einer Figur, sondern darueber, wie
   * sie sich zeigt – der eine, wie man sie zum ersten Mal erlebt, das andere,
   * wie sie klingt. Ohne diese Zeile fielen sie unter „Weiteres", und das ist
   * genau die Schublade fuer Dinge, an die niemand gedacht hat.
   */
  'buchauftritt', 'zitat',
]);

zuordnen('handwerk', [
  'prompt', 'negativePrompt', 'model', 'seed', 'resolution', 'aspectRatio',
  'fileFormat', 'lod', 'frames', 'duration', 'easing', 'animatable', 'animationNotes',
  'motionRefs', 'turnaround', 'cutout', 'stage', 'assetId', 'exportNote', 'rating',
  'style', 'cost', 'instruments', 'isTemplate',
  'keyImages', 'referenceImages', 'conceptImages', 'approvedImages', 'resultImages',
  'gameImages', 'sketches', 'finals', 'expressions',
]);

/** Zu welcher Gruppe gehoert dieses Feld? Unbekanntes faellt ans Ende. */
export function gruppeVon(schluessel: string): string {
  return NACH_SCHLUESSEL[schluessel] ?? 'weiteres';
}

/**
 * Felder in Gruppen einteilen – in der Reihenfolge von `FELDGRUPPEN`, und
 * innerhalb einer Gruppe in der Reihenfolge der Vorlage. Leere Gruppen
 * entfallen: Eine Ueberschrift ohne Inhalt ist eine Behauptung.
 *
 * Kurze Listen bleiben ungegliedert – sie kommen als eine namenlose Gruppe
 * zurueck, damit Bearbeiten und Lesen dieselbe Entscheidung treffen.
 */
export function gruppiere<T extends { key: string }>(
  felder: T[],
): { gruppe: Feldgruppe; felder: T[] }[] {
  if (felder.length < AB_HIER) {
    return felder.length > 0 ? [{ gruppe: ALLES, felder }] : [];
  }

  const nach = new Map<string, T[]>();
  for (const f of felder) {
    const g = gruppeVon(f.key);
    if (!nach.has(g)) nach.set(g, []);
    nach.get(g)!.push(f);
  }
  return FELDGRUPPEN.map((gruppe) => ({ gruppe, felder: nach.get(gruppe.id) ?? [] })).filter(
    (g) => g.felder.length > 0,
  );
}
