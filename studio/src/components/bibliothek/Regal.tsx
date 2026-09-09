/**
 * Das Regal.
 *
 * Bis hierher standen die Bände in einem Raster: gleiche Zellen, gleiche
 * Abstände, gleiche Höhe. Technisch tadellos und die falsche Aussage. Ein
 * Raster sagt „Datensätze"; eine Reihe verschieden hoher Bände auf einem Brett
 * sagt „meine Bücher". Es ist derselbe Inhalt und eine andere Auskunft.
 *
 * Drei Entscheidungen tragen diese Datei:
 *
 * **Erstens: Das Brett wird gemalt, nicht gebaut.**
 * Naheliegend wäre, die Bücher in Reihen zu zerlegen und unter jede Reihe ein
 * Brett zu setzen. Das erzwingt Messen – wie viele Bücher passen nebeneinander?
 * – und Messen erzwingt einen Beobachter, einen zweiten Bau und ein Flackern
 * beim ersten Zeichnen. Stattdessen liegt das Brett als sich wiederholender
 * Verlauf **hinter** dem Gitter, in genau dem Abstand, in dem die Zeilen
 * stehen. Das Gitter darf umbrechen, wie es will; unter jeder Zeile ist Holz.
 *
 * **Zweitens: Die Staffelung ist gewürfelt, aber nicht zufällig.**
 * Höhe und Neigung kommen aus der Kennung des Bandes. Derselbe Band steht bei
 * jedem Aufschlagen gleich da. Ein echter Zufall würde die Bücher bei jedem
 * Zeichnen neu hinstellen, und ein Regal, das sich umräumt, während man es
 * ansieht, ist kein Ort.
 *
 * **Drittens: Ein Zeichen für „zuletzt offen", nicht drei.**
 * Der vorderste Band bekommt ein goldenes Lesebändchen. Kein Rahmen, kein
 * Leuchten, kein Wort „aktiv". Ein Buch, das man weggelegt hat, erkennt man am
 * Bändchen, das herausschaut.
 */

import { ClosedBook } from '../book/CoverBoard';
import { Mehr, type MehrEintrag } from '../ui/Mehr';
import { weltzeileFuer } from '../../lib/buchart';
import { cx } from '../../lib/utils';
import type { LibraryBook } from '../../types';

/* ------------------------------------------------------------- Das Mass ---- */

/*
 * Die Zahlen des Regals – an einer Stelle, weil drei Dinge sie teilen müssen:
 * die Spaltenbreite des Gitters, die Zeilenhöhe und der Verlauf, der das Brett
 * malt. Liefen sie auseinander, schwebten die Bücher über dem Holz oder
 * stünden darin.
 *
 * `BLOCK` ist die Zugabe rechts: `ClosedBook` zeichnet den Buchblock mit den
 * Seitenkanten **neben** den Deckel hinaus. Wer nur die Deckelbreite als
 * Spalte nimmt, schneidet ihn ab.
 */
const DECKEL = 97;
const BLOCK = 14;
const SPALTE = DECKEL + BLOCK;
const LUECKE = 4;

/*
 * Warum 97 und nicht 66.
 *
 * Mit 66 standen vier Bände auf dem Handybrett, und darunter blieben 80 Punkte
 * für den Titel – gemessen wurde daraus „Die Chro…", „Nebelrei", „Mooshal".
 * Ein Regal, dessen Rücken man nicht lesen kann, ist ein Regal mit dem Rücken
 * zur Wand. 97 + 14 + 4 ergibt 115, und dreimal 115 passt genau in die 345
 * Punkte, die ein iPhone abzüglich der Ränder übrig lässt.
 */

