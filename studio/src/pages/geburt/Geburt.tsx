/**
 * Die Geburt des Buches.
 *
 * Kein Einrichtungsassistent. Es gibt keine Schrittanzeige, keinen Balken,
 * keine Formularkarte – nichts, was verraet, dass darunter eine Datenbank
 * liegt. Es gibt einen dunklen Tisch, ein Buch darauf, und ein paar ruhige
 * Fragen, die einander abloesen wie Szenen.
 *
 * Das Buch ist die Vorschau. Es gibt keine zweite, kleinere Ansicht daneben,
 * auf der man nachsaehe, was man gerade eingestellt hat: Was gewaehlt wird,
 * geschieht sofort an dem Buch, das man vor sich hat.
 *
 * Der Tisch bleibt ueber alle Szenen stehen. Nur was darauf liegt, wechselt.
 */

import { useEffect, useRef, useState } from 'react';
import { useStudio } from '../../store/useStudio';
import { newBookIdentity } from '../../lib/bookIdentity';
import { BUCH_TEXTE } from '../../lib/bookTexts';
import { deskStyle } from '../../lib/textures';
import { ClosedBook } from '../../components/book/CoverBoard';
import type { BookIdentity } from '../../types';
import { Einbandwahl } from './Einbandwahl';
import { Titelwahl } from './Titelwahl';
import { Zeichenwahl } from './Zeichenwahl';

const T = BUCH_TEXTE.geburt;

/**
 * Die Szenen in ihrer Reihenfolge.
 *
 * Absichtlich eine schlichte Liste: Sie ist die einzige Stelle, an der die
 * Abfolge steht. Eine weitere Szene ist ein Eintrag hier und ein Fall unten.
 */
const SZENEN = ['anfang', 'einband', 'titel', 'zeichen', 'vollendet'] as const;
type Szene = (typeof SZENEN)[number];

/**
 * Zwei Anlaesse, dieselben Szenen.
 *
 * `geburt` – das Buch entsteht. `neubinden` – es gibt es laengst, und nur der
 * Einband wechselt. Unterschiedlich sind allein die Worte am Anfang und am
 * Ende; der Weg dazwischen ist derselbe, und das ist der Punkt: Wer sein Buch
 * neu bindet, soll denselben Ernst erleben wie beim ersten Mal.
 */
export type Modus = 'geburt' | 'neubinden';

