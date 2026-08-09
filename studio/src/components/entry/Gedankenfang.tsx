/**
 * Der Gedankenfang.
 *
 * Ein Einfall haelt ungefaehr fuenf Sekunden. Was in dieser Zeit nicht
 * festgehalten ist, ist weg – und alles, was dazwischenkommt, kostet den
 * Einfall: die Frage nach dem Typ, die Frage nach dem Kapitel, ein Formular
 * mit achtzehn Feldern.
 *
 * Also fragt hier nichts. Aufmachen, tippen, Eingabetaste. Der Gedanke steht
 * im Buch, das Feld ist wieder leer, der naechste kann kommen. Ob daraus eine
 * Figur wird, ein Ort oder gar nichts, entscheidet sich spaeter – und wenn es
 * sich nie entscheidet, ist der Gedanke trotzdem gueltig.
 *
 * Er wird als Notizseite abgelegt, weil das die Seite ohne Anspruch ist. Kein
 * eigener Datentyp fuer „unfertig": Ein Gedanke ist ein Eintrag wie jeder
 * andere, nur einer, den noch niemand einsortiert hat.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useStudio } from '../../store/useStudio';
import { cx } from '../../lib/utils';

export function Gedankenfang({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createEntry = useStudio((s) => s.createEntry);
  const notify = useStudio((s) => s.notify);

  const [text, setText] = useState('');
  const [gefangen, setGefangen] = useState<{ id: string; titel: string }[]>([]);
  const feld = useRef<HTMLInputElement>(null);

  /*
   * Zwei Effekte, nicht einer – und das ist hier kein Stilfrage.
   *
   * Zusammengelegt haengt das Leeren der Liste mit an `onClose`. Diese
   * Funktion wird von der Buchhuelle bei jeder Neuzeichnung neu erzeugt, und
   * neu gezeichnet wird sie, sobald ein Eintrag entsteht. Der erste
   * festgehaltene Gedanke loeschte damit die Liste, in der er gerade
   * erscheinen wollte: Man tippte drei Einfaelle und sah einen.
   *
   * Beim Oeffnen zuruecksetzen haengt also nur an `open`.
   */
  useEffect(() => {
    if (!open) return;
    setGefangen([]);
    setText('');
    /* Erst im naechsten Zug – vorher gibt es das Feld noch nicht. */
    const t = window.setTimeout(() => feld.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [open]);

  const schliesser = useRef(onClose);
  schliesser.current = onClose;
  useEffect(() => {
    if (!open) return;
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') schliesser.current();
    };
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  }, [open]);

  if (!open) return null;

  const fangen = () => {
    const roh = text.trim();
    if (!roh) return;

    /*
     * Erste Zeile wird Titel, der Rest Beschreibung. Wer einen ganzen Absatz
     * einwirft, bekommt keine Seite mit einem Absatz als Ueberschrift.
     */
    const [ersteZeile, ...rest] = roh.split('\n');
    const titel = ersteZeile.length > 90 ? `${ersteZeile.slice(0, 88).trimEnd()}…` : ersteZeile;
    const beschreibung = [ersteZeile.length > 90 ? ersteZeile : '', ...rest]
      .filter(Boolean)
      .join('\n')
      .trim();

    /*
     * Das Feld wird sofort geleert, nicht erst wenn die Datenbank geantwortet
     * hat. Der naechste Gedanke wartet nicht auf IndexedDB.
     */
    setText('');
    feld.current?.focus();

    void createEntry('page', { title: titel, description: beschreibung, category: 'Notiz' })
      .then((entry) => setGefangen((g) => [{ id: entry.id, titel }, ...g].slice(0, 8)))
      .catch((err) => {
        const e = err as Error;
        notify(`Nicht festgehalten: ${e?.message ?? String(err)}`, 'error');
        setText(roh);
      });
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[14vh] sm:pt-[18vh]">
      <div
        className="absolute inset-0 bg-olive-900/35 backdrop-blur-[2px] animate-fadeIn"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Einen Gedanken festhalten"
        className={cx(
          'relative w-full max-w-[34rem] rounded-[3px] border border-paper-300/80 bg-cream-50/98',
          'px-5 pb-4 pt-4 shadow-[0_28px_70px_-24px_rgba(60,44,26,0.6)] animate-fadeIn',
        )}
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="rubric">Notiert</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="grid h-8 w-8 place-items-center text-ink-faint/40 transition-colors hover:text-ink no-tap-highlight"
          >
            <X size={15} />
          </button>
        </div>

        <input
          ref={feld}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              fangen();
            }
          }}
          placeholder="Ein Ort, eine Figur, ein Gedanke …"
          aria-label="Gedanke"
          enterKeyHint="done"
          className={cx(
            'mt-1 w-full border-0 border-b border-paper-300/70 bg-transparent px-0 pb-2.5 pt-1',
            'font-serif text-[19px] leading-snug text-ink outline-none',
            'placeholder:italic placeholder:text-ink-faint/40 focus:border-gild-500/50',
          )}
        />

        <p className="mt-2 font-serif text-[12.5px] italic leading-relaxed text-ink-faint">
          Eingabetaste hält fest. Was daraus wird, entscheidest du später –
          oder nie.
        </p>

        {gefangen.length > 0 && (
          <ul className="mt-4 border-t border-paper-300/60 pt-3">
            {gefangen.map((g) => (
              <li key={g.id}>
                <Link
                  to={`/eintrag/${g.id}`}
                  onClick={onClose}
                  className="flex items-baseline gap-2 py-1 no-tap-highlight"
                >
                  <span aria-hidden className="h-[3px] w-[3px] shrink-0 rounded-full bg-gild-500/70" />
                  <span className="min-w-0 flex-1 truncate font-serif text-[14.5px] text-ink-muted transition-colors hover:text-gild-600">
                    {g.titel}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-paper-300/60 pt-3">
          <Link
            to="/setzerei"
            onClick={onClose}
            className="font-serif text-[13.5px] text-ink-faint transition-colors hover:text-gild-600 no-tap-highlight"
          >
            Ausführlicher setzen
          </Link>
          {gefangen.length > 0 && (
            <span className="font-serif text-[12.5px] text-ink-faint/70">
              {gefangen.length} {gefangen.length === 1 ? 'Seite' : 'Seiten'} eingelegt
            </span>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
