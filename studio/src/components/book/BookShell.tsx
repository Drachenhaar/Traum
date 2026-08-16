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
import { BookmarkIcon, ChevronLeft, ChevronRight, Eye, FilePlus2, Search } from 'lucide-react';
import { useStudio, livingEntries } from '../../store/useStudio';
import { buildBook, chapterById, pageWear } from '../../lib/book';
import { deskStyle } from '../../lib/textures';
import { profilVon } from '../../lib/profil';
import { cx } from '../../lib/utils';
import { GlobalSearch } from '../search/GlobalSearch';
import { Gedankenfang } from '../entry/Gedankenfang';
import { Leitfaden } from '../leitfaden/Leitfaden';
import { Aufmerksamkeit } from '../anerbieten/Aufmerksamkeit';
import { Spread } from './Spread';
import { Raumschicht } from '../raum/Raumschicht';
import { Tiefenmarke, Tiefenraum } from '../raum/Tiefenraum';
import { useRaum, gesteLaeuft } from '../../lib/raum/useRaum';

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

  const tiefe = useRaum((s) => s.tiefe);
  const ankerId = useRaum((s) => s.ankerId);
  const setzeAnker = useRaum((s) => s.setzeAnker);

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

  /*
   * Der Anker folgt der Mitte – aber nur, solange der Blick bei der Mitte ist.
   *
   * Das ist die praktische Hälfte des Gesetzes „Anker und sichtbare Mitte sind
   * nicht dasselbe". Bei Tiefe 0 sind sie es sehr wohl: Was aufgeschlagen ist,
   * ist das Werk, und man muss es nicht eigens erklären. Sobald man eine Ebene
   * hinausgeht, friert der Anker ein – und genau dann fängt der Unterschied an
   * zu zählen, weil man drei Räume weiter sonst nicht mehr wüsste, worum es
   * eigentlich ging.
   */
  useEffect(() => {
    if (tiefe > 0) return;
    const id = pathname.startsWith('/eintrag/') ? pathname.slice('/eintrag/'.length) : undefined;
    if (id && id !== ankerId) setzeAnker(id);
  }, [pathname, tiefe, ankerId, setzeAnker]);

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
    /*
     * Blaettern und Raumtiefe sind zwei verschiedene Dinge.
     *
     * Blaettern bewegt sich *innerhalb* des Werkes, der Richtungsbogen fuehrt
     * *aus* ihm hinaus. Beide sind waagerechte Wische, und ohne diese Frage
     * taete ein Zug vom rechten Rand beides gleichzeitig: den Wesensraum
     * andeuten und eine Seite umschlagen. Der Raum hat Vorrang, weil er zuerst
     * entscheidet – er beansprucht den Finger nur aus einem Randstreifen und
     * nur bei passender Richtung.
     */
    if (gesteLaeuft()) return;
    // Nur eindeutig waagerechte Gesten blättern – sonst kämpft es mit dem Scrollen.
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
    turn(dx < 0 ? 'next' : 'prev');
  };

  const chapter = spread?.chapterId ? chapterById(spread.chapterId) : undefined;
  const living = useMemo(() => livingEntries(entries), [entries]);

  return (
    <div
      /*
       * Die Anmutung steht als Merkmal am Buchkoerper, nicht als Klasse an
       * jedem Absatz.
       *
       * Das ist die Praesentationsschicht aus dem Bauplan, und sie ist
       * bewusst duenn: **ein** Attribut hier, und darunter regelt das
       * Stylesheet Schriftgrad, Zeilenluft und Bildgroesse fuer alles, was im
       * Buch steht. Jede Komponente einzeln umzubauen haette am Ende drei
       * Saetze Komponenten ergeben – und damit genau die getrennten Versionen,
       * die es nicht geben soll.
       *
       * Was sich hier aendert, ist ausschliesslich Satz. Kein Inhalt wird
       * anders, keine Funktion faellt weg.
       */
      data-anmutung={profilVon(settings).anmutung}
      className="flex h-full w-full flex-col overflow-hidden"
      style={deskStyle}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/*
        Der Tischmodus, sichtbar.

        Ein Balken ueber dem ganzen Buch, nicht ein Punkt in der Ecke. Das ist
        keine Geschmacksfrage: Wer glaubt, der Tischmodus sei an, und er ist es
        nicht, dreht den Bildschirm um und zeigt alles. Der Zustand muss so
        deutlich sein, dass man ihn im Augenwinkel sieht, waehrend man auf
        etwas anderes schaut.

        Er erscheint nur, wenn er an ist – ein Balken, der staendig „aus" sagt,
        wird nach einer Woche nicht mehr gelesen.
      */}
      {settings.tischmodus && (
        <button
          type="button"
          onClick={() => updateSettings({ tischmodus: false })}
          className="flex w-full shrink-0 items-center justify-center gap-2 bg-gild-600/85 py-1.5 font-serif text-[12.5px] tracking-[0.14em] text-[#1a1206] transition-colors hover:bg-gild-500 no-tap-highlight"
        >
          <Eye size={13} /> AM TISCH · VERBORGENES IST ZU · ANTIPPEN ZUM BEENDEN
        </button>
      )}

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

          {tiefe > 0 ? (
            <Tiefenmarke />
          ) : (
            <p className="truncate font-serif text-[12.5px] tracking-[0.16em] text-paper-400/45">
              {chapter ? chapter.title.toUpperCase() : spread?.label.toUpperCase() ?? ''}
            </p>
          )}
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
      {/*
        Die Raumschicht liegt *um* den Buchblock, nicht darin.

        Sie ist die Ebene, aus der heraus die Richtungsboegen wachsen und in
        der die Tiefe erscheint. Der Buchkoerper darunter bleibt unveraendert –
        das ist der Punkt: Die Bedienung wurde nicht in das Buch eingebaut,
        sondern darum herum gelegt.
      */}
      <Raumschicht>
        {tiefe > 0 ? (
          <Tiefenraum />
        ) : (
          <div className="flex min-h-0 flex-1 items-stretch gap-0 px-0 pb-3 sm:px-3 sm:pb-6">
            <TurnEdge side="left" onClick={() => turn('prev')} enabled={!!prev} />

            <div
              key={spread?.key ?? pathname}
              className={cx(
                'flex min-w-0 flex-1',
                direction === 'forward' ? 'animate-turnForward' : 'animate-turnBack',
              )}
              style={{
                filter: 'drop-shadow(var(--dc-book-shadow))',
              }}
            >
              <Outlet context={{ book, spread, wear, living }} />
            </div>

            <TurnEdge side="right" onClick={() => turn('next')} enabled={!!next} />
          </div>
        )}
      </Raumschicht>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Gedankenfang open={fangOffen} onClose={() => setFangOffen(false)} />
      <Leitfaden />
      <Aufmerksamkeit />
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