/** Der höchste Band. Alle anderen sind kleiner – nie grösser. */
const HOCH = 138;
/*
 * Was unter dem Brett bleibt: Titel und Welt.
 *
 * Gemessen, nicht geschätzt – der erste Wert (66) war zu klein, und die
 * Weltzeile lief in die nächste Regalreihe hinein. Die Rechnung: 8 Abstand
 * + 34 für zwei Titelzeilen + 2 + 36 für die Zeile mit dem Menü. Der
 * Menüknopf ist 36 Punkte hoch, weil ein Daumen ihn treffen soll; genau
 * diese 36 hatte ich mit 13 verwechselt.
 */
const SCHILD = 82;
const BRETT = 6;
const ZEILE = HOCH + BRETT + SCHILD;

/**
 * Eine Zahl zwischen 0 und 1 aus einer Kennung – immer dieselbe.
 *
 * Kein Anspruch auf Güte: Sie muss nur streuen und beständig sein. Ein Band
 * soll morgen dastehen wie heute.
 */
function streuung(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

/* ------------------------------------------------------------ Das Regal ---- */

export function Regal({
  buecher,
  alle,
  onOeffnen,
  aktionen,
  gedaempft,
}: {
  buecher: LibraryBook[];
  /** Alle Bände – gebraucht, um zu wissen, ob eine Welt geteilt wird. */
  alle: LibraryBook[];
  onOeffnen: (buch: LibraryBook) => void;
  aktionen: (buch: LibraryBook) => MehrEintrag[];
  gedaempft?: boolean;
}) {
  if (!buecher.length) return null;

  return (
    <div
      className={cx('mt-6', gedaempft && 'opacity-60')}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, ${SPALTE}px)`,
        columnGap: LUECKE,
        gridAutoRows: `${ZEILE}px`,
        justifyContent: 'start',
        /*
         * Das Brett: eine Kante aus Holz und darunter ein Hauch Schatten, in
         * jeder Zeile an derselben Stelle. Die Ränder greifen bewusst über das
         * Gitter hinaus (`-mx`), damit das Brett breiter ist als die Bücher
         * darauf – ein Regal endet nicht am letzten Band.
         */
        backgroundImage: `repeating-linear-gradient(
          to bottom,
          transparent 0px,
          transparent ${HOCH}px,
          rgba(120, 92, 58, 0.5) ${HOCH}px,
          rgba(120, 92, 58, 0.5) ${HOCH + 2}px,
          rgba(58, 43, 28, 0.55) ${HOCH + 2}px,
          rgba(58, 43, 28, 0.55) ${HOCH + BRETT}px,
          rgba(0, 0, 0, 0.22) ${HOCH + BRETT}px,
          rgba(0, 0, 0, 0.22) ${HOCH + BRETT + 7}px,
          transparent ${HOCH + BRETT + 7}px,
          transparent ${ZEILE}px
        )`,
        backgroundSize: '100% 100%',
      }}
    >
      {buecher.map((b, i) => (
        <Band
          key={b.id}
          buch={b}
          alle={alle}
          vorderstes={i === 0 && !gedaempft}
          onOeffnen={() => onOeffnen(b)}
          aktionen={aktionen(b)}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- Ein Band --- */

function Band({
  buch,
  alle,
  vorderstes,
  onOeffnen,
  aktionen,
}: {
  buch: LibraryBook;
  alle: LibraryBook[];
  vorderstes?: boolean;
  onOeffnen: () => void;
  aktionen: MehrEintrag[];
}) {
  const s = streuung(buch.id);
  /*
   * Höhe und Neigung.
   *
   * Der vorderste Band steht aufrecht und in voller Höhe – er ist der, den man
   * zuletzt in der Hand hatte. Alle anderen streuen um bis zu acht Prozent und
   * neigen sich um bis zu anderthalb Grad. Mehr sähe nicht nach Regal aus,
   * sondern nach einem Fehler im Satz.
   */
  const hoehe = vorderstes ? HOCH : Math.round(HOCH * (0.88 + s * 0.11));
  const neigung = vorderstes ? 0 : (s - 0.5) * 3;

  const welt = weltzeileFuer(buch, alle);

  return (
    <div className="flex h-full flex-col">
      {/* Der Band steht auf dem Brett – also unten bündig, nicht oben. */}
      <div className="flex items-end" style={{ height: HOCH }}>
        <button
          type="button"
          onClick={onOeffnen}
          aria-label={`„${buch.title}“ aufschlagen`}
          className="relative origin-bottom transition-transform duration-500 ease-out hover:-translate-y-1 no-tap-highlight"
          style={{ transform: `rotate(${neigung}deg)` }}
        >
          {/*
            Mit Prägung, nicht ohne.

            Ohne Schrift zeigte der Deckel nur Farbe – das Zeichen schrumpfte
            auf 26 Punkte und verschwand auf dunklem Leder. Der ganze Deckel,
            herunterskaliert, trägt sein Zeichen bei 97 Punkten mit rund 44 –
            sichtbar, und die Rubrik nennt die Art des Bandes.
          */}
          <ClosedBook identity={buch} width={DECKEL} height={hoehe} />
          {vorderstes && (
            /*
             * Das Lesebändchen. Es hängt über die obere Kante hinaus, wie ein
             * Bändchen, das im Buch liegt – deshalb sitzt es oberhalb von 0
             * und nicht innerhalb des Deckels.
             */
            <span
              aria-hidden
              className="absolute -top-[7px] right-[13px] z-20 h-[26px] w-[5px] rounded-t-[1px]"
              style={{ background: 'linear-gradient(180deg,#E3BE63,#9C7B33)' }}
            />
          )}
        </button>
      </div>

      {/*
        Unter dem Brett: der Titel zum Lesen, darunter Art und Welt.

        Der Titel steht auch auf dem Deckel – dort aber bei 97 Punkten
        Deckelbreite in etwa acht Punkt Schrift, also als Form und nicht als
        Wort. Wer ein Regal überfliegt, liest die Zeile darunter.

        Das Menü sitzt in der zweiten Zeile und nicht neben dem Titel: Neben
        dem Titel nahm es ihm ein Viertel der Breite, und genau daran sind die
        Namen vorher zerbrochen.
      */}
      <div className="mt-2 min-w-0" style={{ width: SPALTE }}>
        <button
          type="button"
          onClick={onOeffnen}
          className="block w-full min-w-0 text-left no-tap-highlight"
        >
          <p className="line-clamp-2 min-h-[34px] font-serif text-[13px] leading-tight text-paper-200/90">
            {buch.title || 'Ohne Titel'}
          </p>
        </button>
        <div className="mt-0.5 flex min-w-0 items-center gap-1">
          {/*
            Hier steht die Welt und **nicht** die Art.

            Die Art steht als Rubrik oben auf dem Deckel – „ROMAN", „ARTBOOK",
            „D&D / ROLLENSPIEL" –, und beides zu zeigen hiesse, dieselbe
            Auskunft zweimal zu geben und der Welt die Breite zu nehmen.
            Gemessen war das Ergebnis „ROMAN · Die…", was von der Welt genau
            nichts übrigliess.

            Zwei Zeilen statt Abschneiden, und das kostet nichts: Die Zeile ist
            ohnehin 36 Punkte hoch, weil der Menüknopf so hoch ist. Solange
            eine Welt den Titel ihres Gründungsbandes trägt – sie hat noch
            keinen eigenen Namen –, sind Namen wie „Die Chroniken des
            Nebelwaldes" der Normalfall und nicht die Ausnahme.
          */}
          <p className="line-clamp-2 min-w-0 flex-1 font-sans text-[9.5px] leading-tight tracking-[0.04em] text-paper-400/45">
            {welt}
          </p>
          <span className="-mr-1.5 shrink-0 scale-90 opacity-55">
            <Mehr eintraege={aktionen} />
          </span>
        </div>
      </div>
    </div>
  );
}
