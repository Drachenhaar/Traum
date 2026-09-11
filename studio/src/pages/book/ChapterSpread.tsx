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
import { Kapitelliste } from '../../components/buch/Kapitelliste';
import { useCurrentSpread } from '../../components/book/BookShell';
import { Spread, Plate } from '../../components/book/Spread';
import { useImageUrl } from '../../components/images/Thumb';
import { romanNumeral } from '../../lib/book';

export function ChapterSpread() {
  const { id } = useParams();
  const { book, spread, wear } = useCurrentSpread();
  const chapter = id ? chapterById(id) : undefined;
  const entry = book.chapters.find((c) => c.chapter.id === id);

  if (!chapter) {
    return (
      <Spread
        pageLeft={spread?.page ?? 6}
        left={
          <div className="pt-20 text-center">
            <h1 className="font-serif text-[30px] text-ink">Dieses Kapitel gibt es nicht</h1>
            <Link to="/inhalt" className="mt-5 inline-block font-serif text-[15px] text-gold underline">
              Zum Inhaltsverzeichnis
            </Link>
          </div>
        }
        right={null}
      />
    );
  }

  /*
   * Ein Kapitel ohne Seiten ist kein Fehler, sondern eine Einladung. Gerade
   * hier sind die Fragen das Wichtigste – sie stehen für sich allein, ohne
   * Verzeichnis daneben.
   */
  if (!entry) {
    return (
      <Spread
        pageLeft={spread?.page ?? 6}
        left={
          <div className="py-8 lg:py-14">
            <p className="rubric">Noch ungeschrieben</p>
            <h1 className="mt-3 font-serif text-[40px] leading-[1.04] text-ink sm:text-[52px]">
              {chapter.title}
            </h1>
            <span aria-hidden className="rule-gild mt-6 block w-32 opacity-75" />
            <p className="prose-book mt-6 max-w-[46ch]">{chapter.intro}</p>
          </div>
        }
        right={
          <div className="py-8 lg:py-14">
            <p className="rubric mb-5">Womit es beginnt</p>
            <ul className="space-y-4">
              {chapter.questions.map((question) => (
                <li key={question} className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-[11px] h-[3px] w-[3px] shrink-0 rotate-45 bg-gild-500/70"
                  />
                  <p className="font-serif text-[16.5px] italic leading-[1.6] text-ink-muted">
                    {question}
                  </p>
                </li>
              ))}
            </ul>

            <Link
              to={`/setzerei?typ=${chapter.types[0]}`}
              className="mt-9 inline-flex min-h-[42px] items-center rounded-full border border-gild-500/40 px-5 font-serif text-[15px] text-gold transition-colors hover:bg-gild-400/10 no-tap-highlight"
            >
              Die erste Seite schreiben
            </Link>
          </div>
        }
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
        /* Kein justify-center mehr: Mit den Fragen wird die Seite lang genug,
           dass zentrierter Inhalt oben abgeschnitten würde. */
        <div className="flex h-full flex-col py-8 lg:py-12">
          <p className="rubric">Kapitel {romanNumeral(number)}</p>

          <h1 className="mt-3 font-serif text-[40px] leading-[1.04] text-ink sm:text-[52px]">
            {chapter.title}
          </h1>

          <span aria-hidden className="rule-gild mt-6 block w-32 opacity-75" />

          <p className="prose-book mt-6 max-w-[46ch]">{chapter.intro}</p>

          {/*
           * Die Fragen des Kapitels.
           *
           * Sie stehen bewusst auf der Leseseite und nicht im Anhang: Das Buch
           * soll nicht erklären, wie Welten funktionieren, sondern dabei
           * helfen, die eigene zu entdecken. Deshalb sind sie hier das
           * Wichtigste auf der Seite – nicht die Anzahl der Einträge.
           */}
          {chapter.questions.length > 0 && (
            <section className="mt-9 max-w-[44ch]">
              <span aria-hidden className="rule-gild mb-6 block w-full opacity-55" />
              <ul className="space-y-4">
                {chapter.questions.map((question) => (
                  <li key={question} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-[11px] h-[3px] w-[3px] shrink-0 rotate-45 bg-gild-500/70"
                    />
                    <p className="font-serif text-[16.5px] italic leading-[1.6] text-ink-muted">
                      {question}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="mt-9 font-serif text-[12.5px] tracking-[0.16em] text-ink-faint/70">
            {entry.entries.length} {entry.entries.length === 1 ? 'SEITE' : 'SEITEN'}
            {entry.complete && ' · VOLLSTÄNDIG'}
          </p>

          <Link
            to={`/setzerei?typ=${chapter.types[0]}`}
            className="mt-5 inline-flex items-center gap-1.5 font-serif text-[13.5px] italic text-ink-faint transition-colors hover:text-gold no-tap-highlight"
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

          <Kapitelliste
            kapitelId={chapter.id}
            eintraege={entry.entries}
            abgeleitet={entry.abgeleitet}
            seiteVon={(id) => book.pageOfEntry.get(id)}
          />
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
