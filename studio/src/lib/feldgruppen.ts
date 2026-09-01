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

/*
 * Sieben Gruppen waren zu grob.
 *
 * „Wer oder was ist das?" trug bei einer Figur vierundzwanzig Felder – Rolle,
 * Alter, Gesicht, Haare, Kleidung, Persoenlichkeit, Eigenarten, Herkunft. Das
 * ist keine Frage mehr, das ist wieder die Liste, nur mit einer Ueberschrift
 * davor. Wer eine Figur *setzt*, denkt in kleineren Schritten: erst wer sie
 * ist, dann was in ihr vorgeht, dann woher sie kommt, dann wie sie aussieht.
 *
 * Zugeordnet wird weiterhin nach Feldschluessel und nicht je Vorlage – eine
 * Zeile hier ordnet dasselbe Feld in allen zweiunddreissig Vorlagen. Die
 * Gruppen sind deshalb so benannt, dass sie auch fuer einen Ort, ein Material
 * und eine Kreatur stimmen: „Woher es kommt" passt auf eine Figur wie auf ein
 * Schwert.
 *
 * Kurze Vorlagen bleiben ungegliedert (siehe `AB_HIER`) – eine Vorlage mit
 * vier Feldern in vier Abschnitte zu zerlegen waere das Gegenteil von Ordnung.
 */
export const FELDGRUPPEN: Feldgruppe[] = [
  { id: 'kern', label: 'Der Kern', frage: '', offen: true },
  { id: 'wesen', label: 'Was in ihm vorgeht', frage: 'Was in ihm vorgeht', offen: true },
  { id: 'herkunft', label: 'Woher es kommt', frage: 'Woher es kommt', offen: false },
  { id: 'erscheinung', label: 'Wie es aussieht', frage: 'Wie es aussieht', offen: false },
  { id: 'wirkung', label: 'Was es tut', frage: 'Was es tut', offen: false },
  { id: 'umfeld', label: 'Wo es hingehört', frage: 'Wo es hingehört', offen: false },
  { id: 'alltag', label: 'Wie sein Alltag aussieht', frage: 'Wie sein Alltag aussieht', offen: false },
  { id: 'werden', label: 'Werden und Vergehen', frage: 'Werden und Vergehen', offen: false },
  { id: 'sinne', label: 'Wie es sich anfühlt', frage: 'Wie es sich anfühlt', offen: false },
  { id: 'ausdruck', label: 'Wie es im Buch erscheint', frage: 'Wie es im Buch erscheint', offen: false },
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

/*
 * Der Kern: die kurzen Angaben, mit denen eine Seite beginnt. Sie stehen im
 * Buch als Kopfzeilen unter dem Namen und nicht als Absaetze.
 */
zuordnen('kern', [
  'role', 'age', 'species', 'subcategory', 'size', 'sizes', 'scale', 'orientation',
  /*
   * `stage` steht **nicht** hier, obwohl „Stufe" nach einem Kennzeichen
   * klingt. Es ist die Produktionsstufe eines Assets und gehoert zu
   * `handwerk`. Es stand kurz in beiden Listen, und weil `NACH_SCHLUESSEL`
   * die letzte Zuordnung gewinnen laesst, war die Doppelung unsichtbar: Das
   * Feld landete stillschweigend beim Handwerk und die Zeile hier war eine
   * Behauptung ohne Wirkung.
   */
  'era',
]);

zuordnen('wesen', [
  'personality', 'quirks', 'goals', 'wishes', 'fears', 'wesen', 'faehigkeiten',
  'truth', 'unsaid', 'intent', 'purpose', 'feeling', 'mood',
]);

/*
 * `background` heisst „Vergangenheit" – was geschah, bevor wir die Figur
 * treffen. Es steht bei der Herkunft und nicht beim Umfeld: Das eine ist,
 * woher jemand kommt, das andere, wo er gerade ist.
 *
 * `speech` und `dialect` stehen ebenfalls hier. Wie jemand spricht, ist in
 * jeder Welt zuerst eine Auskunft darueber, wo er aufgewachsen ist.
 */
zuordnen('herkunft', [
  'herkunft', 'volk', 'zugehoerigkeit', 'origin', 'background', 'speech', 'dialect',
  'owner', 'maker', 'teller', 'speaker', 'listener', 'foundAt', 'source',
  'bildVergangenheit',
]);

zuordnen('erscheinung', [
  'appearance', 'face', 'hair', 'clothing', 'marks', 'shapes', 'fabric', 'cut',
  'bodyParts', 'palette', 'finish', 'hardness', 'details',
]);

zuordnen('wirkung', [
  'behaviour', 'voice', 'sound', 'manner', 'movement', 'locomotion', 'tempo',
  'effect', 'magic', 'rule', 'principle', 'limit', 'trigger', 'consequence',
  'usage', 'handling', 'ritual', 'steps', 'chain', 'because', 'doThis', 'notThis',
  'reward', 'hook',
]);

zuordnen('umfeld', [
  'habitat', 'territory', 'region', 'climate', 'ground', 'lifeforms',
  'symbiosis', 'interior', 'construction', 'occasion', 'scene', 'perspective',
]);

/*
 * Der Alltag – was jemand *taeglich* tut. Vorher lag das bei „Was tut es?"
 * neben Wirkung und Regeln, und ein Tagesablauf ist etwas anderes als eine
 * Wirkung: Das eine erzaehlt ein Leben, das andere eine Mechanik.
 */
zuordnen('alltag', [
  'routine', 'habits', 'memories', 'places', 'sleep', 'diet', 'timeOfDay',
]);

zuordnen('werden', [
  'growth', 'aging', 'decay', 'rebirth', 'span', 'making', 'wear', 'states',
  'variants', 'change', 'loop', 'season', 'mating', 'migration', 'tracks',
]);

zuordnen('sinne', [
  'light', 'smell', 'weather', 'air', 'water', 'atmosphere', 'symbolism',
]);

/*
 * Wie es im Buch erscheint.
 *
 * Der Buchauftritt, das Zitat und die Randbemerkung sagen nichts darueber,
 * *wer* jemand ist, sondern darueber, **wie man ihm auf der Seite begegnet**.
 * Fuer ein Weltbuch ist das eine Nebensaechlichkeit; fuer ein Buch, aus dem
 * ein Roman werden soll, ist es die halbe Figur – und deshalb ein eigener
 * Abschnitt statt einer Zeile unter „Weiteres".
 */
zuordnen('ausdruck', [
  'buchauftritt', 'zitat', 'randbemerkung', 'story', 'pivot', 'summary', 'notes',
  'known', 'bildAuftritt',
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
