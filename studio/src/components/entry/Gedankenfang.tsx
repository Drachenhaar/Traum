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
import { errate, zerlege } from '../../lib/gedanke';
import { emptyFields, templateFor } from '../../lib/templates';
import { cx } from '../../lib/utils';

export function Gedankenfang({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createEntry = useStudio((s) => s.createEntry);
  const notify = useStudio((s) => s.notify);

  const [text, setText] = useState('');
  const updateEntry = useStudio((s) => s.updateEntry);
  const [gefangen, setGefangen] = useState<
    { id: string; titel: string; vermutung?: { type: string; grund: string } }[]
  >([]);
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

  /*
   * Die Referenz zeigt auf den aktuellen Schliesser, nicht auf `onClose` –
   * sonst wuerde die Escape-Taste als einzige den Gedanken doch verlieren.
   */
  const schliesser = useRef<() => void>(onClose);
  useEffect(() => {
    if (!open) return;
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') schliesser.current();
    };
    window.addEventListener('keydown', taste);
    return () => window.removeEventListener('keydown', taste);
  }, [open]);

  /*
   * Schliessen wirft nichts weg.
   *
   * Vorher tat es das: Wer tippte und dann das Kreuz antippte oder daneben,
   * verlor den Gedanken kommentarlos. Am Telefon ist das nicht der Ausnahme-,
   * sondern der Regelfall – die Tastatur verdeckt das halbe Bild, man tippt
   * irgendwo hin, und der Einfall ist weg. Fuer eine Funktion, deren ganzer
   * Zweck „ein Gedanke darf nicht verlorengehen" ist, war das der schlimmste
   * denkbare Fehler.
   *
   * Es wird nicht nachgefragt. Eine Ruecklfrage waere eine Huerde an genau der
   * Stelle, an der es keine geben darf – und die falsche Antwort darauf
   * kostet dasselbe wie vorher.
   */
  const schliessen = () => {
    if (text.trim()) fangen();
    onClose();
  };
  schliesser.current = schliessen;

  const fangen = () => {
    const roh = text.trim();
    if (!roh) return;

    /*
     * Erste Zeile wird Titel, der Rest Beschreibung. Wer einen ganzen Absatz
     * einwirft, bekommt keine Seite mit einem Absatz als Ueberschrift.
     *
     * Und ein Gedankenstrich in der ersten Zeile trennt Namen von Beisatz:
     * „Ellen – Die Sternenwächterin" wird eine Seite „Ellen" mit dem
     * Untertitel „Die Sternenwächterin", nicht eine Seite mit einem
     * Bindestrich im Namen.
     */
    const [ersteZeile, ...rest] = roh.split('\n');
    const { titel: name, untertitel } = zerlege(ersteZeile);
    const titel = name.length > 90 ? `${name.slice(0, 88).trimEnd()}…` : name;
    const beschreibung = [name.length > 90 ? name : '', ...rest]
      .filter(Boolean)
      .join('\n')
      .trim();
    const vermutung = errate(ersteZeile);

    /*
     * Das Feld wird sofort geleert, nicht erst wenn die Datenbank geantwortet
     * hat. Der naechste Gedanke wartet nicht auf IndexedDB.
     */
    setText('');
    feld.current?.focus();

    void createEntry('page', {
      title: titel,
      subtitle: untertitel,
      description: beschreibung,
      category: 'Notiz',
    })
      .then((entry) =>
        setGefangen((g) => [{ id: entry.id, titel, vermutung }, ...g].slice(0, 8)),
      )
      .catch((err) => {
        const e = err as Error;
        notify(`Nicht festgehalten: ${e?.message ?? String(err)}`, 'error');
        setText(roh);
      });
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[14vh] sm:pt-[18vh]">
      <div
        className="absolute inset-0 bg-olive-900/35 backdrop-blur-[2px] animate-fadeIn"
        onClick={schliessen}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Einen Gedanken festhalten"
        className={cx(
          'relative w-full max-w-[34rem] rounded-[3px] border border-paper-300/80 bg-cream-50',
          'px-5 pb-4 pt-4 shadow-[0_28px_70px_-24px_rgba(60,44,26,0.6)] animate-fadeIn',
        )}
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="rubric">Notiert</p>
          <button
            type="button"
            onClick={schliessen}
            aria-label="Schließen"
            className="grid h-8 w-8 place-items-center text-ink-faint/40 transition-colors hover:text-ink no-tap-highlight"
          >
            <X size={15} />
          </button>
        </div>

        {/*
          Das Feld bekommt die volle Breite, der Knopf steht darunter.

          Nebeneinander sah aufgeraeumter aus und war es nicht: Auf einem
          320er blieben dem Feld hundertsiebenundfuenfzig Pixel, und man sah
          beim Tippen nur noch das Ende des eigenen Satzes. Ein Gedanke ist
          laenger als zehn Zeichen.

          Der Knopf selbst muss sein. Die Eingabetaste allein hat nicht
          gereicht: Man tippt, sieht nichts passieren und weiss nicht, ob es
          festgehalten ist – und auf dem Telefon heisst die Ruecktaste je nach
          Tastatur ein Haken, ein Pfeil oder „Fertig".
        */}
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

        {/*
          Immer da, nur still, solange nichts dasteht. Ein Knopf, der
          erscheint und verschwindet, laesst die Zeile springen – und zwar
          genau in dem Moment, in dem der Finger schon unterwegs ist.
        */}
        <div className="mt-2.5 flex justify-end">
          <button
            type="button"
            onClick={fangen}
            disabled={!text.trim()}
            className={cx(
              'inline-flex min-h-[38px] items-center rounded-full border px-5',
              'font-serif text-[14.5px] transition-colors no-tap-highlight',
              text.trim()
                ? 'border-gild-500/45 text-gild-600 hover:bg-gild-400/10'
                : 'border-paper-300/70 text-ink-faint/40',
            )}
          >
            Sichern
          </button>
        </div>

        {/*
          Wohin der Gedanke faellt.

          Ohne diese Zeile ist er festgehalten und trotzdem verschwunden: Man
          weiss nicht, wo man ihn wiederfindet, und „irgendwo im Buch" ist
          keine Auskunft. Das Kapitel ist verlinkt, damit man einmal hinsieht
          und es danach weiss.
        */}
        <p className="mt-2 font-serif text-[12.5px] italic leading-relaxed text-ink-faint">
          Sichern oder Eingabetaste – nachzulesen unter{' '}
          <Link
            to="/kapitel/notizen"
            onClick={onClose}
            className="text-gild-600 underline decoration-gild-500/40 underline-offset-2"
          >
            Notizen &amp; Sammlungen
          </Link>
          . Was daraus wird, entscheidest du später – oder nie.
        </p>

        {gefangen.length > 0 && (
          <ul className="mt-4 border-t border-paper-300/60 pt-3">
            {gefangen.map((g) => (
              <li key={g.id} className="py-1">
                <Link
                  to={`/eintrag/${g.id}`}
                  onClick={onClose}
                  className="flex items-baseline gap-2 no-tap-highlight"
                >
                  <span aria-hidden className="h-[3px] w-[3px] shrink-0 rounded-full bg-gild-500/70" />
                  <span className="min-w-0 flex-1 truncate font-serif text-[14.5px] text-ink-muted transition-colors hover:text-gild-600">
                    {g.titel}
                  </span>
                </Link>

                {/*
                  Das Angebot, den Gedanken einzuordnen.

                  Es ordnet nichts von selbst ein. Der Grund steht daneben –
                  „wegen ‚wächterin‘" –, damit man sieht, worauf die Vermutung
                  beruht und wann sie danebenliegt. Wer nicht tippt, hat
                  abgelehnt; das ist eine gültige Antwort und kostet nichts.
                */}
                {g.vermutung && (
                  <button
                    type="button"
                    onClick={() => {
                      updateEntry(g.id, {
                        type: g.vermutung!.type,
                        category: '',
                        fields: emptyFields(g.vermutung!.type),
                      });
                      setGefangen((liste) =>
                        liste.map((x) => (x.id === g.id ? { ...x, vermutung: undefined } : x)),
                      );
                    }}
                    className="ml-[11px] mt-0.5 inline-flex min-h-[30px] items-center gap-1.5 font-serif text-[12.5px] italic text-ink-faint transition-colors hover:text-gild-600 no-tap-highlight"
                  >
                    <span className="text-gild-600">
                      Als {templateFor(g.vermutung.type).label} einordnen
                    </span>
                    <span className="text-ink-faint/60">wegen „{g.vermutung.grund}“</span>
                  </button>
                )}
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
