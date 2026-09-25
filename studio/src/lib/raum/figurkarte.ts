/**
 * Die Tiefenkarte einer Figur.
 *
 * Vier Richtungen aus dem Referenzbild:
 *
 *   OBEN    Wissen · Geschichte · Hintergrund
 *   LINKS   Herkunft · Ort · Welt
 *   RECHTS  Beziehungen · Verbündete · Konflikte
 *   UNTEN   Notizen · Erinnerungen · Fundstücke
 *
 * ---
 *
 * **Diese Datei ist die zweite Verantwortlichkeit und sonst nichts.**
 *
 * Sie übersetzt eine Bewegung in Bedeutung. Sie holt keine Daten (das tut das
 * Weltmodell) und sie zeichnet nichts (das tut `Tiefenraum`). Was sie von der
 * Welt wissen darf, ist genau eine Frage: *liegt in dieser Richtung etwas?*
 *
 * ---
 *
 * **Warum die Karte trotzdem in die Daten sieht.**
 *
 * Die Versuchung wäre, jeder Figur alle vier Richtungen zu geben – das
 * Referenzbild zeigt schließlich vier. Genau davor warnt die Tiefenkarte:
 * Eine Richtung offenzuhalten, in der nichts liegt, heißt, dort etwas zu
 * erfinden. Eine Figur ohne eine einzige Beziehung hat keinen Beziehungsraum;
 * sie hat eine Leerstelle, und die zu zeigen wäre eine Lüge über die Welt.
 *
 * Deshalb prüft jede Richtung ihre eigene Bedingung. Und deshalb steht hier
 * kein `else` mit einem Ersatzraum.
 *
 * Der Preis ist ehrlich und soll benannt sein: Eine frisch angelegte Figur
 * ohne Text und ohne Kanten hat **keine** Tiefe, und das Referenzbild zeigt
 * sie mit vier. Das Bild zeigt eine ausgearbeitete Figur. Wer eine solche
 * anlegt, bekommt vier Richtungen; wer eine leere anlegt, soll nicht vier
 * Türen bekommen, hinter denen nichts steht.
 */

import type { Entry, Relation } from '../../types';
import { karte, tieferWeg, weg, type Tiefenkarte } from './tiefenkarte';

/* ------------------------------------------------------------- Auskunft --- */

/**
 * Was diese Datei über die Welt wissen muss – und nicht mehr.
 *
 * Bewusst ein eigenes, winziges Bündel statt des ganzen Speichers: Wenn hier
 * `useStudio` stünde, könnte diese Datei morgen Einträge ändern, und die
 * Trennung wäre nur noch eine Behauptung im Kommentar.
 */
export interface Figurlage {
  entry: Entry;
  /** Die Kanten dieser Figur, in beide Richtungen gelesen. */
  kanten: { relation: Relation; otherId: string }[];
  /** Ob ein Eintrag existiert und sichtbar ist – für Kanten ins Leere. */
  kennt: (id: string) => boolean;
}

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const liste = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()) : [];

/** Hat mindestens eines dieser Felder Inhalt? */
function etwasDa(e: Entry, felder: string[]): boolean {
  return felder.some((f) => text(e.fields?.[f]).length > 0 || liste(e.fields?.[f]).length > 0);
}

/* ------------------------------------------------- Die vier Bedingungen --- */

/**
 * Welche Kanten in der Beziehungsliste stehen.
 *
 * **Nicht alle.** Eine Figur, die ein Schwert besitzt und in Mooshalde lebt,
 * hat zwei Kanten und keine zwei Beziehungen. Der Beziehungsraum zeigt
 * Verbindungen zu *anderen Wesen*; alles andere gehört nach links (Orte) oder
 * nach unten (Besitz). Dass beides dieselbe Kantentabelle benutzt, ist der
 * Sinn der Sache – eine Wahrheit, verschieden befragt.
 */
export const BEZIEHUNGSARTEN = new Set([
  'parent_of',
  'married_to',
  'related',
  'allied_with',
  'opposed_to',
  'member_of',
  'ruled',
  'created_by',
  'pov',
]);

/** Kanten, die einen Ort oder eine Welt betreffen. */
export const HERKUNFTSARTEN = new Set(['lives_in', 'grows_in', 'plays_at', 'member_of']);

/** Kanten, die auf Dinge zeigen – Fundstücke im Sinne des Referenzbildes. */
export const FUNDSTUECKARTEN = new Set(['owns', 'wears', 'uses']);

export function beziehungenVon(lage: Figurlage) {
  return lage.kanten.filter((k) => BEZIEHUNGSARTEN.has(k.relation.type) && lage.kennt(k.otherId));
}

export function herkunftVon(lage: Figurlage) {
  return lage.kanten.filter((k) => HERKUNFTSARTEN.has(k.relation.type) && lage.kennt(k.otherId));
}