export function Geburt({ onFertig, modus = 'geburt' }: { onFertig: () => void; modus?: Modus }) {
  const saveBook = useStudio((s) => s.saveBook);
  const vorhanden = useStudio((s) => s.settings.book);

  const neu = modus === 'neubinden';
  const worteAnfang = neu ? T.anfangNeu : T.anfang;
  const worteEnde = neu ? T.vollendenNeu : T.vollenden;

  /*
   * Der Entwurf lebt im Arbeitsspeicher, bis das Buch vollendet wird. Wer
   * mitten in der Erschaffung das Fenster schliesst, hat kein halbes Buch in
   * der Datenbank stehen – er beginnt neu, und das ist richtig so.
   *
   * Ist bereits ein Buch da (spaeteres Bearbeiten), wird es der Entwurf.
   */
  const [entwurf, setEntwurf] = useState<BookIdentity>(() => vorhanden ?? newBookIdentity());
  const [szene, setSzene] = useState<Szene>('anfang');
  /** Sichtbarkeit fuer das ruhige Ein- und Ausblenden zwischen den Szenen. */
  const [sichtbar, setSichtbar] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  /* Die erste Szene blendet sich von selbst ein – der Tisch ist zuerst leer. */
  useEffect(() => {
    const t = window.setTimeout(() => setSichtbar(true), 420);
    timers.current.push(t);
    return () => window.clearTimeout(t);
  }, []);

  const aendern = (patch: Partial<BookIdentity>) =>
    setEntwurf((alt) => ({ ...alt, ...patch, updatedAt: Date.now() }));

  /** Szenenwechsel: erst verklingen lassen, dann wechseln, dann aufblenden. */
  const wechseln = (ziel: Szene) => {
    setSichtbar(false);
    timers.current.push(
      window.setTimeout(() => {
        setSzene(ziel);
        setSichtbar(true);
      }, 340),
    );
  };

  const index = SZENEN.indexOf(szene);
  const zurueck = () => index > 1 && wechseln(SZENEN[index - 1]);
  const weiter = () => index < SZENEN.length - 1 && wechseln(SZENEN[index + 1]);

  /** Das Buch vollenden: jetzt erst wird geschrieben. */
  const vollenden = () => {
    saveBook({
      title: entwurf.title.trim() || 'Mein Buch',
      subtitle: entwurf.subtitle?.trim() ?? '',
      coverMaterial: entwurf.coverMaterial,
      coverColor: entwurf.coverColor,
      emblemType: entwurf.emblemType,
      emblemId: entwurf.emblemId,
      emblemImageId: entwurf.emblemImageId,
      emblemScale: entwurf.emblemScale,
      emblemRotation: entwurf.emblemRotation,
      emblemPrompt: entwurf.emblemPrompt,
    });
    wechseln('vollendet');
  };

  const zeigtBuch = szene !== 'anfang';

  return (
    <div
      /*
       * `overscroll-contain` und `touch-manipulation`: Auf dem iPhone soll
       * das Tippen und Wischen am Buch nicht nebenbei die Seite verschieben
       * oder eine Doppeltipp-Vergroesserung ausloesen.
       */
      className="relative flex min-h-full w-full flex-col items-center overscroll-contain px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] touch-manipulation"
      style={deskStyle}
    >
      {szene === 'anfang' ? (
        <Anfang sichtbar={sichtbar} onWeiter={weiter} worte={worteAnfang} />
      ) : (
        <div className="flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-9 py-6">
          {/* --------------------------------------------------- Das Buch */}
          <div
            className="shrink-0 transition-opacity duration-500"
            style={{ opacity: zeigtBuch ? 1 : 0 }}
          >
            <ClosedBook
              identity={entwurf}
              width={szene === 'vollendet' ? 268 : 208}
              height={szene === 'vollendet' ? 366 : 284}
              className="transition-all duration-700 ease-out"
            />
          </div>

          {/* ------------------------------------------------- Die Frage */}
          <div
            className="w-full transition-opacity duration-300"
            style={{ opacity: sichtbar ? 1 : 0 }}
          >
            {szene === 'einband' && (
              <Einbandwahl identity={entwurf} onChange={aendern} onWeiter={weiter} />
            )}
            {szene === 'titel' && (
              <Titelwahl
                identity={entwurf}
                onChange={aendern}
                onWeiter={weiter}
                onZurueck={zurueck}
              />
            )}
            {szene === 'zeichen' && (
              <Zeichenwahl
                identity={entwurf}
                onChange={aendern}
                onZurueck={zurueck}
                onVollenden={vollenden}
                vollendenLabel={worteEnde.knopf}
              />
            )}
            {szene === 'vollendet' && <Vollendet onOeffnen={onFertig} worte={worteEnde} />}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ Szene eins ---- */

/**
 * Der Anfang.
 *
 * Der Tisch ist leer. Nach einem Moment stehen zwei Zeilen darauf, und die
 * ganze Flaeche ist die Schaltflaeche – es gibt keinen Knopf, den man suchen
 * muesste. Fuer Vorleseprogramme traegt sie eine Beschriftung.
 */
function Anfang({
  sichtbar,
  onWeiter,
  worte,
}: {
  sichtbar: boolean;
  onWeiter: () => void;
  worte: { zeile: string; unterzeile: string; aria: string };
}) {
  return (
    <button
      type="button"
      onClick={onWeiter}
      aria-label={worte.aria}
      className="flex flex-1 w-full cursor-pointer flex-col items-center justify-center no-tap-highlight"
    >
      <div
        className="max-w-md text-center transition-opacity duration-[1400ms] ease-out"
        style={{ opacity: sichtbar ? 1 : 0 }}
      >
        <p className="font-serif text-[22px] leading-relaxed text-paper-300/85 sm:text-[26px]">
          {worte.zeile}
        </p>
        <p
          className="mt-7 font-serif text-[14px] italic tracking-wide text-paper-400/45 transition-opacity duration-[1400ms] delay-500"
          style={{ opacity: sichtbar ? 1 : 0 }}
        >
          {worte.unterzeile}
        </p>
      </div>
    </button>
  );
}

/* ---------------------------------------------------------- Szene fuenf ---- */

/**
 * Vollendet.
 *
 * Alles Werkzeug ist fort. Es liegt nur noch das Buch da, und darunter steht
 * eine Einladung. Dieser Moment bekommt Raum – deshalb steht hier fast nichts.
 */
function Vollendet({
  onOeffnen,
  worte,
}: {
  onOeffnen: () => void;
  worte: { ruhe: string; oeffnen: string };
}) {
  return (
    <div className="text-center">
      <p className="font-serif text-[17px] leading-relaxed text-paper-300/80">{worte.ruhe}</p>
      <button
        type="button"
        onClick={onOeffnen}
        className="mt-6 inline-flex min-h-[46px] items-center rounded-full border border-gild-500/35 px-7 font-serif text-[15px] text-gild-300 transition-colors duration-300 hover:border-gild-400/70 no-tap-highlight"
      >
        {worte.oeffnen}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------ Bausteine ---- */

/** Die Frage einer Szene – ueberall gleich gesetzt. */
export function SzenenFrage({ frage, hinweis }: { frage: string; hinweis?: string }) {
  return (
    <div className="mb-6 text-center">
      <p className="font-serif text-[19px] leading-snug text-paper-300/90 sm:text-[21px]">{frage}</p>
      {hinweis && (
        <p className="mx-auto mt-2.5 max-w-[42ch] font-serif text-[13px] italic leading-relaxed text-paper-400/50">
          {hinweis}
        </p>
      )}
    </div>
  );
}

/**
 * Der Weg weiter.
 *
 * Kein bunter Handlungsaufruf, keine Fortschrittsanzeige – zwei Worte in der
 * Schrift des Buches. Die Trefferflaeche ist trotzdem gross genug fuer einen
 * Daumen (44 Pixel), auch wenn man das nicht sieht.
 */
export function SzenenWeg({
  onZurueck,
  onWeiter,
  weiterLabel = BUCH_TEXTE.geburt.weiter,
  weiterAus = false,
}: {
  onZurueck?: () => void;
  onWeiter: () => void;
  weiterLabel?: string;
  weiterAus?: boolean;
}) {
  return (
    <div className="mt-9 flex items-center justify-center gap-8">
      {onZurueck && (
        <button
          type="button"
          onClick={onZurueck}
          className="min-h-[44px] px-2 font-serif text-[14px] italic text-paper-400/45 transition-colors hover:text-paper-300/70 no-tap-highlight"
        >
          {BUCH_TEXTE.geburt.zurueck}
        </button>
      )}
      <button
        type="button"
        onClick={onWeiter}
        disabled={weiterAus}
        className="min-h-[44px] rounded-full border border-gild-500/35 px-6 font-serif text-[15px] text-gild-300 transition-colors duration-300 enabled:hover:border-gild-400/70 disabled:opacity-30 no-tap-highlight"
      >
        {weiterLabel}
      </button>
    </div>
  );
}
