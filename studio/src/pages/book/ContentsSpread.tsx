/**
 * Das Inhaltsverzeichnis.
 *
 * Es ersetzt die Seitenleiste vollständig. Die Seitenzahlen sind echt: sie
 * kommen aus dem gebauten Buchblock, nicht aus einer Tabelle. Wächst die Welt,
 * verschieben sie sich – so wie in einem Buch, das neu gesetzt wurde.
 */

import { Link } from 'react-router-dom';
import { useStudio } from '../../store/useStudio';
import { useCurrentSpread } from '../../components/book/BookShell';
import { Spread, Plate } from '../../components/book/Spread';
import { useImageUrl } from '../../components/images/Thumb';
import { TEXTURES } from '../../lib/textures';
import { cx } from '../../lib/utils';

export function ContentsSpread() {
  const { book, spread } = useCurrentSpread();
  const entries = useStudio((s) => s.entries);
  const settings = useStudio((s) => s.settings);

  /* Ein Bild aus der Welt trägt die rechte Seite – bevorzugt ein Favorit. */
  const showpiece =
    entries.find((e) => e.favorite && e.coverImage && !e.deletedAt) ??
    entries.find((e) => e.coverImage && !e.deletedAt);

  return (
    <Spread
      pageLeft={spread?.page ?? 8}
      left={
        <>
          <p className="rubric">{settings.worldName || 'Dragoncore'}</p>
          <h1 className="mt-2 font-serif text-[32px] leading-tight text-ink sm:text-[38px]">
            Inhaltsverzeichnis
          </h1>
          <span aria-hidden className="rule-gild mt-4 block w-full opacity-70" />

          <ol className="mt-6">
            <TocLine label="Vorwort" page={6} to="/vorwort" />

            {book.chapters.map(({ chapter, page, entries: items, complete }) => (
              <TocLine
                key={chapter.id}
                label={chapter.title}
                page={page}
                to={`/kapitel/${chapter.id}`}
                count={items.length}
                ribbon={complete ? '#D4AF37' : chapter.ribbon}
                complete={complete}
              />
            ))}

            <TocLine
              label="Anhänge"
              page={book.spreads[book.spreads.length - 1]?.page ?? 0}
              to="/anhang"
            />
          </ol>

          {book.chapters.length === 0 && (
            <p className="prose-book mt-8">
              Das Buch ist noch leer. Es beginnt mit einer einzigen Seite – alles Weitere wächst
              daran.
            </p>
          )}

          {/*
           * Kapitel, die es noch nicht gibt.
           *
           * Ohne diese Zeilen könnte niemand entdecken, dass es sie geben
           * könnte. Sie stehen ohne Seitenzahl und ohne Lesezeichen da – als
           * Einladung, nicht als Mangel.
           */}
          {book.emptyChapters.length > 0 && (
            <section className="mt-9 border-t border-paper-300/60 pt-5">
              <p className="rubric mb-2.5">Noch ungeschrieben</p>
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
                {book.emptyChapters.map((chapter) => (
                  <li key={chapter.id}>
                    <Link
                      to={`/kapitel/${chapter.id}`}
                      className="inline-flex min-h-[38px] items-center font-serif text-[15px] italic text-ink-faint transition-colors hover:text-gild-600 no-tap-highlight"
                    >
                      {chapter.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      }
      right={
        showpiece?.coverImage ? (
          <div className="h-full min-h-[320px]">
            <ShowpiecePlate
              imageId={showpiece.coverImage}
              caption={showpiece.title}
              rubric="Aus diesem Band"
            />
          </div>
        ) : (
          /*
           * Das Frontispiz – in echten Büchern die Tafel gegenüber dem Titel.
           * Sie steht hier, solange die Welt noch keine eigenen Bilder hat, und
           * weicht der ersten eigenen Tafel, sobald es eine gibt.
           */
          <div className="h-full min-h-[320px]">
            <Plate rubric="Frontispiz" caption={settings.worldTagline || 'Eine Welt, die wächst'}>
              <img src={TEXTURES.frontispiz} alt="" className="h-full w-full object-cover" />
            </Plate>
          </div>
        )
      }
    />
  );
}

function TocLine({
  label,
  page,
  to,
  count,
  ribbon,
  complete,
}: {
  label: string;
  page: number;
  to: string;
  count?: number;
  ribbon?: string;
  complete?: boolean;
}) {
  return (
    <li className="group">
      {/* Das Inhaltsverzeichnis ist auf dem Telefon die Hauptnavigation –
          jede Zeile muss ein Fingerziel sein, nicht nur eine Textzeile. */}
      <Link to={to} className="flex min-h-[40px] items-baseline gap-2 py-[9px] no-tap-highlight">
        {ribbon ? (
          <span
            aria-hidden
            className="h-[9px] w-[3px] shrink-0 translate-y-[-1px] rounded-[1px]"
            style={{
              background: ribbon,
              boxShadow: complete ? '0 0 5px rgba(212,175,55,0.7)' : 'none',
            }}
          />
        ) : (
          <span aria-hidden className="w-[3px] shrink-0" />
        )}

        <span
          className={cx(
            'font-serif text-[16.5px] leading-snug text-ink transition-colors group-hover:text-gild-600',
          )}
        >
          {label}
        </span>

        {count !== undefined && (
          <span className="shrink-0 font-serif text-[12px] text-ink-faint/60">{count}</span>
        )}

        {/* Punktlinie bis zur Seitenzahl – das Erkennungszeichen jedes Verzeichnisses */}
        <span
          aria-hidden
          className="mx-1 min-w-[1.5rem] flex-1 translate-y-[-4px] border-b border-dotted border-paper-400/70"
        />

        <span className="shrink-0 font-serif text-[14px] tabular-nums text-ink-muted">{page}</span>
      </Link>
    </li>
  );
}

function ShowpiecePlate({
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
        <div className="h-full min-h-[280px] w-full" />
      )}
    </Plate>
  );
}
