/**
 * „Was soll daraus werden?"
 *
 * Hier standen siebenundzwanzig Knöpfe. Auf einem Telefon war das eine Wand,
 * durch die man scrollt, statt einer Auswahl, die man trifft – und in fast
 * allen Fällen völlig umsonst, weil `guessType()` die Art ohnehin richtig
 * erkennt.
 *
 * Jetzt steht eine Fläche da: die vorgeschlagene Art, ein Satz dazu, und der
 * eine Handgriff, der weiterführt. Wer anders will, findet den zweiten Weg
 * darunter – leiser gesetzt, weil er der seltenere ist.
 */

import { ArrowRight, ChevronRight } from 'lucide-react';
import { templateFor } from '../../lib/templates';
import { cx } from '../../lib/utils';

export function TypVorschlag({
  type,
  onSetzen,
  onAndersSetzen,
  /** Hat der Verfasser die Art selbst gewählt? Dann ist es kein Vorschlag mehr. */
  gewaehlt,
}: {
  type: string;
  onSetzen: () => void;
  onAndersSetzen: () => void;
  gewaehlt: boolean;
}) {
  const tpl = templateFor(type);

  return (
    <section className="mt-10">
      <h2 className="font-serif text-[22px] leading-tight text-ink">Was soll daraus werden?</h2>
      <p className="mt-1.5 font-serif text-[14.5px] italic leading-relaxed text-ink-muted">
        {gewaehlt
          ? 'Du hast die Art selbst gewählt.'
          : 'Dragoncore hat einen passenden Vorschlag.'}
      </p>

      {/*
        Die Vorschlagsfläche.

        Sie ist gross und ruhig, und sie ist der einzige Ort auf dieser Seite,
        an dem Gold flächig auftritt – weil sie die eine Handlung trägt, die
        weiterführt. Kein Kasten mit Schatten: eine Goldlinie ringsum und ein
        sehr dünner warmer Grund, so wie eine Prägung im Papier.
      */}
      <button
        type="button"
        onClick={onSetzen}
        data-leitfaden="setzerei-so-setzen"
        className={cx(
          'mt-5 flex w-full items-center gap-4 rounded-[3px] border border-gild-500/45 bg-gild-400/[0.07]',
          'px-5 py-5 text-left transition-colors duration-300 hover:bg-gild-400/[0.13] no-tap-highlight',
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[26px] leading-tight text-ink">{tpl.label}</span>
          <span className="mt-1 block font-serif text-[14px] italic leading-relaxed text-ink-muted">
            scheint zu diesem Manuskript zu passen.
          </span>
          <span className="mt-3 inline-flex items-center gap-1.5 font-serif text-[15px] text-gold">
            So setzen <ArrowRight size={14} />
          </span>
        </span>
      </button>

      {/*
        Der zweite Weg – leiser, aber nicht versteckt.

        Ein Verweis und keine Fläche: Wer die Art wechseln will, weiss das
        schon, wenn er hierherkommt; er braucht keine Einladung, nur eine Tür.
      */}
      <button
        type="button"
        onClick={onAndersSetzen}
        className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 font-serif text-[15px] italic text-ink-muted transition-colors duration-200 hover:text-gold no-tap-highlight"
      >
        Anders setzen …
        <ChevronRight size={14} />
      </button>
    </section>
  );
}
