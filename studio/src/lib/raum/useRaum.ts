/**
 * Wo bin ich, und wo ist mein Werk?
 *
 * Ein eigener, sehr kleiner Speicher neben `useStudio` – ausdrücklich **kein**
 * Umbau des großen. Der Grund ist nicht Bequemlichkeit, sondern eine
 * Trennlinie, die zählt:
 *
 *   `useStudio` hält die **Welt**. Was dort steht, ist das Werk des
 *   Verfassers, wird gespeichert und muss Jahre überleben.
 *
 *   `useRaum` hält den **Blick**. Wo ich gerade stehe, wie weit ein Finger
 *   gezogen hat, welche Phase eine Bewegung hat. Nichts davon gehört in eine
 *   Datenbank, und nichts davon darf je etwas an der Welt ändern.
 *
 * Beides in einen Speicher zu legen hieße, dass ein Wisch dieselbe Sorte
 * Ereignis wäre wie das Schreiben eines Satzes. Genau daran erkennt man später
 * nicht mehr, wer die Welt verändert hat.
 *
 * ---
 *
 * **Anker und sichtbare Mitte sind nicht dasselbe.**
 *
 * Der Anker ist das Werk. Er bleibt, während man umherschaut. Wer von Lysander
 * nach rechts zu den Charakteren geht, dann zu den Beziehungen, dann ins
 * Verknüpfungsnetz, hat drei Räume gesehen – und arbeitet immer noch an
 * Lysander. Erst ein ausdrückliches „In die Mitte holen" verschiebt den Anker.
 *
 * Ohne diese Trennung verliert man beim Erkunden seinen Arbeitsplatz, und dann
 * erkundet man nicht mehr.
 */

import { create } from 'zustand';
import { konfig } from './konfig';
import { naechsterStand, type Ort, type Phase, type Richtung } from './geste';
import {
  gesteErlaubt,
  reichweite,
  richtungen,
  OHNE_TIEFE,
  type Tiefenkarte,
} from './tiefenkarte';

interface Raumzustand {
  /** Das Werk. Ändert sich nur auf ausdrückliche Handlung. */
  ankerId: string | null;
  /** Wo der Blick steht. */
  ort: Ort;
  tiefe: number;
  /**
   * Was die sichtbare Seite über ihre Umgebung sagt.
   *
   * Hier stand eine `Werkraum`-Kennung – „Charakterraum", „Weltraum" –, und
   * damit bestimmte die *Gattung* einer Seite, was rechts liegt. Jetzt steht
   * hier die Karte selbst: Die Seite meldet sie an, der Speicher nimmt sie
   * entgegen und weiß nichts darüber, wie sie zustande kam.
   *
   * Sie gehört zum **Blick**, nicht zur Welt: Derselbe Eintrag hat in einem
   * Kapitel eine andere Umgebung als in einer Begegnung, ohne dass sich an
   * ihm eine Zeile ändert.
   */
  tiefenkarte: Tiefenkarte;
  /**
   * Was die Hülle anbietet, wenn die Seite nichts sagt.
   *
   * Getrennt gehalten und **nicht** einfach überschrieben, weil React
   * Kind-Effekte vor Eltern-Effekten abarbeitet: Meldete die Hülle in
   * dieselbe Stelle, käme ihr Rückfall *nach* der Karte der Seite an und
   * würde sie überschreiben. Man hätte einen Vorrang gebaut, der genau
   * verkehrt herum wirkt – und es erst gemerkt, wenn eine Seite mit eigener
   * Tiefe sich benimmt wie eine ohne.
   *
   * Zwei Fächer, eine Regel: Was die Seite sagt, gilt. Ist ihr Fach leer,
   * gilt der Rückfall. Die Reihenfolge der Effekte spielt keine Rolle mehr.
   */
  rueckfallkarte: Tiefenkarte;

  /** Was der Finger gerade tut. Nur während einer Geste belegt. */
  gestenrichtung: Richtung | null;
  /**
   * Wie weit gezogen wurde – **nur zur Anzeige in Werkzeugen.**
   *
   * Der Bogen selbst liest diesen Wert nicht: Er hinge sonst an sechzig
   * React-Durchläufen je Sekunde. Siehe `Raumschicht.tsx`, wo der Fortschritt
   * als CSS-Variable direkt ins DOM geschrieben wird.
   */
  gestenweg: number;
  gestentempo: number;
  phase: Phase;
  /** Läuft gerade eine Bewegung, die niemand unterbrechen soll? */
  imUebergang: boolean;

  setzeAnker: (id: string | null) => void;
  beginneGeste: (richtung: Richtung) => void;
  ziehe: (weg: number, tempo: number, phase: Phase) => void;
  oeffne: () => void;
  brichAb: () => void;
  heim: () => void;
  gehZu: (ort: Ort, tiefe: number) => void;
  setzeTiefenkarte: (k: Tiefenkarte) => void;
  setzeRueckfallkarte: (k: Tiefenkarte) => void;
  /** Nach einer Bewegung: die Hülle kommt zur Ruhe. */
  ruhe: () => void;
}

const LEER = {
  gestenrichtung: null,
  gestenweg: 0,
  gestentempo: 0,
} as const;

