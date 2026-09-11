/**
 * „In diesem Kapitel" – und im Artbook auch: in welcher Reihenfolge.
 *
 * Ein Weltbuch wird nachgeschlagen, ein Artbook wird gelesen. Für das eine ist
 * die alphabetische Ordnung richtig, für das andere ist sie eine Zumutung:
 * Welches Bild nach welchem kommt, ist im gestalteten Buch die Arbeit selbst.
 * Deshalb steht das Umsortieren hier und nur hier.
 *
 * **Warum ein eigener Zustand und nicht immer Pfeile.**
 * Diese Liste ist zuerst ein Inhaltsverzeichnis; man tippt darauf, um zu
 * lesen. Zwei Pfeile neben jeder Zeile würden aus dem Verzeichnis ein
 * Bedienfeld machen, und zwar dauerhaft, für einen Handgriff, den man
 * vielleicht dreimal im Jahr braucht. Also: normalerweise Verweise, auf
 * Wunsch Pfeile. Der Weg zurück steht daneben.
 *
 * **Warum Pfeile und kein Ziehen.**
 * Gezogen wird mit einer Maus. Auf einem Telefon ist Ziehen in einer Liste,
 * die selbst scrollt, eine Wette – man trifft die Zeile, die Liste rollt weg,
 * und am Ende liegt das Bild irgendwo. Ein Pfeil trifft immer, und der
 * Gegenpfeil nimmt ihn zurück. Der Auftrag verlangt ausdrücklich, keine
 * Schreibtischoberfläche auf das Handy zu schrumpfen; das hier ist die
 * Stelle, an der das konkret wird.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronUp, ChevronDown, ArrowUpDown, Check } from 'lucide-react';
import type { Entry } from '../../types';
import { useStudio } from '../../store/useStudio';
import { buchartVon } from '../../lib/buchart';
import { verschiebe, setzeFolge, abweichend } from '../../lib/buch/seitenfolge';
import { templateFor } from '../../lib/templates';
import { cx } from '../../lib/utils';

export function Kapitelliste({
  kapitelId,
  eintraege,
  abgeleitet,
  seiteVon,
}: {
  kapitelId: string;
  /** In der Reihenfolge, in der sie im Buch stehen. */
  eintraege: Entry[];
  /** Dieselben in der Ordnung, die sich aus den Daten ergibt. */
  abgeleitet: Entry[];
  seiteVon: (id: string) => number | undefined;
}) {
  const artbook = useStudio((s) => buchartVon(s.settings.book) === 'artbook');
  const folge = useStudio((s) => s.settings.seitenfolge);
  const updateSettings = useStudio((s) => s.updateSettings);
  const [ordnen, setOrdnen] = useState(false);

  const eigene = folge?.[kapitelId];
  const gesetzt = abweichend(abgeleitet, eigene);

  /* Ein einzelnes Kapitel umzusortieren lohnt sich ab zwei Seiten. */
  const moeglich = artbook && eintraege.length > 1;

  const schiebe = (id: string, richtung: -1 | 1) => {
    const neu = verschiebe(
      eintraege.map((e) => e.id),
      id,
      richtung,
    );
    /*
     * Am Rand geschieht nichts – und zwar wirklich nichts. Kein Speichern,
     * kein neues Änderungsdatum. Ein Buch, das sich beim Antippen eines
     * wirkungslosen Pfeils als „bearbeitet" merkt, lügt über seine Arbeit.
     */
    if (!neu) return;
    updateSettings({ seitenfolge: setzeFolge(folge, kapitelId, neu) });
  };

  const zurueck = () => {
    updateSettings({ seitenfolge: setzeFolge(folge, kapitelId, undefined) });
    setOrdnen(false);
  };

  return (
    <>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="rubric">In diesem Kapitel</p>

        {moeglich && (
          <button
            type="button"
            onClick={() => setOrdnen((o) => !o)}
            className="flex shrink-0 items-center gap-1.5 font-serif text-[12.5px] italic text-ink-faint transition-colors hover:text-gold no-tap-highlight"
          >
            {ordnen ? (
              <>
                <Check size={13} strokeWidth={1.6} aria-hidden />
                Fertig
              </>
            ) : (
              <>
                <ArrowUpDown size={13} strokeWidth={1.6} aria-hidden />
                Reihenfolge
              </>
            )}
          </button>
        )}
      </div>

      <ol>
        {eintraege.map((item, i) => {
          const seite = seiteVon(item.id);
          const tpl = templateFor(item.type);

          const punkt = (
            <span
              aria-hidden
              className="h-[5px] w-[5px] shrink-0 translate-y-[-3px] rounded-full"
              style={{ background: tpl.accent }}
            />
          );

          /* ------------------------------------------- Der Ordnungszustand */
          if (ordnen) {
            return (
              <li key={item.id} className="flex items-center gap-2 py-[3px]">
                {punkt}
                <span className="min-w-0 flex-1 truncate font-serif text-[15.5px] leading-snug text-ink">
                  {item.title}
                </span>
                <Pfeil
                  richtung={-1}
                  aus={i === 0}
                  titel={`„${item.title}" nach vorn`}
                  onTap={() => schiebe(item.id, -1)}
                />
                <Pfeil
                  richtung={1}
                  aus={i === eintraege.length - 1}
                  titel={`„${item.title}" nach hinten`}
                  onTap={() => schiebe(item.id, 1)}
                />
              </li>
            );
          }

          /* ------------------------------------------------- Das Verzeichnis */
          return (
            <li key={item.id} className="group">
              <Link
                to={`/eintrag/${item.id}`}
                className="flex items-baseline gap-2 py-[6px] no-tap-highlight"
              >
                {punkt}
                <span className="font-serif text-[15.5px] leading-snug text-ink transition-colors group-hover:text-gold">
                  {item.title}
                </span>
                <span
                  aria-hidden
                  className="mx-1 min-w-[1rem] flex-1 translate-y-[-4px] border-b border-dotted border-lineStrong"
                />
                <span className="shrink-0 font-serif text-[13px] tabular-nums text-ink-faint">
                  {seite}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {/*
        Der Weg zurück – nur, wenn es etwas zurückzunehmen gibt.

        `abweichend` und nicht „es gibt eine Folge": Wer zweimal verschiebt und
        zweimal zurück, hat wieder die Buchordnung. Ein Angebot, das sichtbar
        nichts tut, glaubt einem beim zweiten Mal niemand mehr.
      */}
      {ordnen && gesetzt && (
        <button
          type="button"
          onClick={zurueck}
          className="mt-4 font-serif text-[13px] italic text-ink-faint underline decoration-dotted underline-offset-4 transition-colors hover:text-gold no-tap-highlight"
        >
          Zur Buchordnung zurück
        </button>
      )}
    </>
  );
}

/**
 * Ein Pfeil, der am Rand seiner Liste stumpf wird.
 *
 * `disabled` und nicht ausgeblendet: Ein Knopf, der beim ersten Eintrag
 * verschwindet, verschiebt alle anderen um seine Breite – und die Liste
 * zappelt beim Sortieren, also genau dann, wenn man sie ruhig braucht.
 */
function Pfeil({
  richtung,
  aus,
  titel,
  onTap,
}: {
  richtung: -1 | 1;
  aus: boolean;
  titel: string;
  onTap: () => void;
}) {
  const Zeichen = richtung === -1 ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      disabled={aus}
      onClick={onTap}
      title={titel}
      aria-label={titel}
      className={cx(
        'flex h-[34px] w-[30px] shrink-0 items-center justify-center rounded transition-colors no-tap-highlight',
        aus ? 'text-ink-faint/25' : 'text-ink-faint hover:bg-gild-400/10 hover:text-gold',
      )}
    >
      <Zeichen size={16} strokeWidth={1.7} aria-hidden />
    </button>
  );
}
