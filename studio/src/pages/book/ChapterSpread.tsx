/**
 * Die Kapitelseite.
 *
 * Jedes Kapitel bekommt Luft, bevor der Inhalt beginnt: Titel, ein Satz zur
 * Haltung, eine große Tafel. Das ist der Moment, in dem ein Buch Atem holt –
 * und der Grund, warum man weiterblättert.
 *
 * Darunter steht, was das Kapitel enthält. Kein Raster aus Karten, sondern
 * eine gesetzte Liste mit Seitenzahlen.
 */

import { Link, useParams } from 'react-router-dom';
import { chapterById } from '../../lib/book';
import { templateFor } from '../../lib/templates';
import { useCurrentSpread } from '../../components/book/BookShell';
import { Spread, Plate } from '../../components/book/Spread';
import { useImageUrl } from '../../components/images/Thumb';
import { romanNumeral } from '../../lib/book';

export function ChapterSpread() {
  const { id } = useParams();
  const { book, spread, wear } = useCurrentSpread();
  const chapter = id ? chapterById(id) : undefined;
  const entry = book.chapters.find((c) => c.chapter.id === id);

  if (!chapter || !entry) {
    return (
      <Spread
        pageLeft={spread?.page ?? 6}
        left={
          <div className="pt-20 text-center">
            <h1 className="font-serif text-[30px] text-ink">Dieses Kapitel ist noch leer</h1>
            <Link to="/inhalt" className="mt-5 inline-block font-serif text-[15px] text-gild-600 underline">
              Zum Inhaltsverzeichnis
            </Link>
          </div>
        }
        right={null}
      />
    );
  }

  const number = book.chapters.findIndex((c) => c.chapter.id === chapter.id) + 1;
  /* Die Tafel des Kapitels: das erste Bild, das es gibt. */
  const showpiece = entry.entries.find((e) => e.coverImage);

  return (
    <Spread
      pageLeft={spread?.page ?? 6}
      wear={wear}
      left={
        <div className="flex h-full flex-col justify-center py-8 lg:py-16">
          <p className="rubric">Kapitel {romanNumeral(number)}</p>

          <h1 className="mt-3 font-serif text-[40px] leading-[1.04] text-ink sm:text-[52px]">
            {chapter.title}
          </h1>

          <span aria-hidden className="rule-gild mt-6 block w-32 opacity-75" />

          <p className="prose-book mt-6 max-w-[46ch]">{chapter.intro}</p>

          <p className="mt-8 font-serif text-[12.5px] tracking-[0.16em] text-ink-faint/70">
            {entry.entries.length} {entry.entries.length === 1 ? 'SEITE' : 'SEITEN'}
            {entry.complete && ' · VOLLSTÄNDIG'}
          </p>

          <Link
            to={`/setzerei?typ=${chapter.types[0]}`}
            className="mt-5 inline-flex items-center gap-1.5 font-serif text-[13.5px] italic text-ink-faint transition-colors hover:text-gild-600 no-tap-highlight"
          >
            Eine Seite zu diesem Kapitel
          </Link>
        </div>
      }
      right={
        <>
          {showpiece?.coverImage && (
            <div className="mb-7 h-[46%] min-h-[200px]">
              <ChapterPlate
                imageId={showpiece.coverImage}
                caption={showpiece.title}
                rubric={templateFor(showpiece.type).label}
              />
            </div>
          )}

          <p className="rubric mb-3">In diesem Kapitel</p>
          <ol>
            {entry.entries.map((item) => {
              const page = book.pageOfEntry.get(item.id);
              const tpl = templateFor(item.type);
              return (
                <li key={item.id} className="group">
                  <Link to={`/eintrag/${item.id}`} className="flex items-baseline gap-2 py-[6px] no-tap-highlight">
                    <span
                      aria-hidden
                      className="h-[5px] w-[5px] shrink-0 translate-y-[-3px] rounded-full"
                      style={{ background: tpl.accent }}
                    />
                    <span className="font-serif text-[15.5px] leading-snug text-ink transition-colors group-hover:text-gild-600">
                      {item.title}
                    </span>
                    <span
                      aria-hidden
                      className="mx-1 min-w-[1rem] flex-1 translate-y-[-4px] border-b border-dotted border-paper-400/60"
                    />
                    <span className="shrink-0 font-serif text-[13px] tabular-nums text-ink-faint">
                      {page}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </>
      }
    />
  );
}

function ChapterPlate({
  imageId,
  caption,
  rubric,
}: {
  imageId: string;
  caption: string;
  rubric: string;
}) {
  const url = useImageUrl(imageId, 'full');
  return (
    <Plate rubric={rubric} caption={caption}>
      {url ? (
        <img src={url} alt={caption} className="h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full" />
      )}
    </Plate>
  );
}
