/**
 * Die Bildersätze – was es gibt und wie es auszusehen hat.
 *
 * ---
 *
 * **Diese Datei ist der Vertrag.**
 *
 * Sie beschreibt jede Art eines Satzes: wie hoch, wie breit, wie viele
 * Varianten, wo der Fuß sitzt. Zwei Leser halten sich daran:
 *
 *   · die **Backstube**, wenn sie aus Code zeichnet,
 *   · der **Prüfer**, wenn eine gemalte Datei hereinkommt.
 *
 * Dass beide dieselbe Quelle lesen, ist der Punkt. Eine Grafik, die nach
 * anderen Maßen entstanden ist, fällt beim Backen durch – nicht Wochen
 * später im Bild.
 *
 * ---
 *
 * **Die gebackene Kunst ist Stufe eins und nicht das Ziel.**
 *
 * Jede Art hat eine Quelle: entweder liegt eine Datei unter
 * `assets/karte/<satz>/<art>_<nr>.png`, dann wird die genommen, oder es
 * gibt keine, dann zeichnet der Pinsel aus `pinsel.mjs`.
 *
 * Eine Illustration auszutauschen heißt also: Datei hinlegen, `npm run
 * atlas`. Kein Programmteil ändert sich, keine Kartendaten ändern sich,
 * und die Karte zeigt sie beim nächsten Öffnen.
 */

import { backeBaum } from './pinsel.mjs';

/**
 * Die Regeln, die für **jeden** Satz gelten.
 *
 * Sie stehen hier und nicht je Art, weil Zusammengehörigkeit genau daraus
 * entsteht: gleiche Perspektive, gleiches Licht, gleiche Verankerung. Ein
 * Satz, in dem ein Bild von links und eines von rechts beleuchtet ist, sieht
 * auf der Karte aus wie zwei Sätze – egal wie gut jedes einzelne Bild ist.
 */
export const VERTRAG = {
  /**
   * Der Fuß sitzt unten.
   *
   * Gemessen: Die unterste nicht durchsichtige Zeile muss im untersten
   * Zwanzigstel liegen. Ein Bild, das um seine Mitte verankert wäre,
   * rutschte beim Vergrößern nach unten weg.
   */
  fussAb: 0.9,
  /** Oben und seitlich bleibt Luft – sonst schneidet die Glättung an. */
  randFrei: 0.015,
  /** Wie weit das Seitenverhältnis vom Sollwert abweichen darf. */
  verhaeltnisAbweichung: 0.12,
  /**
   * Das Licht kommt von links oben.
   *
   * Gemessen als Helligkeitsschwerpunkt: Die linke Hälfte muss heller sein
   * als die rechte. Keine große Forderung – aber sie fängt genau den Fall
   * ab, in dem ein Bild aus einem anderen Durchgang stammt.
   */
  lichtVonLinks: true,
  /** Wie viel heller mindestens, als Anteil. */
  lichtVorsprung: 0.015,
  /** Ein Bild darf nicht fast leer sein. */
  mindestensDeckung: 0.06,
};

export const SAETZE = {
  artbook: {
    name: 'Clean Artbook',
    arten: {
      wald: {
        /*
         * **Die Auflösung der gebackenen Datei.**
         *
         * Hier stand 190, und das war zu wenig. Gerechnet: Beim engsten
         * Zoom (`ENGSTE = FELD / 8`, also 125 Einheiten quer) bedeckt die
         * Leinwand auf einem Gerät mit doppelter Dichte 1800 Bildpunkte.
         * Ein Baum von 26 Karteneinheiten wird dort **426 Bildpunkte**
         * hoch gezeichnet – aus einer Quelle von 190. Zweieinviertelfach
         * vergrössert, und genau so sah es aus: matschig statt scharf.
         *
         * Die Rohblätter geben 440 bis 530 Punkte je Baum her. Davon wurde
         * also das Zweieinhalbfache weggeworfen, bevor das Bild je auf die
         * Karte kam. 430 schöpft die Quelle aus und deckt den engsten Zoom.
         */
        hoehe: 430,
        /*
         * Wie hoch ein Baum **auf der Karte** steht, im Kartenmass 0…1000.
         *
         * Nicht dasselbe wie `hoehe` – das ist die Auflösung der Datei.
         * Sechsundzwanzig bei elf Einheiten Abstand heisst: Die Kronen
         * überlappen. Mit fünfzehn, dem Mass der gezeichneten Feder, stand
         * jeder Baum für sich und der Wald sah zerstreut aus.
         */
        karteHoehe: 26,
        breiteZuHoehe: 0.8,
        varianten: 8,
        ankerX: 0.5,
        ankerY: 0.96,
        /*
         * Die Töne stammen aus `src/lib/karte/stil.ts`. Sie stehen hier ein
         * zweites Mal, und das ist zulässig: Ein gebackenes Bild ist kein
         * Programm, sondern ein Erzeugnis. Das Verzeichnis trägt die Herkunft
         * mit, und der Prüfer vergleicht.
         */
        palette: { laub: '#7A8467', laubLicht: '#99A484', laubSchatten: '#5C6749', stamm: '#6B6047' },
        male: backeBaum,
      },

      /*
       * Das Unterholz – Farne, Blattwerk, Gräser, Beerensträucher.
       *
       * ---
       *
       * **Warum es eine eigene Art ist.**
       *
       * Das Waldwerk hatte diese Lage schon, aber ohne eigene Bilder: Es
       * nahm **verkleinerte Baumbilder**. Aus zwei Schritten Entfernung
       * geht das durch, aus der Nähe steht da ein Kiefernwäldchen in
       * Kniehöhe. Ein Behelf, und er war als solcher gedacht.
       *
       * **Die Grössen.** Acht Karteneinheiten hoch, bei 16,4 Bildpunkten je
       * Einheit also 131 Punkte – gebacken wird auf 140. Das Rohblatt
       * liefert 63 bis 122; damit ist diese Art die einzige, bei der die
       * Vorlage knapp ist statt üppig. Für etwas, das halb hinter Stämmen
       * steht, reicht es.
       */
      unterholz: {
        hoehe: 140,
        karteHoehe: 8,
        breiteZuHoehe: 1.4,
        varianten: 15,
        ankerX: 0.5,
        ankerY: 0.97,
      },
    },
  },
};

/**
 * Die Mipstufen – die ganze Spanne, von der Nahsicht bis zur Übersicht.
 *
 * ---
 *
 * Drei Stufen waren es, und sie deckten nur das obere Ende ab. Am unteren
 * klaffte eine Lücke, die älter ist als die höhere Auflösung: In der
 * Übersicht ist ein Baum **6,7 Bildpunkte** gross und wurde aus einem Bild
 * von 47 geholt – siebenfach heruntergerechnet. Das flimmert beim
 * Schieben, weil der Browser bei jedem Bild andere Quellpunkte trifft, und
 * es ist die Ansicht, in der man die Karte am häufigsten sieht.
 *
 * Sechs Stufen spannen jetzt von 430 bis 13 Punkten. Die feinen Stufen
 * kosten den Platz, die groben kosten nichts – zusammen sind die drei
 * neuen weniger als ein Zwanzigstel des Atlas.
 */
export const MIPS = [1, 0.5, 0.25, 0.125, 0.0625, 0.03125];

/** Wo eine gemalte Datei liegen müsste. */
export function bildpfad(satz, art, nr) {
  return `/assets/karte/${satz}/${art}_${String(nr).padStart(2, '0')}.png`;
}