export function fundstueckeVon(lage: Figurlage) {
  return lage.kanten.filter((k) => FUNDSTUECKARTEN.has(k.relation.type) && lage.kennt(k.otherId));
}

/* Die Felder, die je Richtung zählen. Aufgezählt und nicht geraten – siehe
 * den Fall `wesen`/`bewohner` in `Tiefenraum.tsx`, der genau daran scheiterte. */
export const WISSENSFELDER = ['background', 'personality', 'speech', 'goals', 'wishes', 'fears'];
export const HERKUNFTSFELDER = ['places', 'age', 'role'];
export const NOTIZFELDER = ['memories', 'habits', 'routine', 'quirks'];

/* ------------------------------------------------------------- Die Karte -- */

export function figurkarte(lage: Figurlage): Tiefenkarte {
  const e = lage.entry;

  const hatWissen =
    etwasDa(e, WISSENSFELDER) || text(e.description).length > 0 || (e.blocks?.length ?? 0) > 0;
  const beziehungen = beziehungenVon(lage);
  const herkunft = herkunftVon(lage);
  const hatHerkunft = herkunft.length > 0 || etwasDa(e, HERKUNFTSFELDER);
  const hatNotizen =
    etwasDa(e, NOTIZFELDER) || fundstueckeVon(lage).length > 0 || !!e.geheim?.text;

  /*
   * **Alle vier Richtungen, immer – die leeren still.**
   *
   * Hier stand vorher `undefined`, und die Begründung dafür steht oben im
   * Kopf: Eine Richtung offenzuhalten, in der nichts liegt, heisst, dort
   * etwas zu erfinden. Der Grundsatz bleibt richtig; die Umsetzung war es
   * nicht.
   *
   * Gemessen: Eine frisch angelegte Figur bekam die Karte `{}` – keine
   * einzige Richtung. Wer sie in die Tiefe drückte, bekam **nichts**: keine
   * Bewegung, keinen Satz. Die beabsichtigte Aussage („um diese Figur herum
   * ist nichts") wurde damit nie ausgesprochen, und für den, der drückt, ist
   * sie von einer kaputten Bedienung nicht zu unterscheiden.
   *
   * `still` löst das, ohne den Grundsatz zu brechen: Der Weg wird angeboten,
   * leiser gezeichnet, und der Raum dahinter sagt in einem Satz, was hier
   * stünde. Es wird nichts behauptet, was nicht da ist – es wird gesagt, dass
   * nichts da ist. Siehe `ersatz.ts`.
   */
  return karte({
    oben: weg('Wissen', 'Geschichte · Hintergrund', 'Was von ihr bekannt ist', 'wissen', !hatWissen),

    links: weg('Herkunft', 'Ort · Welt', 'Woher sie kommt, wo sie steht', 'herkunft', !hatHerkunft),

    /*
     * Rechts liegt der Weg, der drei Ebenen tief geht – und der einzige mit
     * einer Wahl. Die Kette aus dem Auftrag:
     *
     *     Vaelorian → Beziehungen → Miraelys → gemeinsame Geschichte
     *
     * Die erste Ebene zeigt Gesichter und verlangt, dass eines gemeint wird.
     * Ohne diese Wahl führt die Geste nicht weiter: Es gäbe keine „gemeinsame
     * Geschichte", die man zeigen könnte, ohne sich jemanden auszusuchen.
     *
     * Drei Ebenen und nicht sieben, obwohl die Architektur seit dieser Runde
     * beliebig tief kann. Der Auftrag benennt den Grund selbst: „Dabei darf
     * Dragoncore aber nicht zum Labyrinth werden. Nicht jeder Datenbanklink
     * wird automatisch ein eigener Tiefenraum." Drei sind das, was diese Seite
     * zu sagen hat.
     */
    /*
     * Rechts bleibt die Kette dreistufig – aber ohne Beziehungen endet sie
     * nach der ersten Stufe. Eine Figur, die niemanden kennt, hat auch keine
     * „gemeinsame Geschichte"; zwei weitere Stufen anzubieten, hinter denen
     * dieselbe Leere steht, wäre genau das Labyrinth, vor dem der Auftrag
     * warnt.
     */
    rechts: beziehungen.length
      ? tieferWeg('Beziehungen', 'Verbündete · Konflikte', [
          { titel: 'Wer ihr nahesteht', raum: 'beziehungen', wahl: 'noetig' },
          { titel: 'Diese Verbindung', raum: 'beziehung' },
          { titel: 'Gemeinsame Geschichte', raum: 'gemeinsameGeschichte' },
        ])
      : weg('Beziehungen', 'Verbündete · Konflikte', 'Wer ihr nahesteht', 'beziehungen', true),

    unten: weg(
      'Notizen',
      'Erinnerungen · Fundstücke',
      'Was von ihr aufbewahrt ist',
      'notizen',
      !hatNotizen,
    ),
  });
}
