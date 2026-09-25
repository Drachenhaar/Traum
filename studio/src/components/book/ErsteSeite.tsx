/**
 * Die erste Seite – ein Feld im leeren Buch.
 *
 * ---
 *
 * **Was hier vorher stand.**
 *
 * Ein leeres Buch begrüsste seinen Leser mit fünfzehn Kapitelnamen unter der
 * Rubrik „Noch ungeschrieben": Naturgesetze, Essenz der Welt, Die lebendige
 * Welt, Natur, Tiere, Bewohner, Stimmen, Artefakte, Architektur & Gebautes,
 * Materialien, Kräfte, Geschichten, Die Zeitalter, Die Werkstatt, Notizen &
 * Sammlungen.
 *
 * Die Absicht dahinter war gut und steht im Quelltext: *„Ohne diese Zeilen
 * könnte niemand entdecken, dass es sie geben könnte… als Einladung, nicht
 * als Mangel."* Im **gefüllten** Buch stimmt das auch. Im leeren kippt es:
 * Fünfzehn leere Fächer sind keine Einladung mehr, sondern eine Wand. Gesetz
 * 3 ist dabei buchstäblich gewahrt — nichts zählt, nichts mahnt — und die
 * Wirkung auf einen Menschen ist trotzdem genau die, gegen die das Gesetz
 * geschrieben wurde.
 *
 * ---
 *
 * **Warum ein Feld und nicht ein Verweis.**
 *
 * Das Buch kennt diese Frage längst, und sie ist gut: „Was existiert in
 * deiner Welt zuerst?" – ein Feld, die Eingabetaste, fertig
 * (`pages/onboarding/ErsterSchritt.tsx`). Sie erscheint **genau einmal im
 * Leben**, direkt nach dem Binden des Buches. Wer sie übersprungen hat, wer
 * sein Buch geleert hat oder wer einen zweiten Band anlegt, bekommt sie nie
 * wieder – der steht vor den fünfzehn Fächern.
 *
 * Ein Verweis auf eine andere Seite wäre hier die falsche Antwort gewesen.
 * Die naheliegenden Ziele taugen beide nicht: Die Setzerei will ein fertiges
 * Manuskript („Man legt ein geschriebenes Blatt ein"), und der Gedankenfang
 * hängt in der Buchhülle, die es nur in einem der drei Arbeitsräume gibt.
 * Beides verlangt einen Weg, bevor irgendetwas geschrieben ist.
 *
 * Die fünf Anfänge kommen aus `ErsterSchritt`, nicht aus einer zweiten Liste
 * – Gesetz 5.
 *
 * ---
 *
 * **Was hier bewusst fehlt.** Kein Fortschritt, keine Zahl, kein „0 von 15",
 * keine Aufforderung. Eine Frage und ein Feld.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EntryType } from '../../types';
import { useStudio } from '../../store/useStudio';
import { ANFAENGE } from '../../pages/onboarding/ErsterSchritt';
import { cx } from '../../lib/utils';

export function ErsteSeite() {
  const createEntry = useStudio((s) => s.createEntry);
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  /*
   * **Kein Fokus von selbst.**
   *
   * Anders als bei der Frage nach der Erschaffung, die allein auf ihrem
   * Bildschirm steht: Hier ist eine Buchseite, und auf dem Telefon risse die
   * Tastatur sofort die halbe Seite an sich – samt der Zeile darüber, die
   * gerade erklärt, worum es geht.
   */

  const fertig = text.trim().length > 0;

  const anlegen = (type: EntryType) => {
    if (!fertig || busy) return;
    setBusy(true);
    void createEntry(type, { title: text.trim() })
      .then((entry) => {
        /* Auf die eben entstandene Seite. Wer etwas erschaffen hat, will es
           sehen, nicht suchen – derselbe Griff wie in der Erschaffung. */
        navigate(`/eintrag/${entry.id}`);
      })
      .catch(() => setBusy(false));
  };

  return (
    <section className="mt-8">
      <label
        htmlFor="erste-seite"
        className="block font-serif text-[17px] leading-snug text-ink"
      >
        Was existiert in deiner Welt zuerst?
      </label>

      <input
        id="erste-seite"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          /* Die Eingabetaste genügt. Die Art lässt sich danach noch ändern –
             deshalb ist „page" hier kein Raten, sondern die Seite ohne
             Anspruch, dieselbe wie im Gedankenfang. */
          if (e.key === 'Enter' && fertig) anlegen('page');
        }}
        placeholder="Ein Ort, eine Figur, ein Gedanke …"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="done"
        className="mt-4 w-full border-0 border-b border-gild-600/30 bg-transparent px-1 pb-2 font-serif text-[18px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-gild-600/70"
      />

      {/*
       * Fächert erst auf, wenn etwas dasteht. Fünf Knöpfe vor dem ersten Wort
       * wären eine Entscheidung über etwas, das es noch nicht gibt – und
       * genau die Wand, die hier gerade weggeräumt wurde.
       *
       * `aria-hidden`, solange es sie nicht gibt: Sonst kündigt ein
       * Vorleseprogramm fünf Knöpfe an, die niemand drücken kann.
       */}
      <div
        aria-hidden={!fertig}
        className={cx(
          'transition-all duration-500',
          fertig ? 'mt-5 opacity-100' : 'pointer-events-none mt-1 opacity-0',
        )}
      >
        <p className="rubric mb-2">Als was?</p>
        <div className="flex flex-wrap gap-2">
          {ANFAENGE.map((a) => (
            <button
              key={a.type}
              type="button"
              onClick={() => anlegen(a.type)}
              disabled={!fertig || busy}
              className="min-h-[40px] rounded-full border border-lineStrong px-4 font-serif text-[14.5px] text-ink-muted transition-colors hover:border-gild-600/50 hover:text-gold no-tap-highlight"
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
