/**
 * Mein Buch – Einband und Zeichen später ändern.
 *
 * Dieselben Szenen wie bei der Erschaffung, nur ohne Zeremonie: Hier wird
 * nicht etwas geboren, hier wird etwas nachgebessert. Deshalb stehen alle
 * drei Fragen untereinander statt nacheinander, und jede Änderung ist sofort
 * geschrieben – es gibt nichts zu vollenden.
 *
 * Bewusst dieselben Komponenten wie in `pages/geburt/`. Ein zweiter Satz
 * Einbandproben wäre ein zweiter Ort, an dem ein neues Material vergessen
 * werden kann.
 *
 * Geschriebene Seiten sind hiervon unberührt: Es wird ausschliesslich die
 * Buchidentität geschrieben, kein Eintrag angefasst.
 */

import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useStudio } from '../../store/useStudio';
import { BUCH_TEXTE } from '../../lib/bookTexts';
import { COVER_COLORS, COVER_MATERIALS } from '../../lib/bookIdentity';
import { coverSurface, ClosedBook } from '../../components/book/CoverBoard';
import { AppendixSheet } from './Appendix';
import { Zeichenwahl } from '../geburt/Zeichenwahl';
import type { BookIdentity } from '../../types';
import { cx } from '../../lib/utils';

const T = BUCH_TEXTE.meinBuch;
const TE = BUCH_TEXTE.geburt.einband;
const TT = BUCH_TEXTE.geburt.titel;

export function MeinBuchSheet() {
  const book = useStudio((s) => s.settings.book);
  const saveBook = useStudio((s) => s.saveBook);

  if (!book) return null;

  const aendern = (patch: Partial<BookIdentity>) => saveBook(patch);

  return (
    <AppendixSheet title={T.titel} rubric={T.rubrik}>
      <p className="mb-8 max-w-[52ch] font-serif text-[14px] italic leading-relaxed text-ink-muted">
        {T.hinweis}
      </p>

      <div className="grid gap-10 lg:grid-cols-[auto,1fr] lg:items-start">
        {/* Das Buch bleibt die Vorschau – auch hier. */}
        <div className="mx-auto shrink-0 lg:mx-0">
          <ClosedBook identity={book} width={186} height={254} />
        </div>

        <div>
          {/* ----------------------------------------------------- Titel */}
          <Abschnitt titel="Titel">
            <input
              value={book.title}
              onChange={(e) => aendern({ title: e.target.value })}
              placeholder={TT.platzhalter}
              aria-label="Titel"
              className="w-full max-w-sm border-0 border-b border-paper-400/50 bg-transparent pb-1.5 font-serif text-[19px] text-ink outline-none transition-colors placeholder:text-ink-faint/30 focus:border-gild-500/60"
            />
            <input
              value={book.subtitle ?? ''}
              onChange={(e) => aendern({ subtitle: e.target.value })}
              placeholder={TT.untertitelPlatzhalter}
              aria-label="Untertitel"
              className="mt-4 w-full max-w-sm border-0 border-b border-paper-400/30 bg-transparent pb-1.5 font-serif text-[14px] italic text-ink-muted outline-none transition-colors placeholder:text-ink-faint/25 focus:border-gild-500/50"
            />
          </Abschnitt>

          {/* ---------------------------------------------------- Einband */}
          <Abschnitt titel={TE.material}>
            <Proben
              werte={COVER_MATERIALS.map((m) => ({
                id: m.id,
                label: m.label,
                style: coverSurface({ coverMaterial: m.id, coverColor: book.coverColor }),
              }))}
              gewaehlt={book.coverMaterial}
              onWaehlen={(id) => aendern({ coverMaterial: id })}
            />
          </Abschnitt>

          <Abschnitt titel={TE.farbe}>
            <Proben
              werte={COVER_COLORS.map((c) => ({
                id: c.id,
                label: c.label,
                style: coverSurface({ coverMaterial: book.coverMaterial, coverColor: c.id }),
              }))}
              gewaehlt={book.coverColor}
              onWaehlen={(id) => aendern({ coverColor: id })}
            />
          </Abschnitt>

          {/* ---------------------------------------------------- Zeichen */}
          <Abschnitt titel="Zeichen">
            {/*
             * Dieselbe Wahl wie bei der Erschaffung – nur ohne Frage und ohne
             * Weg weiter: Hier ist alles bereits geschrieben, es gibt nichts
             * zu vollenden. Der Ton wechselt von Tisch auf Papier.
             */}
            <Zeichenwahl identity={book} onChange={aendern} nurWahl ton="papier" />
          </Abschnitt>

          {/*
           * Der Weg zurück in die Szenen.
           *
           * Steht bewusst ganz unten und ganz leise: Wer nur die Farbe wechseln
           * will, ist oben längst fertig. Wer den Vorgang noch einmal erleben
           * will, findet ihn hier.
           */}
          <section className="border-t border-paper-300/60 pt-5">
            <Link
              to="/neu-binden"
              className="inline-flex min-h-[44px] items-center gap-2 font-serif text-[15px] italic text-gild-600 transition-colors hover:text-gild-500 no-tap-highlight"
            >
              <Sparkles size={15} strokeWidth={1.6} /> {T.neuBinden}
            </Link>
            <p className="mt-1.5 max-w-[46ch] font-serif text-[13px] italic leading-relaxed text-ink-faint">
              {T.neuBindenNote}
            </p>
          </section>
        </div>
      </div>
    </AppendixSheet>
  );
}

function Abschnitt({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 border-t border-paper-300/60 pt-5 first:border-0 first:pt-0">
      <p className="rubric mb-3">{titel}</p>
      {children}
    </section>
  );
}

function Proben({
  werte,
  gewaehlt,
  onWaehlen,
}: {
  werte: { id: string; label: string; style: React.CSSProperties }[];
  gewaehlt: string;
  onWaehlen: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {werte.map((w) => (
        <button
          key={w.id}
          type="button"
          onClick={() => onWaehlen(w.id)}
          aria-pressed={gewaehlt === w.id}
          className="flex shrink-0 flex-col items-center gap-1.5 no-tap-highlight"
        >
          <span
            className={cx(
              'block h-[64px] w-[48px] rounded-[3px] transition-all duration-300',
              gewaehlt === w.id ? 'scale-[1.06]' : 'opacity-80',
            )}
            style={{
              ...w.style,
              boxShadow:
                gewaehlt === w.id
                  ? '0 0 0 1px rgba(184,134,11,0.85), 0 10px 18px -10px rgba(0,0,0,0.6)'
                  : '0 8px 14px -10px rgba(0,0,0,0.5)',
            }}
          />
          <span
            className={cx(
              'max-w-[66px] text-center font-serif text-[11px] leading-tight',
              gewaehlt === w.id ? 'text-gild-600' : 'text-ink-faint',
            )}
          >
            {w.label}
          </span>
        </button>
      ))}
    </div>
  );
}
