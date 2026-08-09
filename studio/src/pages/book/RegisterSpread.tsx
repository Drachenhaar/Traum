/**
 * Das Register und der Tafelteil.
 *
 * Register: alle Einträge alphabetisch, zweispaltig, mit Seitenzahl – so wie
 * man hinten in einem Sachbuch nachschlägt.
 *
 * Tafelteil: die Bilder in voller Größe. In Kunstbüchern steht er hinten und
 * hat keinen Fließtext; die Tafeln tragen sich selbst.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudio, livingEntries } from '../../store/useStudio';
import { useCurrentSpread } from '../../components/book/BookShell';
import { Spread } from '../../components/book/Spread';
import { AppendixSheet } from './Appendix';
import { templateFor } from '../../lib/templates';
import { chapterOfType } from '../../lib/book';
import { Thumb } from '../../components/images/Thumb';
import { Lightbox } from '../../components/images/Lightbox';

/** Einmal gebaut, tausendfach benutzt – siehe Kommentar bei der Sortierung. */
const SAMMLER = new Intl.Collator('de', { sensitivity: 'base', numeric: true });

export function RegisterSheet() {
  const entries = useStudio((s) => s.entries);
  const { book } = useCurrentSpread();
  const [query, setQuery] = useState('');

  const sorted = useMemo(() => {
    const living = livingEntries(entries);
    const needle = query.trim().toLowerCase();
    return living
      .filter((e) => !needle || e.title.toLowerCase().includes(needle))
      /*
       * Ein Collator statt `localeCompare` je Vergleich.
       *
       * `localeCompare` baut bei jedem Aufruf die Sortierregeln neu auf. Bei
       * zehntausend Eintraegen sind das ueber hunderttausend Vergleiche –
       * einmal aufgebaut ist dieselbe Sortierung um ein Vielfaches billiger.
       */
      .sort((a, b) => SAMMLER.compare(a.title, b.title));
  }, [entries, query]);

  /*
   * Zwei echte Spalten statt CSS-Mehrspaltensatz.
   *
   * `columns-2` mit `break-inside-avoid` sah richtig aus und war der Grund,
   * warum dieses Blatt bei zweitausend Eintraegen dreizehn Sekunden brauchte
   * und bei fuenftausend gar nicht mehr fertig wurde: Der Browser muss den
   * gesamten Spaltenfluss durchrechnen, und das waechst nicht linear.
   *
   * Von Hand geteilt kostet es nichts – und die Leserichtung bleibt dieselbe:
   * erst die linke Spalte hinunter, dann die rechte.
   */
  const haelfte = Math.ceil(sorted.length / 2);
  const spalten = [sorted.slice(0, haelfte), sorted.slice(haelfte)];

  return (
    <AppendixSheet title="Register" rubric="Anhang · Nachschlagen">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Im Register suchen …"
        className="mb-7 w-full border-0 border-b border-paper-400/60 bg-transparent px-0 py-2 font-serif text-[16px] text-ink outline-none placeholder:italic placeholder:text-ink-faint/70 focus:border-gild-500/60"
      />

      {sorted.length === 0 ? (
        <p className="font-serif text-[15px] italic text-ink-muted">
          {query ? 'Kein Eintrag mit diesem Namen.' : 'Das Register ist noch leer.'}
        </p>
      ) : (
        <div className="grid gap-x-12 sm:grid-cols-2">
          {spalten.map((spalte, i) => (
            <ol key={i}>
              {spalte.map((entry) => {
                const page = book.pageOfEntry.get(entry.id);
                const tpl = templateFor(entry.type);
                return (
                  /*
                    Auf dem Telefon ist das Register eine Liste zum Antippen,
                    am Schreibtisch eine gesetzte Spalte. Deshalb dort mehr
                    Luft je Zeile und hier wieder der enge Satz.
                  */
                  <li key={entry.id} className="group">
                    <Link
                      to={`/eintrag/${entry.id}`}
                      className="flex min-h-[38px] items-baseline gap-2 py-[7px] no-tap-highlight sm:min-h-0 sm:py-[1.5px]"
                    >
                      <span
                        aria-hidden
                        className="h-[5px] w-[5px] shrink-0 translate-y-[-3px] rounded-full"
                        style={{ background: tpl.accent }}
                      />
                      <span className="truncate font-serif text-[15px] text-ink transition-colors group-hover:text-gild-600">
                        {entry.title}
                      </span>
                      <span
                        aria-hidden
                        className="mx-1 min-w-[0.75rem] flex-1 translate-y-[-4px] border-b border-dotted border-paper-400/60"
                      />
                      <span className="shrink-0 font-serif text-[13px] tabular-nums text-ink-faint">
                        {page ?? '–'}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          ))}
        </div>
      )}
    </AppendixSheet>
  );
}

/* ---------------------------------------------------------------- Tafelteil */

export function PlatesSpread() {
  const images = useStudio((s) => s.images);
  const entries = useStudio((s) => s.entries);
  const { spread, wear } = useCurrentSpread();
  const [lightbox, setLightbox] = useState<number | null>(null);

  const sorted = useMemo(
    () => [...images].sort((a, b) => b.createdAt - a.createdAt),
    [images],
  );

  /* Zu welchem Eintrag gehört eine Tafel? Das ergibt die Bildunterschrift. */
  const ownerOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of livingEntries(entries)) {
      if (entry.coverImage) map.set(entry.coverImage, entry.title);
    }
    return map;
  }, [entries]);

  const left = sorted.slice(0, 4);
  const right = sorted.slice(4, 10);

  return (
    <>
      <Spread
        pageLeft={spread?.page ?? 6}
        wear={wear}
        left={
          <div className="py-4 lg:py-8">
            <p className="rubric">Tafelteil</p>
            <h1 className="mt-2 font-serif text-[32px] leading-tight text-ink sm:text-[38px]">
              Tafeln
            </h1>
            <span aria-hidden className="rule-gild mt-4 block w-24 opacity-70" />
            <p className="prose-book mt-5 max-w-[44ch]">
              {sorted.length} {sorted.length === 1 ? 'Blatt' : 'Blätter'} – Illustrationen,
              Konzeptzeichnungen und Referenzen. Alle liegen auf diesem Gerät.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3">
              {left.map((image, i) => (
                <PlateTile
                  key={image.id}
                  id={image.id}
                  caption={ownerOf.get(image.id) ?? image.title}
                  onOpen={() => setLightbox(i)}
                />
              ))}
            </div>
          </div>
        }
        right={
          <div className="py-4 lg:py-8">
            {right.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {right.map((image, i) => (
                  <PlateTile
                    key={image.id}
                    id={image.id}
                    caption={ownerOf.get(image.id) ?? image.title}
                    onOpen={() => setLightbox(i + 4)}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-10 font-serif text-[14px] italic text-ink-faint">
                Weitere Tafeln erscheinen hier, sobald mehr Bilder im Buch liegen.
              </p>
            )}

            {sorted.length > 10 && (
              <Link
                to="/tafelteil"
                className="mt-7 inline-block font-serif text-[14px] italic text-gild-600 underline decoration-gild-500/40"
              >
                Alle {sorted.length} Tafeln ansehen
              </Link>
            )}
          </div>
        }
      />

      {lightbox !== null && (
        <Lightbox
          ids={sorted.map((m) => m.id)}
          index={lightbox}
          onIndexChange={setLightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}

function PlateTile({
  id,
  caption,
  onOpen,
}: {
  id: string;
  caption: string;
  onOpen: () => void;
}) {
  return (
    <figure>
      <button
        type="button"
        onClick={onOpen}
        className="block w-full overflow-hidden rounded-[2px] shadow-[0_2px_12px_-6px_rgba(60,44,26,0.55)] transition-transform duration-500 ease-calm hover:scale-[1.015] no-tap-highlight"
      >
        <Thumb imageId={id} alt={caption} className="aspect-[4/5] w-full" rounded="rounded-none" />
      </button>
      <figcaption className="mt-1.5 truncate font-serif text-[12px] italic text-ink-muted">
        {caption}
      </figcaption>
    </figure>
  );
}

/** Alle Tafeln, wenn der Tafelteil im Buch nicht ausreicht. */
export function PlatesSheet() {
  const images = useStudio((s) => s.images);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const sorted = useMemo(() => [...images].sort((a, b) => b.createdAt - a.createdAt), [images]);

  return (
    <AppendixSheet title="Alle Tafeln" rubric="Anhang · Tafelteil">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {sorted.map((image, i) => (
          <PlateTile
            key={image.id}
            id={image.id}
            caption={image.title}
            onOpen={() => setLightbox(i)}
          />
        ))}
      </div>
      {sorted.length === 0 && (
        <p className="font-serif text-[15px] italic text-ink-muted">Noch keine Tafeln im Buch.</p>
      )}

      {lightbox !== null && (
        <Lightbox
          ids={sorted.map((m) => m.id)}
          index={lightbox}
          onIndexChange={setLightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </AppendixSheet>
  );
}

/** Für die Kapitelzuordnung im Register nutzbar – hält die Sortierung stabil. */
export function chapterLabelOf(type: string): string {
  return chapterOfType(type).title;
}