export const useRaum = create<Raumzustand>((set, get) => ({
  ankerId: null,
  ort: 'mitte',
  tiefe: 0,
  tiefenkarte: OHNE_TIEFE as Tiefenkarte,
  rueckfallkarte: OHNE_TIEFE as Tiefenkarte,
  ...LEER,
  phase: 'ruhe' as Phase,
  imUebergang: false,

  setzeAnker(id) {
    /*
     * Ein neuer Anker holt den Blick in die Mitte zurück.
     *
     * Alles andere wäre widersprüchlich: „Dieses Wesen ist jetzt mein Werk"
     * und gleichzeitig „du stehst weiterhin drei Ebenen tief im
     * Beziehungsnetz eines anderen Werks".
     */
    set({ ankerId: id, ort: 'mitte', tiefe: 0, phase: 'ruhe', ...LEER });
  },

  beginneGeste(richtung) {
    set({ gestenrichtung: richtung, gestenweg: 0, gestentempo: 0, phase: 'andeutung' });
  },

  ziehe(weg, tempo, phase) {
    set({ gestenweg: weg, gestentempo: tempo, phase });
  },

  oeffne() {
    const s = get();
    if (!s.gestenrichtung) return;
    /*
     * Zwei Fragen an die Karte, und beide gehören ihr allein.
     *
     * Erstens: Darf diese Geste von hier aus überhaupt etwas öffnen? Eine
     * Richtung, die diese Seite nicht anbietet, öffnet nichts – und zwar
     * ohne Ersatz. Nichts zu erfinden ist eine ausdrückliche Regel und keine
     * Sparmaßnahme.
     *
     * Zweitens: Wie weit reicht der Weg? Der Regler im Stimmzimmer bleibt
     * darüber die Obergrenze für alles.
     */
    const stand = { ort: s.ort, tiefe: s.tiefe };
    const gilt = geltendeKarte(s);
    if (!gesteErlaubt(gilt, stand, s.gestenrichtung)) {
      set({ phase: 'ruhe', ...LEER });
      return;
    }
    const ziel = naechsterStand(
      stand,
      s.gestenrichtung,
      konfig(),
      reichweite(gilt, s.gestenrichtung),
    );
    set({
      ort: ziel.ort,
      tiefe: ziel.tiefe,
      phase: 'verpflichtend',
      imUebergang: true,
      ...LEER,
    });
  },

  brichAb() {
    /*
     * Nichts ist passiert – und das muss auch für die Daten gelten.
     *
     * Ein abgebrochener Wisch hinterlässt keine Spur: kein halber Zustand,
     * kein Merker, nichts Gespeichertes. Siehe `raum.test.mjs`.
     */
    set({ phase: 'ruhe', ...LEER });
  },

  heim() {
    set({ ort: 'mitte', tiefe: 0, phase: 'heimkehrend', imUebergang: true, ...LEER });
  },

  gehZu(ort, tiefe) {
    set({ ort, tiefe, phase: 'verpflichtend', imUebergang: true, ...LEER });
  },

  setzeTiefenkarte(k) {
    /*
     * Eine neue Karte lässt Ort und Tiefe unangetastet.
     *
     * Es ist kein Ereignis, sondern eine Feststellung: Die sichtbare Seite
     * *ist* eine andere, sie geht nicht dorthin. Wer hier den Blick in die
     * Mitte zurückholte, risse jede Navigation aus der Tiefe heraus mitten im
     * Weg ab – und zwar bei jedem Seitenwechsel.
     *
     * Der Weg zurück bleibt trotzdem offen, auch wenn die neue Karte die
     * Richtung gar nicht kennt, in der man gerade steht: Dafür sorgt
     * `gesteErlaubt`, indem es die Gegenrichtung ausnahmslos durchlässt.
     * Ohne diese Ausnahme könnte ein Seitenwechsel jemanden in einer Tiefe
     * einsperren.
     */
    set({ tiefenkarte: k });
  },

  setzeRueckfallkarte(k) {
    set({ rueckfallkarte: k });
  },

  ruhe() {
    set({ phase: 'ruhe', imUebergang: false, ...LEER });
  },
}));

/** Steht der Blick beim Werk? */
export function inDerMitte(): boolean {
  const s = useRaum.getState();
  return s.ort === 'mitte' && s.tiefe === 0;
}

/**
 * Beansprucht die Raumschicht gerade den Finger?
 *
 * Das Blättern fragt hier nach, bevor es eine Seite umschlägt. Ohne diese
 * Frage täte ein Zug vom rechten Rand beides: den Wesensraum andeuten *und*
 * weiterblättern.
 */
export function gesteLaeuft(): boolean {
  const s = useRaum.getState();
  return s.gestenrichtung !== null || s.imUebergang || s.tiefe > 0;
}

/**
 * Welche Karte gerade gilt.
 *
 * Die eine Stelle, an der aus zwei Fächern eine Antwort wird – und deshalb
 * die einzige, die irgendwo sonst aufgerufen werden darf. Wer selbst
 * `tiefenkarte` liest, umgeht den Rückfall und bekommt auf jeder Seite ohne
 * eigene Tiefe eine leere Karte.
 */
export function geltendeKarte(s: {
  tiefenkarte: Tiefenkarte;
  rueckfallkarte: Tiefenkarte;
}): Tiefenkarte {
  return richtungen(s.tiefenkarte).length ? s.tiefenkarte : s.rueckfallkarte;
}

/** Dieselbe Frage außerhalb von React. */
export function karteJetzt(): Tiefenkarte {
  return geltendeKarte(useRaum.getState());
}
