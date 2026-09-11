/**
 * Die Zeile über einem Arbeitsraum.
 *
 * Das eine Bauteil, das sich Schreibraum und Werkstatt teilen – und
 * ausdrücklich **nur dieses**. Es trägt nichts als: wo man ist, wohin man
 * kann, und den Weg zurück ins Regal.
 *
 * Sie ist keine Werkzeugleiste. Der Unterschied ist nicht die Zahl der
 * Einträge, sondern was darin steht: Eine Werkzeugleiste zeigt, *was man tun
 * kann*; diese Zeile zeigt, *wo man ist*. Deshalb stehen hier Orte und keine
 * Verben, und deshalb sind es zwei oder vier und nicht zehn.
 */

import { Link, useLocation } from 'react-router-dom';
import { Library } from 'lucide-react';
import { cx } from '../../lib/utils';

export interface Ort {
  /** Die Adresse. */
  ziel: string;
  /** Wie der Ort heisst – ein Substantiv, kein Verb. */
  name: string;
  /**
   * Woran erkannt wird, dass man dort ist.
   *
   * Ohne diese Angabe müsste man auf Gleichheit prüfen, und dann wäre man auf
   * `/eintrag/abc` nirgends – obwohl man mitten in den Bewohnern steht.
   */
  gehoert?: (pfad: string) => boolean;
}

export function Raumzeile({
  titel,
  orte,
  hinweis,
}: {
  /** Der Titel des Bandes. Klein, links, und er führt zum Umschlag. */
  titel: string;
  orte: Ort[];
  /** Was ganz rechts steht, falls etwas dort stehen soll. */
  hinweis?: React.ReactNode;
}) {
  const { pathname } = useLocation();

  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-paper-400/15 px-4 pt-[calc(0.55rem+env(safe-area-inset-top))] pb-2 sm:px-6">
      {/*
        Zurück ins Regal.

        Ein Zeichen, kein Wort – es steht auf jedem Bildschirm und muss
        deshalb so wenig Platz nehmen wie möglich. Links, weil dort das
        Zurück wohnt.
      */}
      <Link
        to="/bibliothek"
        aria-label="Zurück in die Bibliothek"
        className="shrink-0 text-paper-400/45 transition-colors hover:text-gild-500 no-tap-highlight"
      >
        <Library size={17} />
      </Link>

      {/*
        Der Titel tritt auf dem Handy zurück.

        Gemessen an einem iPhone: „Die Chroniken des Nebelwaldes" nahm so viel
        Breite, dass von vier Orten nur zweieinhalb im Bild standen – und ein
        Ort, den man nicht sieht, ist keiner. Der Titel steht auf dem Einband,
        im Regal und in der Bibliothek; die Orte stehen nur hier.
      */}
      <Link
        to="/"
        className="hidden min-w-0 shrink truncate font-serif text-[14.5px] text-paper-300/70 transition-colors hover:text-paper-200 no-tap-highlight sm:block"
      >
        {titel}
      </Link>

      <span aria-hidden className="hidden h-3.5 w-px shrink-0 bg-paper-400/15 sm:block" />

      {/*
        Die Orte.

        Waagerecht scrollbar statt umbrechend: Vier Orte passen auf ein
        iPhone nur knapp, und eine Zeile, die auf zwei Zeilen umbricht,
        schiebt den Inhalt darunter weg. Ein Regal blättert man um, eine
        Kopfzeile nicht.
      */}
      <nav className="scroll-slim -mx-1 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1">
        {orte.map((o) => {
          const hier = o.gehoert ? o.gehoert(pathname) : pathname === o.ziel;
          return (
            <Link
              key={o.ziel}
              to={o.ziel}
              aria-current={hier ? 'page' : undefined}
              className={cx(
                'shrink-0 rounded-full px-2.5 py-1.5 font-serif text-[13.5px] transition-colors no-tap-highlight sm:px-3 sm:text-[14px]',
                hier
                  /*
                   * `/10` und nicht `/12`.
                   *
                   * Tailwinds Deckkraftskala kennt nur Vielfache von fuenf –
                   * `/12` erzeugt gar keine Klasse. Die Pille hinter dem
                   * offenen Ort wurde deshalb nie gezeichnet, und zwar
                   * unsichtbar: Der Text war golden, also sah es nach Absicht
                   * aus. `npm run klassen` hat es gefunden.
                   */
                  ? 'bg-gild-400/10 text-gild-300'
                  : 'text-paper-400/55 hover:text-paper-200',
              )}
            >
              {o.name}
            </Link>
          );
        })}
      </nav>

      {hinweis && <div className="shrink-0">{hinweis}</div>}
    </header>
  );
}
