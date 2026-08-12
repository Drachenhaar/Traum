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
import { neuesBuch } from '../../lib/bibliothek';
import { BUCH_TEXTE } from '../../lib/bookTexts';
import { ABSICHTEN, profilAus, profilVon, type Absicht } from '../../lib/profil';
import { deskStyle } from '../../lib/textures';
import { cx } from '../../lib/utils';
import { ClosedBook } from '../../components/book/CoverBoard';
import type { LibraryBook } from '../../types';
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
const SZENEN = ['anfang', 'einband', 'titel', 'zeichen', 'ausrichtung', 'vollendet'] as const;
type Szene = (typeof SZENEN)[number];

/**
 * Die Ausrichtung wird nur beim *weiteren* Buch gefragt.
 *
 * Beim ersten hat das Onboarding sie schon erfragt – ein zweites Mal danach
 * zu fragen waere Formularlogik, nicht Zeremonie. Und ohne diese Szene faellt
 * sie einfach aus der Abfolge heraus, ohne dass irgendwo ein Schritt fehlt.
 */
function szenenFolge(modus: Modus): readonly Szene[] {
  return modus === 'weiterer' ? SZENEN : SZENEN.filter((s) => s !== 'ausrichtung');
}

/**
 * Zwei Anlaesse, dieselben Szenen.
 *
 * `geburt` – das Buch entsteht. `neubinden` – es gibt es laengst, und nur der
 * Einband wechselt. Unterschiedlich sind allein die Worte am Anfang und am
 * Ende; der Weg dazwischen ist derselbe, und das ist der Punkt: Wer sein Buch
 * neu bindet, soll denselben Ernst erleben wie beim ersten Mal.
 */
export type Modus = 'geburt' | 'neubinden' | 'weiterer';

export function Geburt({ onFertig, modus = 'geburt' }: { onFertig: (buchId?: string) => void; modus?: Modus }) {
  const saveBook = useStudio((s) => s.saveBook);
  const erstelleBuch = useStudio((s) => s.erstelleBuch);
  const oeffneBuch = useStudio((s) => s.oeffneBuch);
  const vorhanden = useStudio((s) => s.settings.book);

  const neu = modus === 'neubinden';
  const weiterer = modus === 'weiterer';
  const worteAnfang = weiterer ? T.anfangWeiterer : neu ? T.anfangNeu : T.anfang;
  const worteEnde = weiterer ? T.vollendenWeiterer : neu ? T.vollendenNeu : T.vollenden;
  const folge = szenenFolge(modus);

  /*
   * Der Entwurf lebt im Arbeitsspeicher, bis das Buch vollendet wird. Wer
   * mitten in der Erschaffung das Fenster schliesst, hat kein halbes Buch in
   * der Datenbank stehen – er beginnt neu, und das ist richtig so.
   *
   * Ist bereits ein Buch da (spaeteres Bearbeiten), wird es der Entwurf.
   */
  /*
   * Beim weiteren Buch beginnt der Entwurf leer – das offene Buch ist hier
   * nicht die Vorlage, sondern nur das, was gerade danebenliegt.
   */
  const [entwurf, setEntwurf] = useState<LibraryBook>(() =>
    modus === 'weiterer' ? neuesBuch() : vorhanden ?? neuesBuch(),
  );
  const [szene, setSzene] = useState<Szene>('anfang');
  /** Die Kennung des soeben angelegten Bandes – nur im Modus „weiterer". */
  const [angelegt, setAngelegt] = useState<string>();
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

  const aendern = (patch: Partial<LibraryBook>) =>
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

  const index = folge.indexOf(szene);
  const zurueck = () => index > 1 && wechseln(folge[index - 1]);
  const weiter = () => index < folge.length - 1 && wechseln(folge[index + 1]);

  /** Das Buch vollenden: jetzt erst wird geschrieben. */
  const vollenden = () => {
    const einband = {
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
    };

    /*
     * Ein weiteres Buch entsteht *neben* dem offenen und wird nicht mit ihm
     * verwechselt: `saveBook` schriebe in den aufgeschlagenen Band. Es kommt
     * als eigener Band in die Bibliothek – aufgeschlagen wird es erst am
     * Ende, wenn jemand darauf tippt.
     */
    if (weiterer) {
      void erstelleBuch({
        ...einband,
        worldName: einband.title,
        worldTagline: einband.subtitle,
        weg: entwurf.weg,
      }).then((band) => setAngelegt(band.id));
    } else {
      saveBook(einband);
    }
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
                onVollenden={weiterer ? weiter : vollenden}
                vollendenLabel={weiterer ? T.weiter : worteEnde.knopf}
              />
            )}
            {szene === 'ausrichtung' && (
              <Ausrichtungswahl
                gewaehlt={entwurf.profil?.absicht}
                onChange={(absicht) =>
                  aendern({ profil: absicht ? profilAus(absicht, profilVon(entwurf)) : undefined })
                }
                onZurueck={zurueck}
                onVollenden={vollenden}
                vollendenLabel={worteEnde.knopf}
              />
            )}
            {szene === 'vollendet' && (
              <Vollendet
                onOeffnen={() => {
                  if (weiterer && angelegt) void oeffneBuch(angelegt).then(() => onFertig(angelegt));
                  else onFertig();
                }}
                worte={worteEnde}
              />
            )}
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

