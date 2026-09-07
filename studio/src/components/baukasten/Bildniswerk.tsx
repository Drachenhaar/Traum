/**
 * Das gebaute Bildnis.
 *
 * Nimmt einen Bildbau und einen Vorrat und stapelt, was dabei herauskommt.
 * Die Reihenfolge kommt aus `lib/baukasten.ts` und nicht von hier – diese
 * Datei entscheidet nichts, sie zeichnet nur.
 *
 * ---
 *
 * **Wie eingefärbt wird, und warum nicht mit einem Filter.**
 *
 * Naheliegend wäre `filter: hue-rotate(...)`. Das geht bei gesättigten
 * Farben schief und bei Grau gar nicht: Grau hat keinen Farbton, den man
 * drehen könnte, und genau in Grau sind tönbare Teile gezeichnet.
 *
 * Stattdessen wird die Zeichnung als **Maske** benutzt: Die Fläche bekommt
 * die Farbe, und das Bild sagt nur, wo Farbe steht und wo nicht. Damit
 * ergibt jede Zeichnung jede Farbe, und zwar die richtige – nicht eine
 * verschobene.
 *
 * Der Preis: Was in der Zeichnung hell ist, wird durchsichtig. Deshalb
 * gehören tönbare Teile in einem Ton gezeichnet, und deshalb sagt das Teil
 * selbst, ob es tönbar ist.
 */

import { useEffect, useState } from 'react';
import { getImageUrl } from '../../lib/images';
import { anweisung, zeichenfolge, type Bildbau, type Teil } from '../../lib/baukasten';
import { grundformPfad, FELD } from './Grundformen';
import { cx } from '../../lib/utils';

/**
 * Die Adressen der gebrauchten Bilder.
 *
 * Gesammelt für den ganzen Stapel auf einmal und nicht je Schicht: Sonst
 * lädt jede Schicht für sich, und der Stapel baut sich vor den Augen
 * zusammen. Erst wenn alles da ist, steht das Bildnis.
 */
function useBildadressen(ids: string[]): Map<string, string> | null {
  const schluessel = ids.join('|');
  const [adressen, setAdressen] = useState<Map<string, string> | null>(null);

  useEffect(() => {
    let gilt = true;
    if (ids.length === 0) {
      setAdressen(new Map());
      return;
    }
    void Promise.all(ids.map(async (id) => [id, await getImageUrl(id, 'full')] as const)).then(
      (paare) => {
        if (!gilt) return;
        setAdressen(new Map(paare.filter((p): p is [string, string] => p[1] !== null)));
      },
    );
    return () => {
      gilt = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel]);

  return adressen;
}

export function Bildniswerk({
  bau,
  vorrat,
  className,
}: {
  bau: Bildbau;
  vorrat: readonly Teil[];
  className?: string;
}) {
  const folge = zeichenfolge(bau, vorrat);
  const bildIds = folge
    .map((g) => (g.teil.quelle.art === 'bild' ? g.teil.quelle.bildId : null))
    .filter((id): id is string => id !== null);
  const adressen = useBildadressen(bildIds);

  return (
    /*
     * Quadratisch, aber ohne eigene Breite.
     *
     * Die Breite gibt an, wer es einsetzt: Im Baukasten füllt es die Spalte
     * (`w-full`), im Rahmen der Figurenseite die Höhe (`h-full`). Stünde hier
     * `w-full`, müsste die Figurenseite es mit `!w-auto` wieder aufheben – und
     * ein Ausrufezeichen im Klassennamen ist immer das Eingeständnis, dass an
     * dieser Stelle jemand etwas Falsches vorgegeben hat.
     */
    <div className={cx('relative aspect-square overflow-hidden', className)}>
      {folge.map((g) => {
        const a = anweisung(g.teil, g.lage);
        /*
         * Versatz in Prozent, Grösse als Faktor, Spiegelung als Skalierung.
         * Alles in einem `transform` – drei Angaben, ein Rechenschritt.
         */
        const stil: React.CSSProperties = {
          transform: `translate(${a.versatzX}%, ${a.versatzY}%) scale(${a.spiegel ? -a.groesse : a.groesse}, ${a.groesse})`,
        };

        if (g.teil.quelle.art === 'grundform') {
          return (
            <svg
              key={g.schicht.name}
              viewBox={`0 0 ${FELD} ${FELD}`}
              className="absolute inset-0 h-full w-full"
              style={stil}
              aria-hidden
            >
              <path d={grundformPfad(g.teil.quelle.form)} fill={a.farbe ?? 'currentColor'} />
            </svg>
          );
        }

        const adresse = adressen?.get(g.teil.quelle.bildId);
        if (!adresse) return null;

        /*
         * Eingefärbt: die Zeichnung als Maske vor einer farbigen Fläche.
         * Ungefärbt: schlicht das Bild.
         */
        return a.farbe ? (
          <div
            key={g.schicht.name}
            aria-hidden
            className="absolute inset-0"
            style={{
              ...stil,
              backgroundColor: a.farbe,
              maskImage: `url(${adresse})`,
              WebkitMaskImage: `url(${adresse})`,
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskPosition: 'center',
            }}
          />
        ) : (
          <img
            key={g.schicht.name}
            src={adresse}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-contain"
            style={stil}
          />
        );
      })}
    </div>
  );
}
