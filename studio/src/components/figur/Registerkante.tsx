/**
 * Die Registerkante – das Daumenregister an der Aussenkante rechts.
 *
 * Warum es kein zweites Menü ist und wie es sich den Rand mit der Geste
 * teilt, steht in `Register.ts`. Hier steht nur, wie es aussieht.
 *
 * ---
 *
 * **Was ein Reiter nicht haben darf: `data-raum="aus"`.**
 *
 * Die Versuchung wäre, die Kante als Arbeitsfläche zu kennzeichnen, damit
 * sie „ihre" Fläche bekommt. Genau das würde den Randstreifen schließen –
 * derselbe Fehler wie einst bei der Weltkarte, wo `data-raum="aus"` auf einem
 * Telefon jeden Weg nach außen zumauerte. Die Reiter sind Knöpfe und sonst
 * nichts: Ein Tipp gehört ihnen, ein Zug gehört dem Raum.
 */

import { zeichenFuer } from '../../lib/zeichen/zeichen';
import { DRACHE_MINDESTGROESSE, Drachenmarke } from '../../lib/zeichen/embleme';
import { REGISTERBLAETTER, type Blattfuellung } from './Register';
import { cx } from '../../lib/utils';

export function Registerkante({
  offen,
  waehle,
  fuellung,
  breite,
}: {
  offen: string;
  waehle: (id: string) => void;
  fuellung: Blattfuellung;
  /** Wie breit die Kante ist – aus dem Stimmzimmer. */
  breite: number;
}) {
  /*
   * Wie groß die Marke sein darf: so breit wie die Kante minus etwas Luft –
   * und gar nicht, wenn das unter die Mindestgröße fällt.
   */
  const marke = breite - 12 >= DRACHE_MINDESTGROESSE ? Math.min(breite - 12, 38) : 0;

  return (
    <nav
      className="dc-registerkante relative z-20 flex shrink-0 flex-col justify-center gap-1 overflow-hidden py-3"
      style={{
        width: `${breite}px`,
        /*
         * Leder, und zwar in Schichten.
         *
         * Ein einfarbiger dunkler Streifen wäre eine Leiste. Der schmale
         * Lichtverlauf zur Innenkante hin und die Goldlinie an der Naht
         * machen daraus eine Kante, die eine Dicke hat – dasselbe Mittel wie
         * beim Buchkörper.
         */
        /*
         * Der Verlauf laeuft von der Buchseite weg nach aussen, und die
         * Goldnaht sitzt an der **Innenkante** – dort, wo das Leder an die
         * Seite stoesst. Als das Register links lag, war das die rechte
         * Kante; seit es rechts liegt, die linke. Eine Naht auf der falschen
         * Seite laesst die Leiste vor der Seite schweben, statt neben ihr zu
         * liegen.
         */
        background:
          'linear-gradient(to left, #0b0908 0%, #16120f 62%, #1d1814 100%)',
        boxShadow: 'inset 1px 0 0 rgba(184,134,11,0.16)',
      }}
      aria-label="Register"
    >
      {/*
        Die Marke oben.

        Sie ist so groß, wie sie sein muss, und nicht so groß, wie Platz ist –
        unter `DRACHE_MINDESTGROESSE` wird aus der Windung ein Fleck. Passt sie
        nicht in die eingestellte Kantenbreite, bleibt sie lieber ganz weg: Ein
        Wappen, das man nicht erkennt, sieht nach Druckfehler aus.
      */}
      {marke > 0 && (
        <div className="mb-1 flex shrink-0 justify-center text-gild-500/45" aria-hidden>
          <Drachenmarke groesse={marke} />
        </div>
      )}

      {REGISTERBLAETTER.map((b) => {
        const Z = zeichenFuer(b.zeichen);
        const aktiv = b.id === offen;
        const still = fuellung[b.id] === false;
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => waehle(b.id)}
            aria-current={aktiv ? 'page' : undefined}
            data-register={b.id}
            className={cx(
              /*
               * `flex-none` mit fester Hoehe, nicht `flex-1`.
               *
               * Mit `flex-1` verteilten sich sieben Reiter ueber 844 Punkte –
               * hundertzwanzig Punkte pro Reiter, mit Luft dazwischen, die
               * nach nichts aussah. Ein Daumenregister ist ein *Stapel*: Die
               * Reiter liegen dicht beieinander, und der Rest der Kante ist
               * Leder. Genau so steht es auch im Referenzbild.
               */
              'group relative flex h-[62px] w-full flex-none flex-col items-center justify-center gap-1 px-0.5 no-tap-highlight',
              'transition-colors duration-200',
              /*
               * Drei Helligkeiten, und alle drei muessen lesbar bleiben.
               *
               * Gemessen standen die ruhenden Reiter bei 2,6:1 und die stillen
               * bei 1,6:1 – bei sechseinhalb Punkt Schriftgroesse. Ein Reiter,
               * den man antippen soll, dessen Namen man aber raten muss, ist
               * kein Register, sondern eine Zierleiste. Der Abstand zwischen
               * den Stufen bleibt derselbe, sie liegen nur alle drei hoeher:
               * **Still heisst leiser, nicht unsichtbar.**
               */
              aktiv ? 'text-gild-300' : still ? 'text-paper-400/45' : 'text-paper-300/75',
            )}
          >
            {/*
              Der aufgeschlagene Reiter ist heller und tritt nach innen vor –
              wie ein Registerblatt, das man zwischen die Seiten geschoben hat.
            */}
            {aktiv && (
              <span
                className="pointer-events-none absolute inset-y-[3px] left-0 right-[3px] rounded-r-[2px]"
                style={{
                  background:
                    'linear-gradient(to left, rgba(212,175,55,0.10) 0%, rgba(212,175,55,0.05) 55%, rgba(212,175,55,0) 100%)',
                  boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.18)',
                }}
                aria-hidden
              />
            )}
            {Z && <Z groesse={16} className="relative" />}
            {/*
              Die Beschriftung muss umbrechen duerfen.
              
              Beim ersten Bau stand hier eine Sperrschrift ohne Umbruch, und
              „VERGANGENHEIT" ragte einfach ueber die Kante hinaus auf die
              Seite – ein Wort, das quer durch das Bildnis lief. Sperrsatz
              macht lange Woerter noch laenger, und ein einzelnes Wort bricht
              von selbst nirgends um.
              
              Also: engerer Sperrsatz, Umbruch erlaubt, und in `Register.ts`
              stehen weiche Trennstriche in den langen Namen. Was dann immer
              noch nicht passt, wird abgeschnitten statt hinauszuragen.
            */}
            <span
              className="relative w-full overflow-hidden text-center font-serif text-[6.5px] uppercase leading-[1.15]"
              style={{ letterSpacing: '0.06em', hyphens: 'auto', overflowWrap: 'anywhere' }}
              lang="de"
            >
              {b.name}
            </span>
          </button>
        );
      })}

      {/* Und dieselbe Marke unten, gespiegelt – wie zwei Prägungen an einem Band. */}
      {marke > 0 && (
        <div className="mt-1 flex shrink-0 justify-center text-gild-500/45" aria-hidden>
          <Drachenmarke groesse={marke} className="-scale-y-100" />
        </div>
      )}
    </nav>
  );
}
