/**
 * Die Schauseiten.
 *
 * Keine Häkchenliste, keine Sprechblasen, die auf Knöpfe zeigen. Es sind
 * Buchseiten, die man umblättert – und jede trägt genau einen Gedanken.
 *
 * Was hier aber sehr wohl steht: dass es eine Führung ist. Das fehlte, und
 * es hat gefehlt. „Die Chroniken von Mooshalde" als erste Rubrik las sich
 * wie der Anfang des eigenen Buches – als hätte jemand einem eine fremde
 * Geschichte hineingeschrieben. Deshalb liegt über jeder dieser Seiten ein
 * Band, das sagt, was sie sind: eine Vorführung an einem Beispiel, und der
 * Weg hinaus steht daneben.
 *
 * Was hier gezeigt wird, ist keine Attrappe: Es sind gewöhnliche Einträge und
 * gewöhnliche Beziehungen, dieselben Formen wie überall. Nur stehen sie im
 * Arbeitsspeicher statt in der Datenbank, damit hinterher nichts aufzuräumen
 * ist.
 *
 * Am Ende wird nichts ausgeblendet. Es wird umgeblättert, und dann ist da das
 * eigene Buch.
 */

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DEMO_EINTRAEGE,
  DEMO_KANTEN,
  DEMO_ZEITPUNKTE,
  demoEintrag,
} from '../../lib/onboarding/beispielwelt';
import { wegById } from '../../lib/onboarding/wege';
import { relationType } from '../../lib/relations';
import { leseZeit, ordnung, schreibeJahr } from '../../lib/chronik/zeit';
import { datiere, weltzustand } from '../../lib/chronik/zustand';
import { cx } from '../../lib/utils';

