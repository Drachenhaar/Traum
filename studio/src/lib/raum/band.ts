/**
 * Welcher Band ist aufgeschlagen?
 *
 * Fast alles im Buch beantwortet diese Frage von selbst: Die Farbmarken
 * (`text-ink`, `bg-cream-50`, `border-line`) ziehen ihre Werte aus CSS-
 * Variablen, und die haengen am `data-band` des Wurzelelements. Wer eine
 * Klasse schreibt, muss vom Band nichts wissen.
 *
 * Es bleibt eine kleine Gruppe, die es doch wissen muss: alles, was Farben
 * *rechnet* statt sie zu schreiben – die Weltkarte malt in ein SVG, dessen
 * Fuellungen aus einer Stildatei kommen, nicht aus Klassen. Fuer die steht
 * hier die eine Auskunft, damit nicht jede Stelle sich ihre eigene baut.
 *
 * Gelesen wird aus der Konfiguration und nicht aus dem DOM-Attribut: Das
 * Attribut ist die *Wirkung*, die Konfiguration die Ursache. Wer die Wirkung
 * abfragt, haengt davon ab, dass die Buchhuelle schon gelaufen ist.
 */

import { useEffect, useState } from 'react';
import { beiKonfig, konfig } from './konfig';

/** Ohne React – fuer Rechnungen ausserhalb des Baums. */
export function bandIstDunkel(): boolean {
  return konfig().figur.dunklerBand >= 0.5;
}

/** Mit React – der Regler im Stimmzimmer wirkt sofort. */
export function useBand(): boolean {
  const [dunkel, setDunkel] = useState(bandIstDunkel);
  useEffect(() => beiKonfig(() => setDunkel(bandIstDunkel())), []);
  return dunkel;
}