/* --------------------------------------------------- Szene: Ausrichtung ---- */

/**
 * Wovon das Buch handelt.
 *
 * Die einzige Szene mit einem ausdrücklichen „egal“, und das ist Absicht:
 * Diese Wahl darf niemanden aufhalten. Sie schaltet nichts frei und nichts
 * ab – sie entscheidet über Beispiele und erste Vorschläge, sonst nichts.
 * Wäre es mehr, wären aus einem Buch fünf Programme geworden.
 */
function Ausrichtungswahl({
  gewaehlt,
  onChange,
  onZurueck,
  onVollenden,
  vollendenLabel,
}: {
  gewaehlt?: Absicht;
  onChange: (absicht: Absicht | undefined) => void;
  onZurueck: () => void;
  onVollenden: () => void;
  vollendenLabel: string;
}) {
  return (
    <div>
      <SzenenFrage frage={T.ausrichtung.frage} hinweis={T.ausrichtung.hinweis} />

      <div className="mx-auto grid max-w-md gap-1.5">
        {ABSICHTEN.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onChange(gewaehlt === a.id ? undefined : a.id)}
            className={cx(
              'rounded-[3px] border px-4 py-3 text-left transition-colors no-tap-highlight',
              gewaehlt === a.id
                ? 'border-gild-500/50 bg-gild-400/10'
                : 'border-paper-400/15 hover:border-gild-500/30',
            )}
          >
            <p className="font-serif text-[15.5px] text-paper-200/90">{a.satz}</p>
            <p className="mt-0.5 font-serif text-[12.5px] italic leading-snug text-paper-400/45">
              {a.zeile}
            </p>
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className={cx(
            'mt-1 min-h-[40px] font-serif text-[13px] italic transition-colors no-tap-highlight',
            gewaehlt ? 'text-paper-400/40 hover:text-gild-500' : 'text-gild-500/70',
          )}
        >
          {T.ausrichtung.ohne}
        </button>
      </div>

      <div className="mt-7 flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={onZurueck}
          className="min-h-[44px] font-serif text-[13.5px] italic text-paper-400/45 transition-colors hover:text-paper-300 no-tap-highlight"
        >
          {T.zurueck}
        </button>
        <button
          type="button"
          onClick={onVollenden}
          className="inline-flex min-h-[46px] items-center rounded-full border border-gild-500/35 px-7 font-serif text-[15px] text-gild-300 transition-colors duration-300 hover:border-gild-400/70 no-tap-highlight"
        >
          {vollendenLabel}
        </button>
      </div>
    </div>
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
