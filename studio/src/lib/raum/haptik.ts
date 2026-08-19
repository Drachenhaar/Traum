/**
 * Das Fühlbare.
 *
 * Vier Anlässe, mehr nicht – und jeder einzelne muss sich rechtfertigen, weil
 * eine App, die bei jeder Gelegenheit vibriert, nach zwei Tagen stumm
 * geschaltet wird:
 *
 *   andeutung      „Ich habe verstanden, wohin du willst."
 *   verpflichtung  „Wenn du jetzt loslässt, gehst du hinein."
 *   einrasten      „Angekommen."
 *   heimkehr       „Du bist wieder bei deinem Werk."
 *
 * **Warum eine eigene Schicht für drei Zeilen Code.** Weil `navigator.vibrate`
 * auf iOS Safari nicht existiert und dort auch nie existieren wird – Apple
 * gibt Haptik nur über native Wege oder über einen Umweg frei, den man nicht
 * bauen sollte. Verstreute Aufrufe hießen: verstreute Prüfungen auf
 * Verfügbarkeit, und beim ersten Vergessen ein Absturz auf genau dem Gerät,
 * für das das alles gebaut ist.
 *
 * Hier gibt es stattdessen eine Stelle, die nichts tut, wenn es nichts zu tun
 * gibt. Der Rest des Programms ruft, ohne zu fragen.
 */

import { konfig } from './konfig';

function schlage(muster: number | number[]): void {
  if (typeof navigator === 'undefined') return;
  const v = (navigator as { vibrate?: (m: number | number[]) => boolean }).vibrate;
  if (typeof v !== 'function') return;
  try {
    v.call(navigator, muster);
  } catch {
    /* Manche Browser werfen, wenn die Seite nicht im Vordergrund ist. */
  }
}

export const haptik = {
  /** Sehr leicht – man bemerkt es kaum, und das ist die Absicht. */
  andeutung() {
    if (konfig().haptik.andeutung) schlage(8);
  },
  /** Etwas klarer: hier kippt es. */
  verpflichtung() {
    if (konfig().haptik.verpflichtung) schlage(16);
  },
  /** Ein kleiner Abschluss. */
  einrasten() {
    if (konfig().haptik.einrasten) schlage(10);
  },
  /** Eigener Impuls – Heimkehr soll sich nicht anfühlen wie Ankommen. */
  heimkehr() {
    if (konfig().haptik.heimkehr) schlage([12, 26, 12]);
  },

  /* -------------------------------------------------------- Das Buch ----- */

  /** Der Finger trifft den Einband. Das leiseste Zeichen von allen. */
  beruehrung() {
    if (konfig().haptik.beruehrung) schlage(5);
  },
  /** Der Deckel geht auf – ein satter, einmaliger Impuls. */
  oeffnen() {
    if (konfig().haptik.oeffnen) schlage(20);
  },
  /** Die Seite kippt über die Schwelle und legt sich um. */
  blattFest() {
    if (konfig().haptik.blattFest) schlage(14);
  },
  /** Und kommt auf dem Stapel zur Ruhe. */
  blattRuht() {
    if (konfig().haptik.blattRuht) schlage(7);
  },
};
