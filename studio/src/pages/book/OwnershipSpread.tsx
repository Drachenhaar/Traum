/**
 * Die Besitzseite.
 *
 * In alten Baenden die erste Seite hinter dem Vorsatz: Wem gehoert dieses
 * Buch, und wann hat es begonnen. Sie steht hier aus demselben Grund wie
 * dort – nicht als Angabe, sondern als Anspruch.
 *
 * Der Name ist eintragbar und darf leer bleiben. Er ist das Einzige auf
 * dieser Seite, das sich aendern laesst; alles andere ist Tatsache.
 *
 * Alle Worte stehen in `bookTexts.ts`, damit die Seite spaeter uebersetzt
 * werden kann, ohne diese Datei anzufassen.
 */

import { Link } from 'react-router-dom';
import { useStudio } from '../../store/useStudio';
import { BUCH_TEXTE, langesDatum } from '../../lib/bookTexts';
import { BookEmblem } from '../../components/book/BookEmblem';
import { Spread } from '../../components/book/Spread';
import { useCurrentSpread } from '../../components/book/BookShell';

const T = BUCH_TEXTE.besitz;

export function OwnershipSpread() {
  const book = useStudio((s) => s.settings.book);
  const saveBook = useStudio((s) => s.saveBook);
  const { spread } = useCurrentSpread();

  if (!book) return null;

  return (
    <Spread
      pageLeft={spread?.page ?? 3}
      left={
        <div className="flex h-full flex-col items-center justify-center py-12 text-center">
          <p className="rubric">{T.gehoert}</p>

          <input
            value={book.owner ?? ''}
            onChange={(e) => saveBook({ owner: e.target.value })}
            placeholder={T.namePlatzhalter}
            aria-label={T.gehoert}
            autoComplete="name"
            className="mt-4 w-full max-w-[22ch] border-0 border-b border-line bg-transparent pb-1.5 text-center font-serif text-[19px] text-ink outline-none transition-colors placeholder:text-ink-faint/30 focus:border-gild-500/60"
          />

          <BookEmblem identity={book} size={92} color="#8C6510" className="mt-12" />

          <h1 className="mt-10 font-serif text-[30px] leading-tight text-ink sm:text-[34px]">
            {book.title}
          </h1>
          {book.subtitle?.trim() && (
            <p className="mt-2.5 font-serif text-[14.5px] italic text-ink-muted">{book.subtitle}</p>
          )}

          <span aria-hidden className="rule-gild mt-9 block w-24 opacity-70" />

          <p className="mt-9 font-serif text-[13.5px] tracking-[0.08em] text-ink-faint">
            {T.begonnen} {langesDatum(book.createdAt)}
          </p>

          <p className="mt-14 max-w-[34ch] font-serif text-[13px] italic leading-relaxed text-ink-faint/70">
            {T.segen}
          </p>

          <Link
            to="/vorwort"
            className="mt-10 inline-flex min-h-[44px] items-center font-serif text-[14px] italic text-gold transition-colors hover:text-gold-hell no-tap-highlight"
          >
            {T.weiter}
          </Link>
        </div>
      }
      right={null}
    />
  );
}
