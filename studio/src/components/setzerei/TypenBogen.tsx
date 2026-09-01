/**
 * Der Typenbogen – alle Arten, die dieses Buch kennt.
 *
 * Er ist eine Fläche, die aufgeht, und keine Liste, die die Seite verlängert.
 * Der Unterschied ist auf einem Telefon der ganze Unterschied: Untereinander
 * gerendert schoben zweiunddreissig Arten das Manuskript aus dem Blick, und
 * man scrollte durch eine Wand, um eine einzige Entscheidung zu treffen, die
 * man in neun von zehn Fällen gar nicht treffen wollte.
 *
 * `Modal` ist auf dem Telefon ein von unten aufsteigendes Blatt und am
 * Schreibtisch ein Dialog – gebaut, geprüft, überall im Buch im Einsatz. Ein
 * zweites Sheet danebenzustellen wäre ein zweiter Ort für dieselbe Bewegung.
 *
 * Die Familien und Arten kommen unverändert aus `templatesByFamily()`. Keine
 * Zeile davon steht hier ein zweites Mal.
 */

import { Check } from 'lucide-react';
import { templatesByFamily } from '../../lib/templates';
import { Modal } from '../ui/Modal';
import { Haarlinie, Rubrik } from './Setzerei';
import { cx } from '../../lib/utils';

export function TypenBogen({
  offen,
  onClose,
  gewaehlt,
  onWaehlen,
  /** Was die Erkennung vorschlägt – bekommt eine leise Auszeichnung. */
  vorschlag,
}: {
  offen: boolean;
  onClose: () => void;
  gewaehlt: string;
  onWaehlen: (type: string) => void;
  vorschlag?: string;
}) {
  if (!offen) return null;
  const familien = templatesByFamily();

  return (
    <Modal open onClose={onClose} title="Anders setzen" size="lg">
      <p className="mb-5 font-serif text-[14.5px] italic leading-relaxed text-ink-muted">
        Als was soll dieses Manuskript ins Buch kommen?
      </p>

      {familien.map((familie, i) => (
        <section key={familie.family}>
          {i > 0 && <Haarlinie className="text-ink" />}
          <Rubrik className="mb-2.5 text-gold">{familie.label}</Rubrik>
          <div className="flex flex-wrap gap-1.5">
            {familie.items.map((item) => {
              const an = gewaehlt === item.type;
              const geraten = !gewaehlt && vorschlag === item.type;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => {
                    onWaehlen(item.type);
                    /* Nach der Wahl schliesst sich der Bogen wieder. */
                    onClose();
                  }}
                  aria-pressed={an}
                  className={cx(
                    'inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5',
                    'font-serif text-[14.5px] transition-colors duration-200 no-tap-highlight',
                    an
                      ? 'border-gild-500/70 bg-gild-400/15 text-ink'
                      : geraten
                        ? 'border-gild-500/35 text-ink'
                        : 'border-lineStrong/70 text-ink-muted hover:border-gild-500/40 hover:text-ink',
                  )}
                >
                  {an && <Check size={13} className="text-gold" />}
                  {item.label}
                  {/*
                    Der Vorschlag bleibt kenntlich, auch wenn man den Bogen
                    öffnet. Ohne diese Zeile stünde die erkannte Art zwischen
                    einunddreissig anderen, und man müsste sich erinnern,
                    welche es war.
                  */}
                  {geraten && (
                    <span className="font-serif text-[11.5px] italic text-ink-faint">erkannt</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </Modal>
  );
}
