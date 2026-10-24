/**
 * Das Stilbuch – Gestaltung, getrennt von Rendertechnik.
 *
 * ---
 *
 * **Der Vertrag besteht aus einer Methode.**
 *
 * Ein Stileintrag kann zeichnen. Wie, geht niemanden etwas an: Striche,
 * Flächen, ein Bild aus einem Atlas, zwanzig Bilder übereinander. Der Maler
 * fragt nie, welches von beiden – er ruft `zeichne` auf.
 *
 * Daraus folgt alles, was ein Kartenbaukasten braucht:
 *
 *   · Ein Stil darf **mischen**. Artbook darf seine Bäume mit der Feder
 *     zeichnen und seine Berge aus Bildern setzen.
 *   · Ein **neuer Landschaftstyp** ist ein Eintrag. Weder Maler noch
 *     Kachelwerk noch Modell ändern sich.
 *   · **Fehlende Grafiken blockieren nichts.** Solange kein Bild da ist, malt
 *     ein Pinsel, und die Engine steht trotzdem schon richtig.
 *
 * ---
 *
 * **Was hier ausdrücklich *nicht* steht.**
 *
 * Keine feste Zahl Varianten, keine feste Bildgröße, keine Tabelle, die sagt,
 * wie groß ein Berg zu sein hat. Ein Stileintrag nennt seine Variantenzahl
 * selbst, und ein Bild bringt seine Maße mit. Eine Obergrenze hier wäre eine
 * Obergrenze für jede spätere Qualitätsstufe – und die teuerste Sorte Fehler,
 * weil man sie erst bemerkt, wenn man sie überschreiten will.
 *
 * ---
 *
 * **Was hier auch nicht steht: wo etwas liegt.**
 *
 * Die Dichte eines Waldes gehört ins Streuwerk, nicht hierher. Ein Wald ist
 * in jedem Stil derselbe Wald; was der Stil ändert, ist, *wie ein Baum
 * aussieht*. Siehe `staffage.ts`.
 */

import type { Lage, Staffage } from './staffage';
import { EBENE } from './staffage';
import type { Kartenstil } from '../karte/stil';
import { zeichneBaum } from '../../components/karte/baumzeichnung';
import type { Baum } from '../karte/wald';
import { bildEintrag, type Atlas } from './atlas';

/**
 * Wie eine Art in einem Stil aussieht.
 *
 * `zeichne` bekommt den Maßstab mit, weil manche Darstellungen ihn brauchen:
 * ein Pinsel, um unterhalb einer Größe zu vereinfachen, ein Bild, um die
 * passende Mipstufe zu wählen. Er ist **Bildpunkte je Karteneinheit**.
 */
export interface Stileintrag {
  /** Wie viele Ausprägungen es gibt. Nach oben offen. */
  varianten: number;
  /**
   * Wie hoch dieses Ding im **Kartenmaß** ist, bei voller Grösse.
   *
   * ---
   *
   * **Warum das eine Angabe des Stils ist und keine des Streuwerks.**
   *
   * Hier stand fest `15` – die Zahl aus `baumzeichnung.ts`, und für drei
   * Striche war sie richtig: Ein angedeuteter Baum soll klein bleiben, sonst
   * sieht man, dass er aus drei Strichen besteht.
   *
   * Eine gezeichnete Illustration will das Gegenteil. Sie hat Rinde, Äste
   * und einzelne Blätter, und bei fünfzehn Einheiten sieht man davon nichts.
   * Zugleich stand jeder Baum dann für sich: Krone zwölf breit, Abstand
   * fünfzehn – drei Einheiten Lücke, und der Wald wirkte **zerstreut**.
   *
   * Also sagt der Stil, wie gross seine Bilder sind. Dieselbe Trennung wie
   * überall: Das Streuwerk sagt, *wo* etwas steht, das Stilbuch, *wie* es
   * aussieht – und wie gross es ist, gehört zum Aussehen.
   */
  hoehe: number;
  /** Welche Lage; entscheidet den Zwischenspeicher. */
  lage: Lage;
  /** Grobe Malreihenfolge innerhalb der Lage. */
  ebene: number;
  /**
   * Wie breit dieses Ding im Verhältnis zu seiner Höhe ist – grob.
   *
   * Nur für den Überstand der Kacheln gebraucht: Ein Ding, dessen Fuß
   * ausserhalb einer Kachel liegt, dessen Bild aber hineinragt, muss
   * mitgezeichnet werden. Zu klein angegeben heißt Schnittkanten an den
   * Kachelgrenzen, zu groß heißt überflüssige Arbeit.
   */
  breiteZuHoehe: number;
  /**
   * Bildet diese Art zusammen eine **Masse**?
   *
   * Ein Wald schon: Seine Bäume gehören zu einem Blätterdach, werfen einen
   * gemeinsamen Schatten und stehen auf einem gemeinsamen Boden. Ein Dorf
   * nicht – es soll kein Kronendach bekommen.
   *
   * Arten mit dieser Angabe laufen durch das Waldwerk (`waldwerk.ts`), die
   * übrigen werden einfach gezeichnet.
   */
  verdichtet?: boolean;
  /**
   * Was unter dieser Art wächst – der Name einer anderen Art.
   *
   * Das Waldwerk füllt die Stammzone mit kleinen Dingen. Bisher nahm es
   * dafür **verkleinerte Baumbilder**: Aus zwei Schritten Entfernung geht
   * das durch, aus der Nähe steht da ein Kiefernwäldchen in Kniehöhe.
   *
   * Mit dieser Angabe holt es sich stattdessen die Art, die hier steht –
   * und weiss dabei nicht, dass es „unterholz" gibt. Es weiss nur, dass
   * diese Art einen Unterwuchs hat und wie er heisst. Fehlt die Art im
   * Bildersatz, bleibt es beim alten Behelf.
   */
  unterwuchs?: string;
  /** Zeichnen. Der Maler fragt nicht, wie. */
  zeichne(ctx: CanvasRenderingContext2D, s: Staffage, massstab: number): void;
}

