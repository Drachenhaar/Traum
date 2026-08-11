/**
 * Die Ebenen des Zeitstrahls.
 *
 * Man kann nicht alles auf einmal ansehen. Eine Welt mit tausend Eintraegen
 * ergibt einen Zeitstrahl, auf dem nichts mehr zu erkennen ist – deshalb
 * waehlt man, worauf man schaut: nur die Politik, nur die Religion, nur eine
 * einzige Figur.
 *
 * Bewusst ein Register und keine Kette von `if`. Eine neue Ebene ist ein
 * Eintrag hier; weder der Zeitstrahl noch die Achse noch die Auswahl muessen
 * angefasst werden. Genau das verlangt der Auftrag: „Neue Datentypen sollen
 * spaeter ohne Umbau integrierbar sein."
 */

import type { Entry, EntryType } from '../../types';

export interface Ebene {
  id: string;
  label: string;
  /** Ein Satz, der sagt, was man hier sieht. */
  note: string;
  /** Farbe der Spur. */
  farbe: string;
  /**
   * Welche Eintraege auf diese Ebene gehoeren. Bekommt den ganzen Eintrag,
   * damit spaetere Ebenen auch nach Kategorie oder Schlagwort greifen koennen
   * und nicht nur nach Typ.
   */
  gilt: (e: Entry) => boolean;
}

/** Kurz: gehoert der Eintrag zu einem dieser Typen? */
const vonTyp =
  (...typen: EntryType[]) =>
  (e: Entry) =>
    typen.includes(e.type);

/**
 * Eine Ebene aus Typen *und* Stichworten.
 *
 * Politik, Wirtschaft und Krieg sind keine Eintragstypen – es sind Themen.
 * Sie stecken in Kategorie und Schlagworten, und dort suchen wir sie. Wer
 * seine Welt anders beschriftet, ergaenzt hier ein Wort.
 */
const nachWorten =
  (typen: EntryType[], worte: string[]) =>
  (e: Entry) => {
    if (!typen.includes(e.type)) return false;
    const heu = `${e.category} ${e.tags.join(' ')} ${e.subtitle}`.toLowerCase();
    return worte.some((w) => heu.includes(w));
  };

export const EBENEN: Ebene[] = [
  {
    id: 'welt',
    label: 'Die ganze Welt',
    note: 'Alles, was eine Zeit trägt.',
    farbe: '#C0A468',
    gilt: () => true,
  },
  {
    /*
     * Die Zeitalter fuer sich.
     *
     * Sie stehen ganz vorn, weil sie das Geruest sind: Wer wissen will, wann
     * etwas war, sieht zuerst nach, *in welcher Zeit* es war. Eine Welt ohne
     * Epochen zeigt hier nichts – und das ist kein Mangel.
     */
    id: 'zeitalter',
    label: 'Zeitalter',
    note: 'Das Gerüst der Zeit – Ären, Dynastien, Zwischenzeiten.',
    farbe: '#8C6510',
    gilt: vonTyp('epoche'),
  },
  {
    id: 'personen',
    label: 'Figuren',
    note: 'Wer gelebt hat, und wie lange.',
    farbe: '#B0724A',
    gilt: vonTyp('character'),
  },
  {
    id: 'orte',
    label: 'Orte',
    note: 'Gegründet, gewachsen, verfallen.',
    farbe: '#8C6D31',
    gilt: vonTyp('location', 'architecture', 'biome'),
  },
  {
    id: 'ereignisse',
    label: 'Ereignisse',
    note: 'Was geschah – und was daraus folgte.',
    farbe: '#A8853F',
    gilt: vonTyp('lore', 'quest', 'moment'),
  },
  {
    id: 'politik',
    label: 'Politik',
    note: 'Herrschaft, Verträge, Gesetze.',
    farbe: '#5E6B7A',
    gilt: nachWorten(
      ['lore', 'quest', 'law', 'character', 'location'],
      ['politik', 'herrsch', 'thron', 'krone', 'reich', 'vertrag', 'gesetz', 'rat', 'adel', 'dynastie'],
    ),
  },
  {
    id: 'religion',
    label: 'Religion',
    note: 'Was geglaubt wurde, und von wem.',
    farbe: '#7A6A9A',
    gilt: nachWorten(
      ['lore', 'law', 'magic', 'artifact', 'character', 'architecture'],
      ['religion', 'glaub', 'kult', 'gott', 'göt', 'tempel', 'orden', 'priest', 'heilig', 'ritual'],
    ),
  },
  {
    id: 'wirtschaft',
    label: 'Wirtschaft',
    note: 'Handel, Wege, Krisen.',
    farbe: '#7A8467',
    gilt: nachWorten(
      ['lore', 'location', 'material', 'prop', 'quest'],
      ['handel', 'markt', 'wirtschaft', 'münze', 'gold', 'zoll', 'karawane', 'hafen', 'ernte', 'hunger'],
    ),
  },
  {
    id: 'kriege',
    label: 'Kriege',
    note: 'Schlachten, Bündnisse, Frieden.',
    farbe: '#8C3A32',
    gilt: nachWorten(
      ['lore', 'quest', 'location', 'character'],
      ['krieg', 'schlacht', 'belager', 'bündnis', 'allianz', 'frieden', 'aufstand', 'heer', 'fehde'],
    ),
  },
  {
    id: 'natur',
    label: 'Natur',
    note: 'Klima, Katastrophen, Jahreszeiten.',
    farbe: '#3A422F',
    gilt: vonTyp('biome', 'plant', 'animal', 'cycle', 'law'),
  },
];

export function ebeneById(id: string): Ebene {
  return EBENEN.find((e) => e.id === id) ?? EBENEN[0];
}
