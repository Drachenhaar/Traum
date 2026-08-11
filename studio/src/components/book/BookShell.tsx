/**
 * Die Hülle des Buches.
 *
 * Hier gibt es keine Seitenleiste und keine untere Leiste mehr. Das Buch ist
 * die Navigation: man blättert. Alles, was bleibt, sind zwei stille Pfeile am
 * Rand, ein Lesebändchen zum Inhaltsverzeichnis und die Kapitelzeile darüber.
 *
 * Blättern geht per Wisch, per Pfeiltaste und per Klick. Wo man aufhört, merkt
 * sich das Buch.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BookmarkIcon, ChevronLeft, ChevronRight, FilePlus2, Search } from 'lucide-react';
import { useStudio, livingEntries } from '../../store/useStudio';
import { buildBook, chapterById, pageWear } from '../../lib/book';
import { deskStyle } from '../../lib/textures';
import { cx } from '../../lib/utils';
import { GlobalSearch } from '../search/GlobalSearch';
import { Gedankenfang } from '../entry/Gedankenfang';
import { Leitfaden } from '../leitfaden/Leitfaden';
import { Spread } from './Spread';

/** Der gebaute Buchblock – einmal je Datenänderung, überall nutzbar. */
export function useBook() {
  const entries = useStudio((s) => s.entries);
  const images = useStudio((s) => s.images);
  return useMemo(() => buildBook(entries, images.length), [entries, images.length]);
}

/** Wo im Buch stehen wir gerade – und wie abgegriffen ist diese Seite? */
export function useCurrentSpread() {
  const book = useBook();
  const { pathname } = useLocation();
  const visits = useStudio((s) => s.settings.visits);

  return useMemo(() => {
    const index = book.spreads.findIndex((s) => s.path === pathname);
    const spread = index >= 0 ? book.spreads[index] : undefined;
    return {
      index,
      spread,
      book,
      wear: spread ? pageWear(visits?.[spread.key] ?? 0) : 0,
    };
  }, [book, pathname, visits]);
}

