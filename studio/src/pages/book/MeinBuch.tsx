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
import {
  ABSICHTEN,
  ANMUTUNGEN,
  TIEFEN,
  profilAus,
  profilVon,
  type Profil,
} from '../../lib/profil';
import type { BookIdentity } from '../../types';
import { cx } from '../../lib/utils';

const T = BUCH_TEXTE.meinBuch;
const TE = BUCH_TEXTE.geburt.einband;
const TT = BUCH_TEXTE.geburt.titel;

export function MeinBuchSheet() {
  const book = useStudio((s) => s.settings.book);
  const saveBook = useStudio((s) => s.saveBook);
  const profil = profilVon(useStudio((s) => s.settings));
  const updateSettings = useStudio((s) => s.updateSettings);
  const setzeProfil = (p: Profil) => updateSettings({ profil: p });

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
              /*
                16px, nicht 14. Safari auf dem iPhone zoomt beim Antippen jedes
                Feldes, dessen Schrift kleiner ist – die Seite springt, und
                herauszoomen muss man von Hand. Am Schreibtisch darf es wieder
                kleiner sein, dort gibt es das Problem nicht.
              */
              className="mt-4 min-h-[38px] w-full max-w-sm border-0 border-b border-paper-400/30 bg-transparent pb-1.5 font-serif text-[16px] italic text-ink-muted outline-none transition-colors placeholder:text-ink-faint/25 focus:border-gild-500/50 sm:text-[14px]"
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
           * Was hier entsteht – und wie viel davon offenliegt.
           *
           * Der alte Abschnitt hiess „Dein Weg" und war ehrlich beschriftet:
           * „Er schaltet nichts frei und nichts ab." Er tat auch sonst nichts.
           * Fuenf Namen, einmal gefragt, danach wirkungslos.
           *
           * Jetzt steht hier dieselbe Frage und sie wirkt – aber sie bleibt
           * eine Frage der Ansprache und keine Einrichtung: Was hier steht,
           * ordnet, was zuerst offenliegt. Es nimmt nichts weg. Deshalb steht
           * unter der Tiefe auch, was das bedeutet, und nicht, wie viele
           * Funktionen es „freischaltet".
           */}
          <Abschnitt titel="Was hier entsteht">
            <div className="grid gap-2 sm:grid-cols-2">
              {ABSICHTEN.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setzeProfil(profilAus(a.id, profil))}
                  aria-pressed={profil.absicht === a.id}
                  className={cx(
                    'rounded-sm border px-3.5 py-2.5 text-left transition-colors no-tap-highlight',
                    profil.absicht === a.id
                      ? 'border-gild-600/60 bg-gild-600/10'
                      : 'border-paper-400/30 hover:border-paper-400/60',
                  )}
                >
                  <span className="block font-serif text-[14.5px] text-ink">{a.name}</span>
                  <span className="mt-0.5 block font-serif text-[12.5px] italic leading-snug text-ink-faint">
                    {a.zeile}
                  </span>
                </button>
              ))}
            </div>
          </Abschnitt>

          <Abschnitt titel="Wie viel offenliegt">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {TIEFEN.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setzeProfil({ ...profil, tiefe: t.id })}
                  aria-pressed={profil.tiefe === t.id}
                  className={cx(
                    'min-h-[40px] font-serif text-[14.5px] transition-colors no-tap-highlight',
                    profil.tiefe === t.id ? 'text-gild-600' : 'text-ink-faint hover:text-ink-muted',
                  )}
                >
                  {t.name}
                  <span
                    aria-hidden
                    className={cx(
                      'mx-auto mt-0.5 block h-px transition-all duration-300',
                      profil.tiefe === t.id ? 'w-full bg-gild-500/60' : 'w-0',
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="mt-3 max-w-[46ch] font-serif text-[13.5px] italic leading-relaxed text-ink-muted">
              {TIEFEN.find((t) => t.id === profil.tiefe)?.satz} Nichts davon verschwindet – was
              nicht offenliegt, steht hinten im Buch unter „Weiteres".
            </p>
          </Abschnitt>

          {/*
           * Die Anmutung.
           *
           * Sie aendert Satz und Bildgroesse, sonst nichts – kein Inhalt wird
           * anders, keine Funktion faellt weg. Deshalb steht sie hier bei den
           * Einbandfragen und nicht bei der Absicht: Es ist eine Frage der
           * Ausgabe, nicht des Vorhabens. Dasselbe Buch, anders gesetzt.
           */}
          <Abschnitt titel="Wie es gesetzt ist">
            <div className="grid gap-2 sm:grid-cols-3">
              {ANMUTUNGEN.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setzeProfil({ ...profil, anmutung: a.id })}
                  aria-pressed={profil.anmutung === a.id}
                  className={cx(
                    'rounded-sm border px-3.5 py-2.5 text-left transition-colors no-tap-highlight',
                    profil.anmutung === a.id
                      ? 'border-gild-600/60 bg-gild-600/10'
                      : 'border-paper-400/30 hover:border-paper-400/60',
                  )}
                >
                  <span className="block font-serif text-[14.5px] text-ink">{a.name}</span>
                  <span className="mt-0.5 block font-serif text-[12.5px] italic leading-snug text-ink-faint">
                    {a.satz}
                  </span>
                </button>
              ))}
            </div>
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