export function Schauseiten({
  weg,
  onFertig,
  onZurueck,
}: {
  weg: string;
  onFertig: () => void;
  onZurueck: () => void;
}) {
  const [seite, setSeite] = useState(0);
  const seiten = [Figur, Zusammenhaenge, Zeit, Folgen, WegSeite, Uebergabe];
  const Inhalt = seiten[seite];
  const letzte = seite === seiten.length - 1;

  return (
    <div className="paper-sheet flex min-h-full w-full flex-col px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-10">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        {/*
          Das Band. Es steht auf jeder Schauseite, nicht nur auf der ersten:
          Wer mitten hineinkommt oder kurz weggesehen hat, soll nicht raten
          müssen, wessen Welt er da gerade liest.
        */}
        <div className="flex items-center justify-between gap-3 border-b border-gild-500/25 pb-2.5">
          <p className="rubric text-gild-600">
            Führung · ein Beispiel, nicht deine Welt
          </p>
          <button
            type="button"
            onClick={onFertig}
            className="shrink-0 font-serif text-[13px] italic text-ink-faint transition-colors hover:text-gild-600 no-tap-highlight"
          >
            Überspringen
          </button>
        </div>

        {/*
         * Die Seite selbst. `key` erzwingt einen neuen Knoten je Seite – so
         * blendet jede für sich auf, statt dass Text unter Text wechselt.
         */}
        <div key={seite} className="animate-fadeIn flex-1 py-6">
          <Inhalt weg={weg} onFertig={onFertig} />
        </div>

        {/*
         * Blättern statt Fortschritt. Keine „Seite 3 von 6“ – nur Punkte, so
         * viele wie das Heft dick ist, und zwei stille Pfeile.
         */}
        {!letzte && (
          <div className="flex items-center justify-between gap-4 border-t border-paper-300/60 pt-4">
            <button
              type="button"
              onClick={() => (seite === 0 ? onZurueck() : setSeite((s) => s - 1))}
              className="inline-flex min-h-[44px] items-center gap-1 font-serif text-[14px] italic text-ink-faint transition-colors hover:text-ink-muted no-tap-highlight"
            >
              <ChevronLeft size={15} /> Zurück
            </button>

            <div aria-hidden className="flex gap-1.5">
              {seiten.map((_, i) => (
                <span
                  key={i}
                  className={cx(
                    'block h-[5px] w-[5px] rounded-full transition-colors',
                    i === seite ? 'bg-gild-500' : 'bg-paper-400/60',
                  )}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSeite((s) => s + 1)}
              className="inline-flex min-h-[44px] items-center gap-1 font-serif text-[15px] text-gild-600 transition-colors hover:text-gild-500 no-tap-highlight"
            >
              Weiter <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

type SeitenProps = { weg: string; onFertig: () => void };

/* ------------------------------------------------------------- Bausteine */

function Ueberschrift({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-serif text-[27px] leading-[1.15] text-ink sm:text-[33px]">{children}</h1>
  );
}

/* --------------------------------------------------------------- Seite 1 */

function Figur() {
  const elian = demoEintrag('elian');
  return (
    <>
      <p className="rubric mb-2">Die Chroniken von Mooshalde</p>
      <Ueberschrift>Eine Geschichte beginnt oft mit jemandem.</Ueberschrift>
      <span aria-hidden className="rule-gild mt-6 block w-24 opacity-70" />

      <p className="prose-book dropcap mt-7 max-w-[44ch]">{elian.description}</p>

      {/*
       * Keine Feldtabelle. Ein Buch schreibt so etwas als Zeile, nicht als
       * Formular – und genau so sieht die Seite später auch im eigenen Buch aus.
       */}
      <p className="mt-8 font-serif text-[15px] leading-relaxed text-ink-muted">
        <span className="text-ink">Elian</span>, siebzehn Jahre, Schmiedelehrling in{' '}
        <span className="text-ink">Mooshalde</span>.
      </p>
    </>
  );
}

/* --------------------------------------------------------------- Seite 2 */

function Zusammenhaenge() {
  const kanten = DEMO_KANTEN.filter(
    (r) => r.fromId === 'demo_elian' || r.toId === 'demo_elian',
  );
  const nameVon = (id: string) => DEMO_EINTRAEGE.find((e) => e.id === id)?.title ?? '';

  return (
    <>
      <Ueberschrift>Aber niemand steht allein.</Ueberschrift>
      <span aria-hidden className="rule-gild mt-6 block w-24 opacity-70" />

      <p className="prose-book mt-7 max-w-[44ch]">
        Was du schreibst, bleibt nicht für sich. Jede Seite weiß, woran sie hängt.
      </p>

      {/* Als Randnotizen gesetzt, nicht als Graph – dieselbe Form wie im Buch. */}
      <ul className="mt-8 space-y-3">
        {kanten.map((r) => {
          const vorwaerts = r.fromId === 'demo_elian';
          const anderer = vorwaerts ? r.toId : r.fromId;
          const def = relationType(r.type);
          return (
            <li key={r.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-serif text-[15.5px] text-ink">Elian</span>
              <span className="font-serif text-[13.5px] italic text-ink-faint">
                {vorwaerts ? def.label : def.inverse}
              </span>
              <span
                aria-hidden
                className="h-px min-w-[1rem] flex-1 translate-y-[-4px] border-b border-dotted border-paper-400/70"
              />
              <span className="font-serif text-[15.5px] text-ink">{nameVon(anderer)}</span>
            </li>
          );
        })}
      </ul>

      <p className="mt-9 max-w-[42ch] font-serif text-[14px] italic leading-relaxed text-ink-faint">
        Dragoncore sammelt nicht nur Einträge. Es verbindet sie.
      </p>
    </>
  );
}

/* --------------------------------------------------------------- Seite 3 */

/**
 * Zeit – und zwar die echte.
 *
 * Der Regler benutzt dieselbe Weltzeit-Logik wie das ganze Buch: `datiere`,
 * `weltzustand`. Keine zweite Zeitrechnung, keine nachgestellte Bewegung. Was
 * hier geschieht, geschieht später mit den eigenen Seiten genauso.
 */
function Zeit() {
  const datierte = useMemo(() => datiere(DEMO_EINTRAEGE), []);
  const [jahr, setJahr] = useState(1041);

  const bestand = useMemo(() => {
    const z = weltzustand(datierte, DEMO_KANTEN, ordnung(leseZeit(String(jahr))!));
    return new Set(z.bestand.map((d) => d.entry.id));
  }, [datierte, jahr]);

  return (
    <>
      <Ueberschrift>Und jede Welt hat eine Geschichte.</Ueberschrift>
      <span aria-hidden className="rule-gild mt-6 block w-24 opacity-70" />

      <ul className="mt-7 space-y-2.5">
        {DEMO_ZEITPUNKTE.map((z) => (
          <li key={`${z.jahr}-${z.was}`} className="flex items-baseline gap-3">
            <span
              className={cx(
                'shrink-0 font-serif text-[14px] tabular-nums transition-colors',
                z.jahr <= jahr ? 'text-gild-600' : 'text-ink-faint/45',
              )}
            >
              {z.jahr}
            </span>
            <span
              className={cx(
                'font-serif text-[15.5px] leading-snug transition-colors',
                z.jahr <= jahr ? 'text-ink' : 'text-ink-faint/45',
              )}
            >
              {z.was}
            </span>
          </li>
        ))}
      </ul>

      <label className="mt-8 block">
        <span className="rubric mb-1.5 block">Die Welt im Jahr {schreibeJahr(jahr)}</span>
        <input
          type="range"
          min={1000}
          max={1060}
          value={jahr}
          onChange={(e) => setJahr(Number(e.target.value))}
          aria-label="Jahr wählen"
          className="h-11 w-full cursor-pointer touch-none accent-gild-500"
        />
      </label>

      <p className="mt-2 font-serif text-[14px] leading-relaxed text-ink-muted">
        {bestand.has('demo_arven')
          ? 'Arven steht noch.'
          : jahr < 1041
            ? 'Arven steht noch.'
            : 'Arven ist gefallen. Nordhain gibt es ' +
              (bestand.has('demo_nordhain') ? 'bereits.' : 'noch nicht.')}
      </p>
    </>
  );
}

/* --------------------------------------------------------------- Seite 4 */

function Folgen() {
  return (
    <>
      <Ueberschrift>Geschichte hinterlässt Spuren.</Ueberschrift>
      <span aria-hidden className="rule-gild mt-6 block w-24 opacity-70" />

      <ol className="mt-8 space-y-1">
        {[
          { jahr: '1041', was: 'Der Fall von Arven' },
          { jahr: '1041', was: 'Die Flucht dreier Familien' },
          { jahr: '1044', was: 'Nordhain wird gegründet' },
        ].map((s, i) => (
          <li key={s.was}>
            {i > 0 && (
              <p className="ml-[3.4rem] py-1 font-serif text-[13px] italic text-ink-faint">
                führte zu
              </p>
            )}
            <p className="flex items-baseline gap-3">
              <span className="w-[3rem] shrink-0 font-serif text-[13.5px] tabular-nums text-ink-faint">
                {s.jahr}
              </span>
              <span className="font-serif text-[16.5px] text-ink">{s.was}</span>
            </p>
          </li>
        ))}
      </ol>

      <p className="prose-book mt-9 max-w-[42ch]">
        Ein Ereignis kann Jahrzehnte später noch Teil deiner Welt sein.
      </p>
    </>
  );
}

/* --------------------------------------------------------------- Seite 5 */

/**
 * Die Seite des gewaehlten Weges.
 *
 * Sie zeigt dieselbe Welt aus einem anderen Blickwinkel – nichts davon ist
 * eine eigene Betriebsart. Und wo etwas erst kommen *koennte*, steht das
 * ausdruecklich dabei: Nichts wird als verfuegbar dargestellt, was es nicht
 * ist.
 */
function WegSeite({ weg }: SeitenProps) {
  const gewaehlt = wegById(weg);

  const inhalt: Record<string, { titel: string; zeilen: string[]; ausblick?: string }> = {
    erzaehler: {
      titel: 'Was eine Figur sagt – und was sie tut.',
      zeilen: [
        'Elian sagt, Familie sei ihm das Wichtigste.',
        'Bei drei Entscheidungen wählt er die Pflicht.',
      ],
      ausblick:
        'Solche Spannungen sichtbar zu machen, ist das, wohin Dragoncore wächst – der Spiegel im Anhang zeigt heute wiederkehrende Muster, noch nicht die Widersprüche einzelner Figuren.',
    },
    weltenbauer: {
      titel: 'Ein Ort ist ein Geflecht.',
      zeilen: [
        'Mooshalde liegt am Nebelwald.',
        'Mooshalde beherbergt Elian und Mara.',
        'Mooshalde besteht seit 874 – und verändert sich über seine Geschichte.',
      ],
    },
    spielleiter: {
      titel: 'Alles zu einem Ort, an einer Stelle.',
      zeilen: [
        'Mooshalde · zwei Figuren, die dort leben',
        'Ein Artefakt, dessen Herkunft niemand kennt',
        'Ein Ereignis, das noch nachwirkt: der Fall von Arven',
      ],
    },
    traumweber: {
      titel: 'Es muss nicht ordentlich anfangen.',
      zeilen: [
        'Ein Ort. Ein Schlüssel. Eine Frau, die schweigt.',
        'Die Verbindungen entstehen später – oder gar nicht.',
      ],
    },
    chronist: {
      titel: 'Nichts geht verloren.',
      zeilen: [
        'Arven: 702 bis 1041.',
        'Mara ist Elians Mutter – die Linie bleibt nachvollziehbar.',
        'Jeder Zeitpunkt lässt sich betrachten, als stünde man darin.',
      ],
    },
  };

  const w = inhalt[weg] ?? inhalt.traumweber;

  return (
    <>
      {gewaehlt && <p className="rubric mb-2">Dein Weg · {gewaehlt.name}</p>}
      <Ueberschrift>{w.titel}</Ueberschrift>
      <span aria-hidden className="rule-gild mt-6 block w-24 opacity-70" />

      <ul className="mt-7 space-y-2.5">
        {w.zeilen.map((z) => (
          <li key={z} className="flex gap-3">
            <span
              aria-hidden
              className="mt-[11px] h-[3px] w-[3px] shrink-0 rotate-45 bg-gild-500/70"
            />
            <p className="font-serif text-[16px] leading-relaxed text-ink">{z}</p>
          </li>
        ))}
      </ul>

      {w.ausblick && (
        <div className="mt-9 border-t border-paper-300/60 pt-5">
          <p className="rubric mb-1.5">Noch nicht, aber bald</p>
          <p className="max-w-[46ch] font-serif text-[14px] italic leading-relaxed text-ink-faint">
            {w.ausblick}
          </p>
        </div>
      )}
    </>
  );
}

/* --------------------------------------------------------------- Seite 6 */

function Uebergabe({ onFertig }: SeitenProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-serif text-[19px] leading-relaxed text-ink-muted">
        Das könnte dein Weg sein.
      </p>

      <p className="mt-14 font-serif text-[16px] italic text-ink-faint">
        Lust, deine eigene Welt zu entdecken?
      </p>

      <button
        type="button"
        onClick={onFertig}
        className="mt-7 inline-flex min-h-[48px] items-center rounded-full border border-gild-500/45 px-8 font-serif text-[16px] text-gild-600 transition-colors hover:bg-gild-400/10 no-tap-highlight"
      >
        Meine Welt beginnen
      </button>
    </div>
  );
}