export function BookShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { index, spread, book, wear } = useCurrentSpread();
  const settings = useStudio((s) => s.settings);
  const updateSettings = useStudio((s) => s.updateSettings);
  const entries = useStudio((s) => s.entries);

  const [searchOpen, setSearchOpen] = useState(false);
  const [fangOffen, setFangOffen] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const lastIndex = useRef(index);

  const prev = index > 0 ? book.spreads[index - 1] : undefined;
  const next = index >= 0 && index < book.spreads.length - 1 ? book.spreads[index + 1] : undefined;

  /* Richtung merken, damit die Seite in die richtige Richtung fällt. */
  useEffect(() => {
    if (index >= 0 && index !== lastIndex.current) {
      setDirection(index > lastIndex.current ? 'forward' : 'back');
      lastIndex.current = index;
    }
  }, [index]);

  /* Wo das Buch zuletzt aufgeschlagen war. */
  useEffect(() => {
    if (spread && settings.lastSpreadKey !== spread.key) {
      updateSettings({ lastSpreadKey: spread.key });
    }
  }, [spread, settings.lastSpreadKey, updateSettings]);

  const turn = useCallback(
    (to: 'prev' | 'next') => {
      const target = to === 'next' ? next : prev;
      if (target) navigate(target.path);
    },
    [next, prev, navigate],
  );

  /* Pfeiltasten – am Schreibtisch blättert man so. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') turn('next');
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') turn('prev');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [turn]);

  /* Wischen auf dem Telefon. */
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    // Nur eindeutig waagerechte Gesten blättern – sonst kämpft es mit dem Scrollen.
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
    turn(dx < 0 ? 'next' : 'prev');
  };

  const chapter = spread?.chapterId ? chapterById(spread.chapterId) : undefined;
  const living = useMemo(() => livingEntries(entries), [entries]);

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden"
      style={deskStyle}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ------------------------------------------------------- Kopfzeile */}
      <header className="flex shrink-0 items-center gap-3 px-4 pt-safe sm:px-7">
        <div className="flex h-12 min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/inhalt')}
            /* Auf jeder Seite erreichbar, also auch auf jeder Seite treffbar. */
            className="group -ml-1 flex h-11 shrink-0 items-center gap-2 px-1 no-tap-highlight"
            aria-label="Inhaltsverzeichnis"
            title="Inhaltsverzeichnis"
            data-leitfaden="inhalt"
          >
            <BookmarkIcon
              size={15}
              className={cx(
                'transition-colors',
                pathname === '/inhalt' ? 'text-gild-400' : 'text-gild-500/55 group-hover:text-gild-400',
              )}
            />
          </button>

          <p className="truncate font-serif text-[12.5px] tracking-[0.16em] text-paper-400/45">
            {chapter ? chapter.title.toUpperCase() : spread?.label.toUpperCase() ?? ''}
          </p>
        </div>

        {/*
         * Zwei Zeichen, mehr Bedienung hat das Buch nicht: einen Gedanken
         * festhalten und im Register nachschlagen.
         *
         * Dieser Knopf fuehrte bis hierher in die Setzerei. Die ist der
         * richtige Ort fuer einen fertigen Text aus einem Gespraech – aber der
         * falsche fuer einen Einfall: Sie fragt nach Art und Vorlage, und wer
         * gerade nur „der Fluss friert von unten zu" denkt, hat die Antwort
         * darauf noch nicht. Die Setzerei ist von dort einen Klick entfernt.
         */}
        <button
          type="button"
          onClick={() => setFangOffen(true)}
          className="grid h-11 w-11 shrink-0 place-items-center text-gild-500/50 transition-colors hover:text-gild-400 no-tap-highlight"
          aria-label="Einen Gedanken festhalten"
          title="Einen Gedanken festhalten"
          data-leitfaden="gedanke"
        >
          <FilePlus2 size={17} />
        </button>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="grid h-11 w-11 shrink-0 place-items-center text-gild-500/50 transition-colors hover:text-gild-400 no-tap-highlight"
          aria-label="Register durchsuchen"
          title="Register"
          data-leitfaden="suche"
        >
          <Search size={17} />
        </button>
      </header>

      {/* --------------------------------------------------- Der Buchblock */}
      <div className="flex min-h-0 flex-1 items-stretch gap-0 px-0 pb-3 sm:px-3 sm:pb-6">
        <TurnEdge side="left" onClick={() => turn('prev')} enabled={!!prev} />

        <div
          key={spread?.key ?? pathname}
          className={cx(
            'flex min-w-0 flex-1',
            direction === 'forward' ? 'animate-turnForward' : 'animate-turnBack',
          )}
          style={{
            filter: 'drop-shadow(0 26px 44px rgba(0,0,0,0.6))',
          }}
        >
          <Outlet context={{ book, spread, wear, living }} />
        </div>

        <TurnEdge side="right" onClick={() => turn('next')} enabled={!!next} />
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Gedankenfang open={fangOffen} onClose={() => setFangOffen(false)} />
      <Leitfaden />
    </div>
  );
}

/**
 * Der Blätterrand.
 *
 * Er liegt außerhalb des Papiers, im Dunkeln. Der Pfeil ist fast unsichtbar,
 * bis man ihn sucht – aber die ganze Fläche ist anklickbar, damit man auch mit
 * dem Daumen trifft.
 */
function TurnEdge({
  side,
  onClick,
  enabled,
}: {
  side: 'left' | 'right';
  onClick: () => void;
  enabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      aria-label={side === 'left' ? 'Eine Seite zurück' : 'Eine Seite weiter'}
      className={cx(
        'group hidden w-11 shrink-0 items-center justify-center transition-opacity duration-300 sm:flex lg:w-16',
        enabled ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      {side === 'left' ? (
        <ChevronLeft
          size={22}
          strokeWidth={1.5}
          className="text-gild-500/25 transition-colors duration-300 group-hover:text-gild-400/80"
        />
      ) : (
        <ChevronRight
          size={22}
          strokeWidth={1.5}
          className="text-gild-500/25 transition-colors duration-300 group-hover:text-gild-400/80"
        />
      )}
    </button>
  );
}

/** Damit die Seiten den Kontext der Hülle mitbekommen. */
export { Spread };
