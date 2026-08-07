/**
 * Der Vorderdeckel.
 *
 * Eine Stelle, an der aus Material, Farbe, Zeichen und Titel ein Einband wird
 * – gebraucht an zwei Orten, die nichts voneinander wissen sollen: bei der
 * Erschaffung des Buches und auf dem Umschlag beim Aufschlagen. Waeren es
 * zwei Zeichnungen, saehe das erschaffene Buch anders aus als das, das man
 * spaeter in der Hand haelt, und niemand wuesste sofort, warum.
 *
 * Die Farbe wird nicht ueber die Maserung gemalt, sondern mit ihr verrechnet
 * (`background-blend-mode`). Nur so bleibt die Narbung sichtbar, statt unter
 * einer Farbflaeche zu verschwinden – der Unterschied zwischen einem Einband
 * und einem farbigen Rechteck.
 */

import type { CSSProperties } from 'react';
import type { BookIdentity } from '../../types';
import { colorById, materialById } from '../../lib/bookIdentity';
import { TEXTURES } from '../../lib/textures';
import { BookEmblem } from './BookEmblem';
import { cx } from '../../lib/utils';

/** `#RRGGBB` mit Deckkraft – fuer die Farbschicht ueber der Maserung. */
function withAlpha(hex: string, alpha: number): string {
  const v = hex.replace('#', '');
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Der Lichtabfall: warmes Licht von oben links, Schatten zur unteren Kante. */
const SCHATTEN =
  'linear-gradient(150deg, rgba(30,22,15,0.26) 0%, rgba(20,15,10,0.46) 55%, rgba(14,10,7,0.64) 100%)';

/**
 * Die Oberflaeche eines Einbands.
 *
 * Ein neues Material braucht hier einen Fall – und im Register in
 * `bookIdentity.ts` einen Eintrag. Sonst nichts.
 */
export function coverSurface(identity: Pick<BookIdentity, 'coverMaterial' | 'coverColor'>): CSSProperties {
  const material = materialById(identity.coverMaterial);
  const farbe = colorById(identity.coverColor);
  const ton = withAlpha(farbe.tint, farbe.strength);
  const flaeche = `linear-gradient(${ton}, ${ton})`;

  if (material.weave === 'leinen') {
    /* Gewebe: Schuss und Kette als zwei feine Streifenmuster ueber dem Ton. */
    const schuss = 'repeating-linear-gradient(0deg, rgba(0,0,0,0.20) 0 1px, transparent 1px 3px)';
    const kette = 'repeating-linear-gradient(90deg, rgba(255,255,255,0.09) 0 1px, transparent 1px 3px)';
    return {
      backgroundImage: `${SCHATTEN}, ${schuss}, ${kette}, linear-gradient(${farbe.tint}, ${farbe.tint})`,
      backgroundBlendMode: 'normal, overlay, overlay, normal',
      backgroundSize: 'cover, auto, auto, cover',
    };
  }

  return {
    backgroundImage: `${SCHATTEN}, ${flaeche}, url(${TEXTURES.leather})`,
    backgroundBlendMode: `normal, ${farbe.blend}, normal`,
    backgroundSize: 'cover, cover, cover',
    backgroundPosition: 'center, center, center',
  };
}

/**
 * Was auf dem Deckel steht.
 *
 * Ohne eigenen Hintergrund – den setzt der Aufrufer mit `coverSurface`, weil
 * er beim Aufschlagen zusaetzlich gedreht und abgedunkelt wird.
 */
export function CoverFace({
  identity,
  /** Kleine Darstellung (Miniaturbuecher bei der Materialwahl). */
  klein = false,
  className,
}: {
  identity: BookIdentity;
  klein?: boolean;
  className?: string;
}) {
  const farbe = colorById(identity.coverColor);
  const material = materialById(identity.coverMaterial);

  return (
    <div
      className={cx(
        'flex h-full w-full flex-col items-center justify-between',
        klein ? 'px-2 py-2.5' : 'px-6 py-9 sm:px-8 sm:py-11',
        className,
      )}
    >
      {/* Glanz des Materials – bei Leinen fast nichts, bei Leder speckige Kanten. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[4px]"
        style={{
          background: `radial-gradient(circle at 6% 4%, rgba(255,235,190,${0.18 * material.sheen}) 0%, transparent 18%), radial-gradient(circle at 96% 95%, rgba(255,235,190,${0.14 * material.sheen}) 0%, transparent 16%)`,
        }}
      />
      {/* Die Blindlinie, wie sie in jeden Deckel gepraegt wird */}
      <span
        aria-hidden
        className="pointer-events-none absolute rounded-[2px] border"
        style={{
          inset: klein ? 3 : 10,
          borderColor: withAlpha(farbe.foil, klein ? 0.34 : 0.3),
        }}
      />

      {!klein && (
        <span className="rubric mt-1" style={{ color: withAlpha(farbe.foil, 0.7) }}>
          Artbook
        </span>
      )}

      <BookEmblem
        identity={identity}
        size={klein ? 26 : 130}
        color={farbe.foil}
        embossed
        className="relative"
      />

      <div className="relative text-center">
        {!klein && (
          <>
            <p
              className="font-serif leading-tight tracking-[0.12em]"
              style={{
                color: farbe.foil,
                fontSize: identity.title.length > 22 ? 18 : 24,
                textShadow: '0 1px 3px rgba(0,0,0,0.85), 0 0 18px rgba(212,175,55,0.18)',
              }}
            >
              {identity.title || 'Ohne Titel'}
            </p>
            <span
              aria-hidden
              className="mx-auto mt-2.5 block h-px w-20"
              style={{
                background: `linear-gradient(90deg, transparent, ${withAlpha(farbe.foil, 0.8)}, transparent)`,
              }}
            />
            {identity.subtitle?.trim() && (
              <p
                className="mt-2.5 font-serif text-[12.5px] italic leading-snug"
                style={{ color: withAlpha(farbe.foil, 0.62) }}
              >
                {identity.subtitle}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Ein ganzes geschlossenes Buch: Deckel, Buchblock, Schatten auf dem Tisch.
 *
 * Wird bei der Erschaffung gebraucht, wo das Buch sich unter den Haenden
 * veraendert. Der Umschlag beim Aufschlagen baut sein Buch selbst, weil dort
 * jede Schicht einzeln gedreht werden muss.
 */
export function ClosedBook({
  identity,
  width = 286,
  height = 390,
  className,
}: {
  identity: BookIdentity;
  width?: number;
  height?: number;
  className?: string;
}) {
  const farbe = colorById(identity.coverColor);

  return (
    <div className={cx('relative', className)} style={{ width, height }}>
      {/* Der Buchblock: sichtbare Seitenkanten an der rechten Kante */}
      <div
        aria-hidden
        className="absolute right-0 top-[7px] z-0 h-[calc(100%-14px)] w-[16px] translate-x-[calc(100%-3px)] rounded-r-[2px]"
        style={{
          background:
            'repeating-linear-gradient(90deg, #cbbc9c 0px, #e6dbc0 1.5px, #bfae8c 2.5px, #ddd1b4 4px)',
          boxShadow:
            'inset -8px 0 12px -7px rgba(0,0,0,0.65), inset 0 8px 10px -8px rgba(0,0,0,0.4), inset 0 -8px 10px -8px rgba(0,0,0,0.4)',
        }}
      />

      {/* Das Kapitalband oben am Rücken */}
      <div
        aria-hidden
        className="absolute -top-[3px] left-1 z-20 h-[6px] w-[10px] rounded-t-[2px]"
        style={{ background: farbe.edge }}
      />

      {/* Der Deckel */}
      <div
        className="absolute inset-0 z-10 overflow-hidden rounded-[4px]"
        style={{
          ...coverSurface(identity),
          boxShadow:
            '0 40px 70px -22px rgba(0,0,0,0.9), inset 0 1px 0 rgba(226,196,120,0.20), inset -14px 0 26px -18px rgba(0,0,0,0.8), inset 0 0 70px rgba(0,0,0,0.3)',
          transition: 'background-image 420ms ease',
        }}
      >
        <CoverFace identity={identity} />
      </div>

      {/* Schatten auf dem Tisch */}
      <div
        aria-hidden
        className="absolute -bottom-5 left-1/2 h-8 w-[86%] -translate-x-1/2 rounded-[50%] blur-xl"
        style={{ background: 'rgba(0,0,0,0.6)' }}
      />
    </div>
  );
}
