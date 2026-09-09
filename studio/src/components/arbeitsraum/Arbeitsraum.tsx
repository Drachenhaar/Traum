/**
 * Die Weiche zwischen den Arbeitsräumen.
 *
 * Ein Satz entscheidet hier alles: **Die Welt ist gemeinsam. Das Buch
 * bestimmt, wie man sie erlebt.** Darunter liegt dieselbe Maschine – dieselben
 * Einträge, dieselben Beziehungen, dieselbe Zeit. Was sich unterscheidet, ist
 * der Raum, in dem man steht.
 *
 * **Warum drei Hüllen und nicht eine mit Ausnahmen.**
 * Der naheliegende Weg wäre, `BookShell` zu behalten und je nach Buchart
 * Knöpfe auszublenden. Das ist ausdrücklich ausgeschlossen, und der Grund ist
 * nicht Geschmack: Eine Oberfläche mit Ausnahmen wächst zu einer Oberfläche
 * mit vielen Ausnahmen, und am Ende sieht ein Roman aus wie ein Artbook mit
 * abgeschalteten Funktionen. Drei Hüllen, die sich Bauteile teilen, bleiben
 * drei Hüllen.
 *
 * **Was sie teilen und was nicht.**
 * Geteilt: der Tisch, das Papier, die Schriften, jede Seite dahinter. Nicht
 * geteilt: was oben steht, wohin man kommt, und ob man blättert. Das ist die
 * ganze Unterscheidung, und sie ist genau die, die zählt – ein Roman blättert
 * nicht, er scrollt; ein Artbook blättert, weil es ein Buch ist.
 *
 * **Ein Buch ohne Art bekommt die Hülle von gestern.**
 * Der Rückfall ist `BookShell`, und zwar nicht als Vorgabe, sondern als
 * Zusage: Auf diesen Geräten liegt Arbeit. Ein Band, der gestern ein Buch mit
 * allen Werkzeugen war, darf sich nicht über Nacht in einen Schreibraum
 * verwandeln, weil ein Programm eine Vermutung hatte.
 */

import { useStudio } from '../../store/useStudio';
import { buchartVon } from '../../lib/buchart';
import { BookShell } from '../book/BookShell';
import { Schreibhuelle } from './Schreibhuelle';
import { Werkstatthuelle } from './Werkstatthuelle';

export function Arbeitsraum() {
  const art = useStudio((s) => buchartVon(s.settings.book));

  if (art === 'novel') return <Schreibhuelle />;
  if (art === 'rpg') return <Werkstatthuelle />;

  /*
   * `artbook` **und** alles ohne Art.
   *
   * Für das Artbook ist der Buchkörper nicht ein Rückfall, sondern die
   * richtige Antwort: Ein gestaltetes Buch hat Doppelseiten und eine
   * Reihenfolge, und man blättert darin. Dass ein Bestandsband hier ebenfalls
   * landet, ist deshalb kein Kompromiss, sondern derselbe Ort aus zwei
   * Gründen.
   */
  return <BookShell />;
}
