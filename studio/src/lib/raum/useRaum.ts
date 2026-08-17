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

interface Raumzustand {
  /** Das Werk. Ändert sich nur auf ausdrückliche Handlung. */
  ankerId: string | null;
  /** Wo der Blick steht. */
  ort: Ort;
  tiefe: number;

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
    const ziel = naechsterStand({ ort: s.ort, tiefe: s.tiefe }, s.gestenrichtung, konfig());
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
