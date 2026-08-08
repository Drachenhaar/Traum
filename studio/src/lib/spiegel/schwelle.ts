/**
 * Wann der Spiegel spricht.
 *
 * „Er darf lieber lange schweigen als oberflaechliche Aussagen produzieren."
 * Das ist die schwerste Anforderung des ganzen Auftrags, weil sie gegen jeden
 * Impuls einer Software geht: Etwas zu zeigen fuehlt sich immer nuetzlicher
 * an als nichts. Bei einem Spiegel ist das falsch – eine Beobachtung aus
 * fuenf Seiten ist keine Beobachtung, sondern ein Zufall in Satzform.
 *
 * Deshalb steht die Schwelle hier als eigene Entscheidung und nicht als
 * Bedingung irgendwo im Zeichnen.
 */

/** Ab hier lohnt sich das Hinsehen ueberhaupt. */
const ERSTE = 10;
/** Ab hier tragen auch Vergleiche ueber die Zeit. */
const VOLL = 25;

export type Reifegrad = 'zu-jung' | 'erste-spuren' | 'reif';

export interface Reife {
  grad: Reifegrad;
  /** Was der Spiegel ueber sich selbst sagt, solange er noch nicht spricht. */
  text: string;
  /** Wie weit bis zur naechsten Stufe – fuer eine sehr leise Andeutung. */
  anteil: number;
  /** Wie viele Seiten noch fehlen. Null, wenn es reicht. */
  fehlen: number;
}

export function reife(seiten: number): Reife {
  if (seiten < ERSTE) {
    return {
      grad: 'zu-jung',
      text: 'Deine Welt ist noch jung. Der Spiegel hat noch nicht genug gesehen.',
      anteil: seiten / ERSTE,
      fehlen: ERSTE - seiten,
    };
  }
  if (seiten < VOLL) {
    return {
      grad: 'erste-spuren',
      text: 'Ich beginne, einige wiederkehrende Spuren zu erkennen.',
      anteil: (seiten - ERSTE) / (VOLL - ERSTE),
      fehlen: VOLL - seiten,
    };
  }
  return { grad: 'reif', text: '', anteil: 1, fehlen: 0 };
}
