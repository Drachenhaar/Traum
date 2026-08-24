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
import { Raumschicht, fenster } from '../raum/Raumschicht';
import { Blatt, Blattschatten, Buchkoerper, Woelbung } from './Buchkoerper';
import { useBlaettern } from './useBlaettern';
import { spineThickness } from '../../lib/book';
import { Tiefenmarke, Tiefenraum } from '../raum/Tiefenraum';
import { useRaum } from '../../lib/raum/useRaum';
import { konfig } from '../../lib/raum/konfig';
import { standardkarte } from '../../lib/raum/tiefenvorlagen';
import { useTiefe } from '../raum/useTiefe';
import { useOberflaeche } from '../raum/useOberflaeche';
import { deutlichkeit, uebergangMs } from '../../lib/raum/flaeche';

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

  /*
   * Das Blaettern folgt jetzt dem Finger.
   *
   * Hier stand ein Wisch-Schalter: siebzig Punkte waagerecht, und die Seite
   * war weg. Das war kein Blaettern, sondern ein Knopf mit Umweg – und es
   * lieferte keinerlei Rueckmeldung darueber, ob die Geste ankommt. Der Hook
   * daneben haengt die Seite an den Finger und entscheidet erst beim
   * Loslassen; die Schwelle dafuer steht im Stimmzimmer.
   */
  const buchkasten = useRef<HTMLDivElement>(null);
  const blaettern = useBlaettern({
    huelle: buchkasten,
    kannVor: !!next,
    kannZurueck: !!prev,
    onBlaettern: (r) => turn(r === 'vor' ? 'next' : 'prev'),
    feld: fenster,
  });

  /*
   * Das aufgeschlagene Buch meldet sich am Wurzelelement an.
   *
   * Zwei unsichtbare Merkmale, kein Zustandsspeicher: Der Einband schreibt
   * „geschlossen" oder „oeffnet", diese Huelle „offen" – und wer wissen will,
   * wo das Buch steht, liest eine Stelle statt zwei zu vergleichen.
   */
  /*
   * Die Rückfallkarte – ausdrücklich das Zweitbeste.
   *
   * Sie gilt nur für Seiten, die ihre Tiefe nicht selbst anmelden. Das
   * zweite Argument ist kein Schalter für Feinheiten: Es legt diese Karte in
   * ein eigenes Fach, damit sie die Karte einer Seite nicht überschreiben
   * kann. Siehe `useTiefe` – React arbeitet Kind-Effekte vor Eltern-Effekten
   * ab, und ohne das zweite Fach gewönne ausgerechnet der Rückfall.
   */
  const ankerTyp = ankerId ? entries.find((e) => e.id === ankerId)?.type : undefined;
  useTiefe(standardkarte(pathname, ankerTyp), true);

  /**
   * Seiten, die den Buchkörper nicht wollen.
   *
   * Eine sehr kurze Liste, und sie soll kurz bleiben: Jede Seite, die hier
   * steht, ist eine Seite, die *nicht* im Buch steht, und das ist im
   * Zweifelsfall die falsche Antwort. Die Charakterseite steht hier, weil sie
   * randlos und dunkel ist – nicht, weil ihr der Buchsatz im Weg wäre.
   */
  const vollbild = pathname.startsWith('/figur/');

  useEffect(() => {
    const w = document.documentElement;
    w.dataset.buch = 'offen';
    w.dataset.seite = spread ? String(spread.page ?? index + 1) : '—';
    return () => {
      delete w.dataset.buch;
      delete w.dataset.seite;
    };
  }, [spread, index]);

  /*
   * Welcher Band aufgeschlagen ist – am Wurzelelement, nicht an dieser Hülle.
   *
   * Es muss ganz oben stehen, weil die Farbmarken in `:root` liegen und alles
   * darunter aus ihnen liest: der Buchkörper, die Seiten, jeder Knopf, jede
   * Eingabe. Ein Merkmal an der Hülle erreichte den Einband nicht, und die
   * Titelseite läge weiter im hellen Papier, während das Buch dahinter dunkel
   * wäre.
   *
   * Die Kennung kommt vom **Buch** und nicht aus dem Stimmzimmer: Aus welchem
   * Stoff ein Band gebunden ist, gehört zu diesem Buch, und zwei Bücher in
   * derselben Bibliothek dürfen verschieden aussehen. Der Regler im
   * Stimmzimmer wäre eine zweite Wahrheit über dieselbe Frage gewesen.
   *
   * Die Abhängigkeit ist die Kennung selbst, nicht das ganze Buch: Wer nur
   * den Titel ändert, soll nicht dreiundzwanzig CSS-Variablen neu schreiben.
   */
  /* Der Band wird an der Wurzel aufgeschlagen (siehe `App.tsx`) – hier nicht
     noch einmal: Zwei Stellen, die dieselben Variablen schreiben, sind eine
     Stelle zu viel. */

  /*
   * Wie viel Oberfläche gerade dastehen darf.
   *
   * Der Zustand steht als Merkmal an der Hülle und die Deutlichkeit als
   * Variable daneben – beides erbt nach unten, und jedes Bedienelement, das
   * zurücktreten soll, braucht nur eine Zeile im Stylesheet statt einer
   * eigenen Verbindung hierher.
   */
  const flaeche = useOberflaeche();
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
      data-flaeche={flaeche}
      className="flex h-full w-full flex-col overflow-hidden"
      style={
        {
          ...deskStyle,
          '--dc-chrome': String(deutlichkeit(flaeche, konfig())),
          '--dc-chrome-ms': `${uebergangMs(flaeche, konfig())}ms`,
        } as React.CSSProperties
      }
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
      {/*
        Auf einer Vollbildseite gibt es keine Buchleiste.

        Sonst stehen zwei Kopfzeilen uebereinander – die des Bandes und die
        der Figur – und die Charakterseite sieht aus wie eine Ansicht *in*
        einem Programm statt wie das Gesicht selbst. Genau der Eindruck, den
        der Auftrag ausschliesst: nicht „ein Charakterformular", sondern „da
        ist diese Person".

        Verloren geht dabei nichts: Die Charakterseite hat ihr eigenes
        „Zurueck", ihren eigenen Stern und ihren eigenen Weg zur Buchseite.
      */}
      {!vollbild && (
      <header className="flex shrink-0 items-center gap-3 px-4 pt-safe sm:px-7">
        <div className="flex h-12 min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/inhalt')}
            /* Auf jeder Seite erreichbar, also auch auf jeder Seite treffbar. */
            className="dc-chrome group -ml-1 flex h-11 shrink-0 items-center gap-2 px-1 no-tap-highlight"
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
          className="dc-chrome grid h-11 w-11 shrink-0 place-items-center text-gild-500/50 transition-colors hover:text-gild-400 no-tap-highlight"
          aria-label="Einen Gedanken festhalten"
          title="Einen Gedanken festhalten"
          data-leitfaden="gedanke"
        >
          <FilePlus2 size={17} />
        </button>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="dc-chrome grid h-11 w-11 shrink-0 place-items-center text-gild-500/50 transition-colors hover:text-gild-400 no-tap-highlight"
          aria-label="Register durchsuchen"
          title="Register"
          data-leitfaden="suche"
        >
          <Search size={17} />
        </button>
      </header>
      )}

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
        ) : vollbild ? (
          /*
            Eine Seite, die kein Buchsatz ist.

            Die Charakterseite ist nach der Referenz randlos und fast schwarz.
            Im Buchkörper wäre sie ein dunkles Rechteck auf einem hellen Bogen,
            mit Falz daneben und Seitenkanten darum – und beim geringsten
            waagerechten Zug würde geblättert, wo eigentlich die Herkunft
            aufgehen soll.

            Sie liegt deshalb direkt in der Raumschicht. Was sie dadurch
            *behält*, ist das Wesentliche: Randgeste, Richtungsbogen,
            Tiefenraum und Doppeltipp gehören der Schicht und nicht dem Buch.
          */
          <div className="flex min-h-0 flex-1 flex-col">
            <Outlet context={{ book, spread, wear, living }} />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 items-stretch gap-0 px-0 pb-3 sm:px-3 sm:pb-6">
            <TurnEdge side="left" onClick={() => turn('prev')} enabled={!!prev} />

            {/*
              Der Buchkoerper.

              Bis hierher lag hier ein Rechteck mit Schlagschatten – man las
              darauf, aber man war nicht *darin*. Falz, Seitenkanten und Dicke
              kosten ein paar Dutzend Zeilen und machen aus der Seite einen
              Bogen. Die Perspektive muss am Elternteil stehen, sonst dreht
              sich das Blatt flach statt in den Raum.
            */}
            <div
              ref={buchkasten}
              className="dc-buchkasten relative flex min-w-0 flex-1"
              data-blatt={blaettern.richtung ?? 'ruhe'}
              style={{ perspective: '1600px' }}
              {...blaettern.griffe}
            >
              <Buchkoerper dicke={spineThickness(book.totalPages)}>
                {/*
                  Das Papier, das beim Vorwaertsblaettern darunter zum
                  Vorschein kommt. Es liegt immer da und kostet nichts – sonst
                  saehe man beim Drehen den dunklen Tisch statt der naechsten
                  Seite.
                */}
                <span aria-hidden className="paper-sheet absolute inset-0 z-0 block rounded-[3px]" />

                <Blattschatten richtung={blaettern.richtung} />

                {/*
                  Zwei Knoten statt einem – und das ist keine Kosmetik.

                  Hier trafen zwei Mechanismen auf derselben Eigenschaft
                  desselben Elements aufeinander: `animate-turnForward` (die
                  alte Ankunftsbewegung, mit `both` als Füllung) und die neue
                  Drehung am Finger. Eine Animation schlägt eine gewöhnliche
                  Regel, und `both` hält ihren Endwert für immer – die Seite
                  drehte sich also nie, obwohl jede Zahl stimmte. Am
                  Schreibtisch war davon nichts zu sehen; gefunden wurde es
                  daran, dass `--dc-seite-winkel` bei −139 Grad stand und die
                  berechnete Matrix die Einheitsmatrix blieb.

                  Aufgelöst wird das nicht durch Löschen: Die Ankunft *soll*
                  weiter eingeblendet werden, wenn ein Bogen frisch erscheint.
                  Sie zieht nur eine Ebene nach innen. Außen dreht sich das
                  Blatt, innen kommt der Inhalt an – jede Eigenschaft hat
                  wieder genau einen Besitzer.
                */}
                <div
                  className="dc-seite relative z-10 flex min-w-0 flex-1"
                  style={{ filter: 'drop-shadow(var(--dc-book-shadow))' }}
                >
                  <div
                    key={spread?.key ?? pathname}
                    className={cx(
                      'relative flex min-w-0 flex-1',
                      direction === 'forward' ? 'animate-turnForward' : 'animate-turnBack',
                    )}
                  >
                    <Outlet context={{ book, spread, wear, living }} />
                  </div>

                  {/*
                    Beim Vorwaertsblaettern dreht sich diese Seite selbst weg –
                    also braucht sie dieselbe Woelbung wie das leere Blatt beim
                    Zurueckblaettern. Nur dann, sonst laege staendig ein
                    Verlauf ueber dem Text.
                  */}
                  {blaettern.richtung === 'vor' && <Woelbung />}
                </div>

                {/*
                  In beide Richtungen dreht sich ein Blatt mit. Vorwaerts
                  uebernimmt es dort, wo die lebende Seite ihre Rueckseite
                  zeigen wuerde – sonst waere die zweite Haelfte jeder
                  Drehung eine leere Flaeche.
                */}
                {blaettern.richtung && <Blatt richtung={blaettern.richtung} />}
              </Buchkoerper>
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
        'dc-chrome group hidden w-11 shrink-0 items-center justify-center sm:flex lg:w-16',
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