export interface Stilbuch {
  id: string;
  /** Der Eintrag zu einer Art, oder nichts – dann wird sie nicht gezeichnet. */
  eintrag(art: string): Stileintrag | undefined;
  /** Alle Arten, die dieses Stilbuch kennt. */
  arten(): string[];
}

/** Ein Stilbuch aus einer Tabelle von Einträgen. */
export function stilbuchAus(id: string, tabelle: Record<string, Stileintrag>): Stilbuch {
  return {
    id,
    eintrag: (art) => tabelle[art],
    arten: () => Object.keys(tabelle),
  };
}

/* =========================================================== Artbook ===== */

/**
 * Das Stilbuch des heutigen Aussehens.
 *
 * **Es zeichnet genau das, was vorher dastand.** `zeichneBaum` ist dieselbe
 * Funktion wie bisher, mit denselben Argumenten. Diese Etappe überführt die
 * Maschinerie und nicht die Gestaltung: Wer die Karte danach ansieht, soll
 * keinen Unterschied sehen – nur merken, dass sie flüssiger läuft.
 *
 * Die drei Baumformen aus `baumzeichnung.ts` sind hier die drei Varianten.
 * Dass es drei sind und nicht acht, ist eine Angabe dieses Stilbuchs und
 * keine Grenze der Architektur.
 */
/**
 * Wo eine Art hingehoert und wie sie einsortiert wird.
 *
 * Steht hier und nicht im Atlas: Eine Siedlung liegt in jedem Stil ueber dem
 * Wald, auch wenn sie in jedem Stil anders aussieht. Lage und Reihenfolge
 * sind Bedeutung, nicht Gestaltung.
 */
const ORDNUNG: Record<string, {
  lage: Lage; ebene: number; breiteZuHoehe: number;
  verdichtet?: boolean; unterwuchs?: string;
}> = {
  /*
   * Dass ein Wald Unterholz hat, gilt in jedem Stil – *wie* das Unterholz
   * aussieht, sagt der Bildersatz. Deshalb steht die Beziehung hier und
   * nicht dort.
   */
  wald: {
    lage: 'bewuchs', ebene: EBENE.bewuchs, breiteZuHoehe: 1,
    verdichtet: true, unterwuchs: 'unterholz',
  },
  unterholz: { lage: 'bewuchs', ebene: EBENE.bewuchs, breiteZuHoehe: 1.4 },
  wiese: { lage: 'grund', ebene: EBENE.boden, breiteZuHoehe: 1 },
  fels: { lage: 'bewuchs', ebene: EBENE.fels, breiteZuHoehe: 1.4 },
  berge: { lage: 'bewuchs', ebene: EBENE.fels, breiteZuHoehe: 1.6 },
  bauwerk: { lage: 'bewuchs', ebene: EBENE.bauwerk, breiteZuHoehe: 1.2 },
};

