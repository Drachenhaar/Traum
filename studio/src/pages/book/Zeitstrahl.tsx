/**
 * Der Zeitstrahl.
 *
 * Nicht die Chronik im Anhang – die zeigt, wann *du* etwas geaendert hast.
 * Hier steht, wann etwas *in der Welt* geschah.
 *
 * Drei Dinge auf einer Seite, und sie gehoeren zusammen: die Achse mit allem,
 * was eine Zeit traegt; ein Lesezeichen, das man durch die Jahrhunderte
 * schiebt und das sagt, was zu diesem Augenblick bestand; und was der Chronik
 * dabei auffaellt.
 *
 * Was auffaellt, ist immer eine Frage und nie eine Korrektur. Es wird hier
 * nichts geaendert.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CircleHelp, Minus } from 'lucide-react';
import type { Entry } from '../../types';
import { useStudio } from '../../store/useStudio';
import { DEFAULT_KALENDER, ausOrdnung, schreibeJahr } from '../../lib/chronik/zeit';
import { datiere, weltzustand } from '../../lib/chronik/zustand';
import { pruefe, type Befund } from '../../lib/chronik/pruefung';
import { EBENEN, ebeneById } from '../../lib/chronik/ebenen';
import { Zeitachse, verteileSpuren } from '../../components/chronik/Zeitachse';
import { epocheBei, epochen } from '../../lib/welt/epochen';
import { weltsicht } from '../../lib/welt/abfrage';
import { jahrLaenge, ordnung } from '../../lib/chronik/zeit';
import { templateFor } from '../../lib/templates';
import { AppendixSheet } from './Appendix';
import { cx } from '../../lib/utils';

export function ZeitstrahlSheet() {
  const entries = useStudio((s) => s.entries);
  const relations = useStudio((s) => s.relations);
  const navigate = useNavigate();

  const kalender = DEFAULT_KALENDER;
  const [ebeneId, setEbeneId] = useState('welt');
  const ebene = ebeneById(ebeneId);

  /* Einmal lesen, dann oft gebraucht. */
  const alleDatiert = useMemo(() => datiere(entries, kalender), [entries, kalender]);

  const gefiltert = useMemo(
    () => alleDatiert.filter((d) => ebene.gilt(d.entry)),
    [alleDatiert, ebene],
  );

  /*
   * Die Pruefung laeuft immer ueber die *ganze* Welt, nicht ueber die
   * gewaehlte Ebene. Ein Widerspruch verschwindet nicht dadurch, dass man
   * gerade auf die Religion schaut.
   */
  const befunde = useMemo(
    () => pruefe(alleDatiert, relations, kalender),
    [alleDatiert, relations, kalender],
  );

  const hervor = useMemo(() => {
    const s = new Set<string>();
    for (const b of befunde) if (b.art === 'widerspruch') b.betrifft.forEach((id) => s.add(id));
    return s;
  }, [befunde]);

  /* Ein Punkt gilt als Zeitpunkt, wenn er kuerzer als ein Jahr ist. */
  const balken = useMemo(
    () => verteileSpuren(gefiltert, jahrLaenge(kalender)),
    [gefiltert, kalender],
  );

  /*
   * Ein Jahr aus der Adresse.
   *
   * Die Suche fuehrt hierher: Wer „1044" eintippt, meint die Welt in diesem
   * Jahr und nicht eine Seite mit der Zahl im Titel. Ohne diese Zeilen waere
   * der Weg dorthin: Zeitstrahl oeffnen, Regler suchen, Jahr treffen.
   */
  const [suchParams] = useSearchParams();
  const jahrAusAdresse = suchParams.get('jahr');
  const [marke, setMarke] = useState<number | null>(null);
  useEffect(() => {
    const j = Number(jahrAusAdresse);
    if (jahrAusAdresse !== null && Number.isFinite(j)) {
      setMarke(ordnung({ jahr: j, roh: String(j), genauigkeit: 'jahr' }, kalender));
    }
  }, [jahrAusAdresse, kalender]);
  const markeWert = useMemo(() => {
    if (marke !== null) return marke;
    /* Zu Beginn steht das Lesezeichen am spaetesten datierten Ereignis. */
    let letzte = -Infinity;
    for (const b of balken) letzte = Math.max(letzte, b.bis);
    return Number.isFinite(letzte) ? letzte : 0;
  }, [marke, balken]);

  const zustand = useMemo(
    () => weltzustand(alleDatiert, relations, markeWert),
    [alleDatiert, relations, markeWert],
  );

  const jahr = ausOrdnung(markeWert, kalender).jahr;

  /* In welchem Zeitalter steht die Marke gerade? Ohne Epochen: in keinem. */
  const zeitalter = useMemo(
    () => epochen(weltsicht(entries, relations, [], kalender)),
    [entries, relations, kalender],
  );
  const jetzigesZeitalter = epocheBei(zeitalter, markeWert);
  const mitZeit = alleDatiert.filter((d) => d.datiert).length;
  /*
   * Seiten, auf denen etwas steht, das sich nicht lesen laesst.
   *
   * Der Unterschied ist nicht spitzfindig: „Noch traegt keine Seite eine Zeit"
   * ist falsch, wenn jemand „irgendwann im Nebel" eingetragen hat. Er hat eine
   * Zeit eingetragen – nur keine, die das Buch versteht. Sagte es ihm das
   * nicht, suchte er den Fehler ewig an der falschen Stelle.
   */
  const unlesbar = alleDatiert.filter(
    (d) => !d.datiert && ((d.entry.beginn?.trim() ?? '') || (d.entry.ende?.trim() ?? '')),
  );

  return (
    <AppendixSheet title="Zeitstrahl" rubric="Anhang · Die Welt in der Zeit">
      {mitZeit === 0 ? (
        <Leer unlesbar={unlesbar.map((d) => d.entry)} />
      ) : (
        <>
          {/* ------------------------------------------------------ Ebenen */}
          <div className="mb-6 flex flex-wrap gap-x-5 gap-y-2">
            {EBENEN.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setEbeneId(e.id)}
                aria-pressed={ebeneId === e.id}
                className={cx(
                  'min-h-[38px] font-serif text-[14.5px] transition-colors no-tap-highlight',
                  ebeneId === e.id ? 'text-gild-600' : 'text-ink-faint hover:text-ink-muted',
                )}
              >
                {e.label}
                <span
                  aria-hidden
                  className={cx(
                    'mx-auto mt-0.5 block h-px transition-all duration-300',
                    ebeneId === e.id ? 'w-full' : 'w-0',
                  )}
                  style={{ background: ebeneId === e.id ? e.farbe : 'transparent' }}
                />
              </button>
            ))}
          </div>

          <p className="mb-5 font-serif text-[13.5px] italic text-ink-faint">
            {ebene.note} {balken.length === 0 && '– hier trägt noch nichts eine Zeit.'}
          </p>

          {/* ------------------------------------------------------- Achse */}
          <div className="paper-sheet rounded-[2px] px-3 py-3 shadow-[0_2px_16px_-12px_rgba(60,44,26,0.6)]">
            <Zeitachse
              balken={balken}
              kalender={kalender}
              marke={markeWert}
              onMarke={setMarke}
              onWaehlen={(id) => navigate(`/eintrag/${id}`)}
              hervor={hervor}
            />
          </div>

          <p className="mt-2 font-serif text-[12px] italic text-ink-faint/70">
            Ziehen zum Verschieben, zwei Finger oder Mausrad zum Zoomen.
          </p>

          {/* ------------------------------------------------- Weltzustand */}
          <section className="mt-9 border-t border-paper-300/60 pt-6">
            <p className="rubric mb-1">
              {/*
                Steht ein Zeitalter dahinter, gehoert sein Name hierher – „Die
                Welt in der Ära der Nebelkönige" sagt einem Verfasser mehr als
                „im Jahr 487". Die Jahreszahl bleibt daneben stehen: Sie ist
                genauer, nur eben nicht sprechender.
              */}
              {jetzigesZeitalter
                ? `Die Welt · ${jetzigesZeitalter.entry.title}`
                : `Die Welt im Jahr ${schreibeJahr(jahr, kalender)}`}
            </p>
            <p className="mb-4 font-serif text-[13.5px] italic leading-relaxed text-ink-faint">
              {jetzigesZeitalter && `Jahr ${schreibeJahr(jahr, kalender)}. `}
              Was zu diesem Augenblick bestand. Später Entstandenes bleibt außen vor.
            </p>

            <div className="flex flex-wrap gap-x-8 gap-y-1.5">
              <Zahl n={zustand.bestand.length} was="bestand" />
              <Zahl n={zustand.nochNicht.length} was="noch nicht" />
              <Zahl n={zustand.vergangen.length} was="schon vergangen" />
              {zustand.zeitlos.length > 0 && (
                <Zahl n={zustand.zeitlos.length} was="ohne Zeit" leise />
              )}
              {zustand.unlesbar.length > 0 && (
                <Zahl n={zustand.unlesbar.length} was="nicht lesbar" leise />
              )}
            </div>

            {zustand.bestand.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5">
                {zustand.bestand.slice(0, 40).map((d) => (
                  <li key={d.entry.id}>
                    <Link
                      to={`/eintrag/${d.entry.id}`}
                      className="font-serif text-[14px] text-ink transition-colors hover:text-gild-600 no-tap-highlight"
                    >
                      {d.entry.title}
                      <span className="ml-1 text-[11.5px] text-ink-faint/70">
                        {templateFor(d.entry.type).label}
                      </span>
                    </Link>
                  </li>
                ))}
                {zustand.bestand.length > 40 && (
                  <li className="font-serif text-[13px] italic text-ink-faint">
                    … und {zustand.bestand.length - 40} weitere
                  </li>
                )}
              </ul>
            )}
          </section>

          {/* ----------------------------------------------------- Befunde */}
          {befunde.length > 0 && (
            <section className="mt-9 border-t border-paper-300/60 pt-6">
              <p className="rubric mb-1">Was der Chronik auffällt</p>
              <p className="mb-4 max-w-[54ch] font-serif text-[13.5px] italic leading-relaxed text-ink-faint">
                Nichts davon wird geändert. Es sind Fragen an dich – das Buch weiß nicht, was
                stimmt, es sieht nur, dass zwei Angaben einander widersprechen.
              </p>
              <ul className="space-y-3">
                {befunde.map((b) => (
                  <BefundZeile key={b.id} befund={b} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </AppendixSheet>
  );
}

function Zahl({ n, was, leise }: { n: number; was: string; leise?: boolean }) {
  return (
    <span className={cx('font-serif text-[14px]', leise ? 'text-ink-faint/70' : 'text-ink-muted')}>
      <span className="tabular-nums text-ink">{n}</span> {was}
    </span>
  );
}

const ZEICHEN = {
  widerspruch: AlertTriangle,
  frage: CircleHelp,
  luecke: Minus,
} as const;

function BefundZeile({ befund }: { befund: Befund }) {
  const entries = useStudio((s) => s.entries);
  const Icon = ZEICHEN[befund.art];
  const ziel = befund.betrifft[0];
  const gibtEs = entries.some((e) => e.id === ziel);

  return (
    <li className="flex gap-2.5">
      <Icon
        size={14}
        strokeWidth={1.7}
        className={cx(
          'mt-[3px] shrink-0',
          befund.art === 'widerspruch' ? 'text-[#8C3A32]' : 'text-ink-faint/60',
        )}
      />
      <p className="font-serif text-[14px] leading-relaxed text-ink-muted">
        {befund.text}{' '}
        {gibtEs && (
          <Link
            to={`/eintrag/${ziel}`}
            className="whitespace-nowrap text-[13px] italic text-gild-600 no-tap-highlight"
          >
            ansehen
          </Link>
        )}
      </p>
    </li>
  );
}

function Leer({ unlesbar }: { unlesbar: Entry[] }) {
  return (
    <div className="max-w-[52ch]">
      <p className="prose-book">
        Noch trägt keine Seite eine Zeit. Der Zeitstrahl bleibt leer, bis die erste es tut.
      </p>

      {/*
        Wenn doch etwas dasteht, es sich nur nicht lesen liess: Das gehört
        hierher und nicht ins Schweigen. Sonst sucht der Verfasser den Fehler
        beim Zeitstrahl, während er in seiner Schreibweise liegt.
      */}
      {unlesbar.length > 0 && (
        <p className="prose-book mt-4">
          {unlesbar.length === 1 ? 'Eine Seite trägt' : `${unlesbar.length} Seiten tragen`} eine
          Angabe, die sich nicht deuten ließ –{' '}
          {unlesbar.slice(0, 3).map((e, i) => (
            <span key={e.id}>
              {i > 0 && ', '}
              <Link to={`/eintrag/${e.id}`} className="text-gild-600 underline decoration-gild-500/40">
                {e.title}
              </Link>
            </span>
          ))}
          {unlesbar.length > 3 && ` und ${unlesbar.length - 3} weitere`}.
        </p>
      )}
      <p className="prose-book mt-4">
        Jede Seite hat zwei Felder dafür: <em>Beginn</em> und <em>Ende</em>. Beide dürfen fehlen.
        Ein Ort ohne Ende besteht bis heute, eine Figur ohne Anfang war immer schon da – das ist
        eine Aussage, kein fehlender Wert.
      </p>
      <p className="prose-book mt-4">
        Als Jahr genügt <em>1032</em>. Genauer geht auch: <em>1032-04</em> oder{' '}
        <em>12.4.1032</em>.
      </p>
    </div>
  );
}
