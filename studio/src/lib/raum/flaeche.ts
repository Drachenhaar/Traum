/**
 * Wie viel Oberfläche gerade zu sehen sein darf.
 *
 * Wenn niemand etwas tut, soll Dragoncore möglichst wenig nach Software
 * aussehen. Das ist leicht gesagt und in zwei Richtungen leicht falsch zu
 * machen: Eine Oberfläche, die nie zurücktritt, ist ein Werkzeugkasten mit
 * einem Buch darin. Eine, die vollständig verschwindet, ist ein Bild, vor dem
 * ein neuer Benutzer ratlos steht.
 *
 * Deshalb fünf Zustände statt eines Schalters:
 *
 *   RUHE         Niemand tut etwas. Größtmögliche Zurückhaltung – aber nichts
 *                verschwindet ganz. Wer das Buch zum ersten Mal sieht, muss
 *                weiterhin erkennen können, dass es oben etwas gibt.
 *   BERUEHRUNG   Ein Finger ist da. Die Orientierung kommt zurück, sofort und
 *                ohne Verzögerung – Rückmeldung, die man abwarten muss, ist
 *                keine.
 *   ARBEIT       Es wird tatsächlich etwas getan. Die Werkzeuge stehen voll da.
 *   TIEFE        Der Kontext hat übernommen. Die Werkzeuge der Mitte treten
 *                zurück, weil sie hier nichts zu sagen haben.
 *   HEIMKEHR     Auf dem Weg zurück. Ein eigener Zustand, damit die Oberfläche
 *                sich *beruhigt*, statt schlagartig wieder vollständig
 *                dazustehen.
 *
 * ---
 *
 * **Warum als reine Funktion.**
 *
 * Dasselbe wie beim Buchkörper und bei der Geste: Was hier steht, ist eine
 * Zuordnung von Eingaben auf einen Zustand, ohne Zeitgeber, ohne DOM, ohne
 * React. Ein Zurücktreten, das man nur durch Danebensitzen und Warten prüfen
 * kann, ist nicht geprüft, sondern beobachtet.
 *
 * Die Zeit kommt von außen herein – als „wie lange ist die letzte Berührung
 * her". Damit ist auch der unangenehmste Fall prüfbar: dass die Oberfläche
 * **nicht** zurücktritt, während jemand gerade zieht.
 */

import type { Raumkonfig } from './konfig';
import type { Phase } from './geste';

export type Flaechenzustand = 'ruhe' | 'beruehrung' | 'arbeit' | 'tiefe' | 'heimkehr';

export interface Flaechenlage {
  /** Wie tief der Blick steht. */
  tiefe: number;
  /** Was die Geste gerade tut. */
  phase: Phase;
  /** Liegt in diesem Augenblick ein Finger auf dem Glas? */
  beruehrt: boolean;
  /** Wie lange die letzte Eingabe her ist, in Millisekunden. */
  seitMs: number;
}

/**
 * Der Zustand der Oberfläche – in der Reihenfolge, in der entschieden wird.
 *
 * Die Reihenfolge *ist* die Regel, und sie ist von oben nach unten zu lesen:
 *
 *   1. Heimkehr schlägt alles. Sie ist eine Bewegung mit einem Ziel, und
 *      nichts darf sie unterbrechen – sonst flackert die Oberfläche genau
 *      dann, wenn sie zur Ruhe kommen soll.
 *   2. Tiefe schlägt Berührung. Wer drei Ebenen tief steht, bekommt nicht
 *      deshalb die Werkzeuge der Mitte zurück, weil er scrollt.
 *   3. Eine laufende Geste ist Arbeit, auch ohne Fingerkontakt: Zwischen
 *      Loslassen und Einrasten liegen ein paar hundert Millisekunden, und in
 *      denen darf nichts zurücktreten.
 *   4. Ein Finger ohne Absicht ist Berührung.
 *   5. Und erst danach entscheidet die Zeit.
 */
export function flaechenzustand(lage: Flaechenlage, k: Raumkonfig): Flaechenzustand {
  if (lage.phase === 'heimkehrend') return 'heimkehr';
  if (lage.tiefe > 0) return 'tiefe';
  if (lage.phase !== 'ruhe') return 'arbeit';
  if (lage.beruehrt) return 'beruehrung';
  return lage.seitMs >= k.flaeche.ruheNachMs ? 'ruhe' : 'arbeit';
}

/**
 * Wie deutlich die Bedienelemente in diesem Zustand dastehen – 0…1.
 *
 * Nicht null, nirgends. Das ist die Grenze, die der Auftrag ausdrücklich
 * zieht: Zurückhaltung ja, Verschwinden nein. Wer die Oberfläche nicht mehr
 * findet, hat keine ruhige App, sondern eine kaputte.
 *
 * Der Ruhewert ist einstellbar, damit man am Gerät entscheiden kann, wie weit
 * „still" gehen darf – aber die Untergrenze steht hier und nicht im Regler.
 */
export function deutlichkeit(z: Flaechenzustand, k: Raumkonfig): number {
  const still = Math.max(0.12, Math.min(1, k.flaeche.ruheDeckkraft));
  switch (z) {
    case 'ruhe':
      return still;
    case 'beruehrung':
      /* Zwischen still und voll – die Orientierung ist da, die Werkzeuge noch nicht. */
      return Math.min(1, still + (1 - still) * 0.65);
    case 'tiefe':
      /*
       * In der Tiefe treten die Werkzeuge der Mitte weiter zurück als in
       * Ruhe: Dort sind sie nur unaufdringlich, hier sind sie schlicht nicht
       * zuständig.
       */
      return Math.max(0.12, still * 0.8);
    case 'heimkehr':
    case 'arbeit':
      return 1;
  }
}

/**
 * Wie lange der Übergang in diesen Zustand dauern soll, in Millisekunden.
 *
 * Zurücktreten darf langsam sein – es ist ein Nachlassen, und niemand wartet
 * darauf. Zurückkommen muss schnell sein: Wer den Finger auflegt und eine
 * halbe Sekunde auf die Werkzeugleiste wartet, legt den Finger noch einmal
 * auf, weil er glaubt, es sei nichts angekommen.
 */
export function uebergangMs(z: Flaechenzustand, k: Raumkonfig): number {
  if (z === 'ruhe') return k.flaeche.beruhigenMs;
  return k.flaeche.erscheinenMs;
}
