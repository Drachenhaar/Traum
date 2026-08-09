/**
 * Die Wege.
 *
 * Keine Berufskategorien und keine Betriebsarten. Ein Weg aendert **nichts**
 * am Datenmodell und schaltet nichts frei oder ab – er entscheidet nur,
 * welche Schauseite am Ende gezeigt wird und mit welchen Worten. Dragoncore
 * bleibt ein gemeinsames System, und der Weg laesst sich jederzeit wechseln.
 *
 * Das ist wichtig genug, um es hier festzuhalten: Sobald ein Weg irgendwo
 * eine Funktion verbergen wuerde, waere aus einer Ansprache eine Beschraenkung
 * geworden – und aus einem Buch fuenf verschiedene Programme.
 */

export interface Weg {
  id: string;
  name: string;
  /** Wen es meint – ein Satz, ohne Fachwort. */
  fuer: string;
  /** Der Klang des Weges, in drei Bewegungen. */
  zeile: string;
}

export const WEGE: Weg[] = [
  {
    id: 'erzaehler',
    name: 'Geschichtenerzähler',
    fuer: 'Für Menschen, die Romane, Geschichten und Figuren entwickeln.',
    zeile: 'Figuren verstehen. Handlungen verweben. Geschichten wachsen lassen.',
  },
  {
    id: 'weltenbauer',
    name: 'Weltenbauer',
    fuer: 'Für Spielentwurf und systematisches Weltenbauen.',
    zeile: 'Orte, Systeme, Kulturen und Regeln miteinander verbinden.',
  },
  {
    id: 'spielleiter',
    name: 'Spielleiter',
    fuer: 'Für Pen-&-Paper, Kampagnen und Abenteuer.',
    zeile: 'Eine Welt vorbereiten, die am Spieltisch lebendig bleibt.',
  },
  {
    id: 'traumweber',
    name: 'Traumweber',
    fuer: 'Für freies Erfinden und Erkunden ohne festen Zweck.',
    zeile: 'Gedanken sammeln und beobachten, wohin sie führen.',
  },
  {
    id: 'chronist',
    name: 'Chronist',
    fuer: 'Für große, komplexe Welten, die geordnet und bewahrt werden wollen.',
    zeile: 'Geschichte ordnen, Zusammenhänge erkennen und nichts verlieren.',
  },
];

export function wegById(id: string | undefined): Weg | undefined {
  return WEGE.find((w) => w.id === id);
}
