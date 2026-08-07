/**
 * Das Zeichen des Buches – überall dasselbe.
 *
 * Bewusst eine eigene Komponente und nicht ein Bild im Einband: Das Zeichen
 * ist eine Identität, kein Deckblattschmuck. Es wird noch an Stellen stehen,
 * die es heute nicht gibt – Kapitelmarken, Siegel auf geteilten Fragmenten,
 * Ausgaben als PDF. Wer es dort braucht, nimmt diese Komponente und muss
 * nicht wissen, ob dahinter eine Zeichnung oder eine hochgeladene Datei liegt.
 *
 * Die Farbe kommt von aussen (`color`), damit dasselbe Zeichen auf dem
 * Einband in Messing und auf der Besitzseite in Tinte stehen kann.
 */

import type { BookIdentity } from '../../types';
import { emblemById } from '../../lib/emblems';
import { useImageUrl } from '../images/Thumb';

export function BookEmblem({
  identity,
  size = 120,
  color = 'currentColor',
  /** Prägung: ein feiner Schatten nach unten, ein Lichtsaum nach oben. */
  embossed = false,
  className,
}: {
  identity: Pick<
    BookIdentity,
    'emblemType' | 'emblemId' | 'emblemImageId' | 'emblemScale' | 'emblemRotation'
  >;
  size?: number;
  color?: string;
  embossed?: boolean;
  className?: string;
}) {
  /*
   * Der Haken darf nicht bedingt aufgerufen werden, also holen wir die Adresse
   * immer – bei einem gezeichneten Zeichen ist sie schlicht undefiniert.
   */
  const url = useImageUrl(
    identity.emblemType === 'preset' ? undefined : identity.emblemImageId,
    'full',
  );

  /*
   * Praegung, kein Leuchten.
   *
   * Ein Schatten nach unten, ein feiner Lichtsaum nach oben – so sieht Metall
   * aus, das in Leder gedrueckt wurde. Der weite Goldschein, den diese Stelle
   * frueher hatte, war fuer das gerasterte Wappen gemacht; unter einer
   * Strichzeichnung wird daraus Neon, und genau das soll ein Artbook nicht
   * sein.
   */
  const praegung = embossed
    ? {
        filter:
          'drop-shadow(0 1.5px 2px rgba(0,0,0,0.8)) drop-shadow(0 -1px 0 rgba(240,215,150,0.22)) drop-shadow(0 0 9px rgba(212,175,55,0.10))',
      }
    : undefined;

  if (identity.emblemType !== 'preset') {
    if (!url) {
      /* Platzhalter in der Grösse des Zeichens – kein Springen beim Laden. */
      return <span aria-hidden className={className} style={{ width: size, height: size }} />;
    }
    return (
      <span
        aria-hidden
        className={className}
        style={{
          width: size,
          height: size,
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
          ...praegung,
        }}
      >
        <img
          src={url}
          alt=""
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            transform: `scale(${identity.emblemScale ?? 1}) rotate(${identity.emblemRotation ?? 0}deg)`,
            transition: 'transform 220ms cubic-bezier(0.22,0.61,0.36,1)',
          }}
        />
      </span>
    );
  }

  const preset = emblemById(identity.emblemId);
  if (!preset) return <span aria-hidden className={className} style={{ width: size, height: size }} />;

  /*
   * Ein mitgeliefertes Bild statt einer Zeichnung. Es nimmt die Farbe nicht an
   * – es bringt seine eigene mit, und das ist bei einem Wappen richtig so.
   */
  if (preset.src) {
    return (
      <img
        aria-hidden
        alt=""
        src={preset.src}
        className={className}
        style={{ width: size, height: size, objectFit: 'contain', ...praegung }}
      />
    );
  }

  return (
    <svg
      aria-hidden
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke={color}
      /*
       * Die Strichstärke wächst nicht mit der Grösse: Ein Siegel bleibt fein,
       * auch wenn es gross steht. `vectorEffect` hielte sie konstant in Pixeln
       * – hier ist das Gegenteil richtig, die Zeichnung soll skalieren.
       */
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      /*
       * `color` zusaetzlich zu `stroke`: Zeichen, die als Flaeche gezeichnet
       * sind, fuellen mit `currentColor`. Ohne diese Zeile erbten sie die
       * Textfarbe der Umgebung statt der Farbe der Praegung – auf dem Einband
       * waere der Drache dann nicht messingfarben, sondern papierfarben.
       */
      style={{ color, ...praegung }}
    >
      {preset.draw}
    </svg>
  );
}