function ordnung(art: string) {
  return ORDNUNG[art] ?? { lage: 'bewuchs' as Lage, ebene: EBENE.bewuchs, breiteZuHoehe: 1.2 };
}

/**
 * Das Stilbuch eines Stils.
 *
 * ---
 *
 * **Zwei Quellen, eine Tabelle.**
 *
 * Zuerst die Pinsel – das, was dieser Stil aus Code zeichnen kann. Darueber
 * jede Art, die der Bildersatz mitbringt. Ein Bild hat also Vorrang, und wo
 * keines liegt, bleibt der Pinsel.
 *
 * **Nichts hier nennt eine Art beim Namen.** Wer dem Satz morgen Felsen
 * hinzufuegt, legt die Dateien dazu und backt neu; dieses Modul aendert sich
 * nicht. Das war die Zusage „neue Landschaftstypen ohne Umbau der Engine",
 * und sie waere gebrochen, stuende hier `if (art === 'berge')`.
 */
export function stilbuchFuer(stil: Kartenstil, atlas?: Atlas): Stilbuch {
  const tabelle: Record<string, Stileintrag> = { ...pinselEintraege(stil) };

  for (const art of Object.keys(atlas?.verzeichnis.arten ?? {})) {
    const o = ordnung(art);
    const gemalt = atlas && bildEintrag(atlas, art, o.lage, o.ebene);
    /*
     * **Das Bild hat Vorrang, der Pinsel ist der Rueckfallweg.**
     *
     * Nicht umgekehrt, und nicht als Einstellung. Solange die Grafiken nicht
     * geladen sind – beim ersten Bild, ohne Netz, bei einer kaputten Datei –
     * malt der Pinsel, und die Karte sieht aus wie immer. Eine Karte, die
     * ohne ihre Bilder weiss bleibt, waere ein schlechter Tausch fuer etwas
     * schoeneres Laub.
     */
    /*
     * **Die Ordnung kommt aus der Tabelle, nicht aus dem Atlas.**
     *
     * `bildEintrag` weiss, wie ein Bild gezeichnet wird – Ausschnitt,
     * Mipstufe, Anker. Es weiss nicht, ob diese Art eine Masse bildet; das
     * ist Bedeutung und steht in `ORDNUNG`.
     *
     * Hier fehlte genau diese eine Zeile, und der Fehler war im Bild
     * unsichtbar: Der gemalte Eintrag kam ohne `verdichtet` zurück, also
     * lief **kein einziger Baum** durch das Waldwerk. Boden, Schatten und
     * Kronendach wurden gerechnet und nie gezeichnet. Gefunden, indem die
     * Bodenlage knallrot gemalt wurde – es war kein roter Bildpunkt da.
     */
    if (gemalt) tabelle[art] = { ...gemalt, verdichtet: o.verdichtet, unterwuchs: o.unterwuchs };
  }

  return stilbuchAus(stil.id, tabelle);
}

/**
 * Was dieser Stil ohne Bilder zeichnen kann.
 *
 * Fuer Artbook ist das der Federbaum aus `baumzeichnung.ts` – unveraendert,
 * mit denselben Zahlen. Ein spaeterer Stil bringt hier seine eigenen Pinsel
 * mit oder gar keine.
 */
function pinselEintraege(stil: Kartenstil): Record<string, Stileintrag> {
  return {
    wald: {
      varianten: 3,
      /* `GROESSE` aus `baumzeichnung.ts`. Der Federbaum bleibt, wie er war. */
      hoehe: 15,
      ...ordnung('wald'),
      zeichne(ctx, s, massstab) {
        /*
         * Zurueck in die Form, die `zeichneBaum` kennt.
         *
         * Diese Uebersetzung ist der ganze Preis dafuer, dass die alte
         * Zeichenfunktion unveraendert bleibt – und sie ist es wert: Jede
         * Aenderung an ihr waere eine Aenderung am Aussehen.
         */
        const baum: Baum = {
          x: s.x,
          y: s.y,
          /* `zeichneBaum` rechnet die Hoehe aus GROESSE × groesse. */
          groesse: s.h / 15,
          neigung: s.dreh,
          form: s.variante,
          /* `zeichneBaum` liest `rohform` nicht – es waehlt ueber `form`. */
          rohform: (s.variante + 0.5) / 3,
        };
        zeichneBaum(ctx, baum, stil, massstab);
      },
    },
  };
}
