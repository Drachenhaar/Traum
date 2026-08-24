/**
 * Welcher Band ist aufgeschlagen – und ist er hell oder dunkel?
 *
 * Fast alles im Buch beantwortet diese Frage von selbst: Die Farbmarken
 * (`text-ink`, `bg-cream-50`, `border-line`, `text-gild-500`) ziehen ihre
 * Werte aus CSS-Variablen, und die schreibt `lib/baende.ts` beim Aufschlagen
 * an die Wurzel. Wer eine Klasse schreibt, muss vom Band nichts wissen.
 *
 * Es bleibt eine kleine Gruppe, die es doch wissen muss: alles, was Farben
 * *rechnet* statt sie zu schreiben – die Weltkarte malt in ein SVG, dessen
 * Füllungen aus einer Stildatei kommen, nicht aus Klassen. Für die steht hier
 * die eine Auskunft, damit nicht jede Stelle sich ihre eigene baut.
 *
 * ---
 *
 * **Gelesen wird aus dem Buch und nicht aus dem DOM.**
 *
 * Das Attribut `data-band` am Wurzelelement ist die *Wirkung*, das Buch die
 * Ursache. Wer die Wirkung abfragt, hängt davon ab, dass die Buchhülle schon
 * gelaufen ist – und bekommt beim ersten Anstrich die falsche Antwort.
 */

import { useStudio } from '../../store/useStudio';
import { bandVon } from '../baende';

/**
 * Ist der aufgeschlagene Band dunkel?
 *
 * Es ist bewusst diese Frage und nicht „welcher Band" – wer eine Farbe
 * berechnet, will wissen, ob er auf hellem oder dunklem Grund malt. Sechs
 * Bände einzeln abzufragen hieße, jeden neuen Band an jeder dieser Stellen
 * nachzutragen; die Frage nach hell oder dunkel beantwortet sich für einen
 * siebten von selbst.
 */
export function useBand(): boolean {
  const kennung = useStudio((s) => s.settings.book?.band);
  return !bandVon(kennung).hell;
}
