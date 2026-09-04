/**
 * Ein Abschnitt der werdenden Seite.
 *
 * Kein Kasten, keine Karte, kein Rahmen: eine Überschrift, eine Haarlinie,
 * und darunter die Felder. Was ihn zusammenhält, ist der Abstand.
 *
 * ---
 *
 * **Die Regel für leere Felder.**
 *
 * Gefüllte Felder stehen als gesetzter Text da. Leere stehen **nicht**
 * daneben – sonst wäre jeder Abschnitt wieder halb Formular. Sie liegen
 * hinter einer einzigen ruhigen Zeile: „Drei weitere Angaben ergänzen".
 *
 * Das ist der Unterschied zwischen einer Seite, die zeigt, was da ist, und
 * einer Maske, die zeigt, was fehlt. Beides ist dieselbe Auskunft; nur die
 * erste liest sich wie ein Buch.
 */

import { useState } from 'react';
import type { Entry, FieldValue } from '../../types';
import type { FieldDef } from '../../lib/templates';
import { SetzFeld, hatWert } from './SetzFeld';
import { Rubrik } from './Setzerei';
import { cx } from '../../lib/utils';

export function SetzAbschnitt({
  titel,
  felder,
  wertVon,
  onChange,
  offenesFeld,
  onOeffnen,
  onSchliessen,
  entries,
  /**
   * Der Typ, zu dem diese Felder gehören.
   *
   * Er wird nur weitergereicht – gebraucht wird er in `SetzFeld` für die
   * wiederkehrenden Werte. Dass er hier durchmuss, ist der ganze Punkt: Es
   * gibt **zwei** Stellen, die `SetzFeld` anstreichen, und wer nur eine
   * bedient, baut ein Merkmal, das auf der Hälfte der Felder fehlt.
   */
  type,
  weltbezuege,
  onWeltbezug,
  /** Der erste Abschnitt braucht keine Linie über sich. */
  erster,
}: {
  titel: string;
  felder: FieldDef[];
  wertVon: (key: string) => FieldValue | undefined;
  onChange: (key: string, v: FieldValue) => void;
  offenesFeld: string | null;
  onOeffnen: (key: string) => void;
  onSchliessen: () => void;
  entries: Entry[];
  type: string;
  weltbezuege: Record<string, string>;
  onWeltbezug: (def: FieldDef) => void;
  erster?: boolean;
}) {
  const [zeigeLeere, setZeigeLeere] = useState(false);

  const voll = felder.filter((f) => hatWert(wertVon(f.key)));
  const leer = felder.filter((f) => !hatWert(wertVon(f.key)));
  /* Ein offenes leeres Feld muss sichtbar bleiben, auch wenn zugeklappt ist. */
  const sichtbarLeer = zeigeLeere ? leer : leer.filter((f) => f.key === offenesFeld);

  if (!voll.length && !leer.length) return null;

  return (
    <section className={cx('mt-9', erster && 'mt-7')}>
      {!erster && (
        <span aria-hidden className="mb-5 block h-px bg-current opacity-[0.12]" />
      )}
      {titel && <Rubrik className="mb-3 text-gold">{titel}</Rubrik>}

      <div className="space-y-5">
        {voll.map((def) => (
          <SetzFeld
            key={def.key}
            def={def}
            wert={wertVon(def.key)}
            onChange={(v) => onChange(def.key, v)}
            offen={offenesFeld === def.key}
            onOeffnen={() => onOeffnen(def.key)}
            onSchliessen={onSchliessen}
            entries={entries}
            type={type}
            weltbezug={entries.find((e) => e.id === weltbezuege[def.key])}
            onWeltbezug={onWeltbezug}
          />
        ))}

        {sichtbarLeer.map((def) => (
          <SetzFeld
            key={def.key}
            def={def}
            wert={wertVon(def.key)}
            onChange={(v) => onChange(def.key, v)}
            offen={offenesFeld === def.key}
            onOeffnen={() => onOeffnen(def.key)}
            onSchliessen={onSchliessen}
            entries={entries}
            type={type}
            weltbezug={entries.find((e) => e.id === weltbezuege[def.key])}
            onWeltbezug={onWeltbezug}
          />
        ))}
      </div>

      {leer.length > 0 && !zeigeLeere && (
        <button
          type="button"
          onClick={() => setZeigeLeere(true)}
          className="mt-4 inline-flex min-h-[38px] items-center font-serif text-[13.5px] italic text-ink-faint transition-colors duration-200 hover:text-gold no-tap-highlight"
        >
          {leer.length === 1
            ? 'Eine weitere Angabe ergänzen'
            : `${leer.length} weitere Angaben ergänzen`}
        </button>
      )}
      {zeigeLeere && leer.length > 0 && (
        <button
          type="button"
          onClick={() => setZeigeLeere(false)}
          className="mt-4 inline-flex min-h-[38px] items-center font-serif text-[13.5px] italic text-ink-faint transition-colors duration-200 hover:text-gold no-tap-highlight"
        >
          Wieder zuklappen
        </button>
      )}
    </section>
  );
}
