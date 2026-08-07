/**
 * Die Wahl des Einbands.
 *
 * Keine Farbfelder in einer Einstellungstafel, sondern Proben: kleine
 * Buecher, jedes im jeweiligen Material und in der jeweiligen Farbe. Man
 * waehlt nicht „#2E4032", man waehlt den gruenen Band.
 *
 * Die Proben sind echte Miniaturen desselben Einbands, den man gerade baut –
 * sie benutzen dieselbe `coverSurface`. Waeren es gemalte Vorschaubilder,
 * liefen sie irgendwann auseinander.
 */

import { COVER_COLORS, COVER_MATERIALS } from '../../lib/bookIdentity';
import { BUCH_TEXTE } from '../../lib/bookTexts';
import { coverSurface } from '../../components/book/CoverBoard';
import type { BookIdentity } from '../../types';
import { SzenenFrage, SzenenWeg } from './Geburt';
import { cx } from '../../lib/utils';

const T = BUCH_TEXTE.geburt.einband;

export function Einbandwahl({
  identity,
  onChange,
  onWeiter,
}: {
  identity: BookIdentity;
  onChange: (patch: Partial<BookIdentity>) => void;
  onWeiter: () => void;
}) {
  return (
    <div>
      <SzenenFrage frage={T.frage} hinweis={T.hinweis} />

      <Reihe titel={T.material}>
        {COVER_MATERIALS.map((m) => (
          <Probe
            key={m.id}
            gewaehlt={identity.coverMaterial === m.id}
            label={m.label}
            onClick={() => onChange({ coverMaterial: m.id })}
            style={coverSurface({ coverMaterial: m.id, coverColor: identity.coverColor })}
          />
        ))}
      </Reihe>

      <Reihe titel={T.farbe}>
        {COVER_COLORS.map((c) => (
          <Probe
            key={c.id}
            gewaehlt={identity.coverColor === c.id}
            label={c.label}
            onClick={() => onChange({ coverColor: c.id })}
            style={coverSurface({ coverMaterial: identity.coverMaterial, coverColor: c.id })}
          />
        ))}
      </Reihe>

      <SzenenWeg onWeiter={onWeiter} />
    </div>
  );
}

function Reihe({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <p className="mb-3 text-center text-[11px] uppercase tracking-[0.24em] text-paper-400/40">
        {titel}
      </p>
      {/*
       * Waagerecht scrollbar, wenn der Platz nicht reicht – aber ohne die
       * Seite mitzunehmen (`overscroll-x-contain`). Auf einem Telefon liegen
       * sechs Farben sonst entweder zu eng oder in zwei Reihen.
       */}
      <div className="flex flex-wrap justify-center gap-3 overflow-x-auto overscroll-x-contain pb-1">
        {children}
      </div>
    </section>
  );
}

/**
 * Eine Probe: ein Miniaturbuch.
 *
 * 56 × 76 Pixel – klein genug, dass sechs davon nebeneinanderpassen, gross
 * genug als Trefferflaeche fuer einen Daumen.
 */
function Probe({
  gewaehlt,
  label,
  onClick,
  style,
}: {
  gewaehlt: boolean;
  label: string;
  onClick: () => void;
  style: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={gewaehlt}
      className="group flex shrink-0 flex-col items-center gap-1.5 no-tap-highlight"
    >
      <span
        className={cx(
          'relative block h-[76px] w-[56px] rounded-[3px] transition-all duration-300',
          gewaehlt ? 'scale-[1.06]' : 'opacity-80 group-hover:opacity-100',
        )}
        style={{
          ...style,
          boxShadow: gewaehlt
            ? '0 0 0 1px rgba(212,175,55,0.75), 0 14px 24px -12px rgba(0,0,0,0.9)'
            : '0 10px 20px -14px rgba(0,0,0,0.9)',
        }}
      >
        {/* Die Buchkante rechts – erst dadurch wird aus dem Feld ein Buch. */}
        <span
          aria-hidden
          className="absolute right-0 top-[3px] block h-[calc(100%-6px)] w-[4px] translate-x-full rounded-r-[2px]"
          style={{
            background:
              'repeating-linear-gradient(90deg, #cbbc9c 0px, #e6dbc0 1px, #bfae8c 1.6px, #ddd1b4 2.6px)',
          }}
        />
      </span>
      <span
        className={cx(
          'max-w-[74px] text-center font-serif text-[11.5px] leading-tight transition-colors',
          gewaehlt ? 'text-gild-300' : 'text-paper-400/50',
        )}
      >
        {label}
      </span>
    </button>
  );
}
