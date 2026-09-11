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
 * ---
 *
 * **Linie und Fläche – der Unterschied zwischen Spielgrafik und Artbook.**
 *
 * Der Preis der Maske: Was in der Zeichnung hell ist, wird durchsichtig. Eine
 * Frisur mit Strichen und Schraffur wird dabei zu einem Fleck.
 *
 * Deshalb trägt ein Teil zwei Bilder. Die **Fläche** wird eingefärbt – flach,
 * ohne Binnenzeichnung. Die **Linie** liegt darüber, unverändert, in ihrer
 * eigenen Tusche. Beide in derselben Lage, mit demselben Versatz, derselben
 * Grösse, derselben Spiegelung: Sie sind eine Zeichnung, die nur in zwei
 * Dateien liegt, und dürfen nie auseinanderlaufen.
 *
 * Ein Teil ohne Linie bleibt gültig und wird gezeichnet wie bisher.
 *
 * ---
 *
 * **Die zwei Felder.**
 *
 * Kopf und Körper sind getrennt gezeichnet und werden hier zusammengesetzt:
 * Jede Kopfbahn liegt in einem eigenen Kasten, der um den Halspunkt
 * verkleinert und geneigt wird. Dadurch folgt das ganze Gesicht dem Kopf –
 * wer ihn verschiebt, verschiebt Augen, Mund und Haar mit.
 */

import { useEffect, useState } from 'react';
import { getImageUrl } from '../../lib/images';
import {
  HALSPUNKT,
  anweisung,
  bahnen,
  kopflageVon,
  zeichenfolge,
  type Bildbau,
  type Darstellung,
  type Gezeichnet,
  type Teil,
} from '../../lib/baukasten';
import { grundformPfad, FELD } from './Grundformen';
import { cx } from '../../lib/utils';

/**
 * Die Adressen der gebrauchten Bilder.
 *
 * Gesammelt für den ganzen Stapel auf einmal und nicht je Schicht: Sonst
 * lädt jede Schicht für sich, und der Stapel baut sich vor den Augen
 * zusammen. Erst wenn alles da ist, steht das Bildnis.
 */
function useBildadressen(ids: string[], fassung: Fassung): Map<string, string> | null {
  const schluessel = ids.join('|');
  const [adressen, setAdressen] = useState<Map<string, string> | null>(null);

  useEffect(() => {
    let gilt = true;
    if (ids.length === 0) {
      setAdressen(new Map());
      return;
    }
    void Promise.all(ids.map(async (id) => [id, await getImageUrl(id, fassung)] as const)).then(
      (paare) => {
        if (!gilt) return;
        setAdressen(new Map(paare.filter((p): p is [string, string] => p[1] !== null)));
      },
    );
    return () => {
      gilt = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel, fassung]);

  return adressen;
}

/** Ein einzelnes Stück des Stapels – Fläche, gegebenenfalls mit Linie darüber. */
function Stueck({
  gezeichnet,
  adressen,
}: {
  gezeichnet: Gezeichnet;
  adressen: Map<string, string> | null;
}) {
  const a = anweisung(gezeichnet);
  const quelle = gezeichnet.zeichnung.quelle;

  /*
   * Versatz in Prozent, Grösse als Faktor, Spiegelung als Skalierung.
   * Alles in einem `transform` – drei Angaben, ein Rechenschritt.
   */
  const stil: React.CSSProperties = {
    transform: `translate(${a.versatzX}%, ${a.versatzY}%) scale(${a.spiegel ? -a.groesse : a.groesse}, ${a.groesse})`,
  };

  if (quelle.art === 'grundform') {
    return (
      <svg
        viewBox={`0 0 ${FELD} ${FELD}`}
        className="absolute inset-0 h-full w-full"
        style={stil}
        aria-hidden
      >
        <path d={grundformPfad(quelle.form)} fill={a.farbe ?? 'currentColor'} />
      </svg>
    );
  }

  const flaeche = adressen?.get(quelle.bildId);
  const linie = quelle.linieId ? adressen?.get(quelle.linieId) : undefined;
  if (!flaeche && !linie) return null;

  return (
    <>
      {/*
        Die Fläche: eingefärbt als Maske, sonst schlicht das Bild.
      */}
      {flaeche &&
        (a.farbe ? (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              ...stil,
              backgroundColor: a.farbe,
              maskImage: `url(${flaeche})`,
              WebkitMaskImage: `url(${flaeche})`,
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
            src={flaeche}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-contain"
            style={stil}
          />
        ))}
      {/*
        Die Linie – niemals eingefärbt, immer obenauf, in **derselben** Lage.
        Derselbe `stil` und nicht ein zweiter, sonst laufen Fläche und Tusche
        beim ersten Versatz auseinander.
      */}
      {linie && (
        <img
          src={linie}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-contain"
          style={stil}
        />
      )}
    </>
  );
}

/**
 * In welcher Auflösung die Schichten geholt werden.
 *
 * Gemessen an acht Kacheln mit je einem 1600er Bild: **17 MB gegen 512 kB**,
 * ein Faktor von vierunddreissig. Die Zahl kommt nicht von der Kompression,
 * sondern von der Fläche – ein 1600er Bild hat fünfundzwanzigmal so viele
 * Bildpunkte wie ein 320er, und eine Kachel ist neunzig Punkte breit.
 *
 * Deshalb ist die Voreinstellung trotzdem `full`: Das grosse Bildnis in der
 * Mitte der Charakterseite *braucht* die Auflösung, und eine Voreinstellung,
 * die die Hauptansicht verschlechtert, um Kacheln zu retten, hätte die Sache
 * genau verkehrt herum. Wer klein zeigt, sagt es.
 */
export type Fassung = 'thumb' | 'full';

export function Bildniswerk({
  bau,
  vorrat,
  darstellung = 'ganzfigur',
  fassung = 'full',
  className,
}: {
  bau: Bildbau;
  vorrat: readonly Teil[];
  /** Ganze Figur oder nur der Kopf – dieselben Daten, zwei Darstellungen. */
  darstellung?: Darstellung;
  /** Grosse Ansicht oder Kachel – siehe `Fassung`. */
  fassung?: Fassung;
  className?: string;
}) {
  const folge = zeichenfolge(bau, vorrat);
  const laeufe = bahnen(folge, darstellung);
  const kopf = kopflageVon(bau);

  /*
   * Nur die Bilder, die jetzt gebraucht werden – Fläche und Linie.
   *
   * Ein Teil kann drei Ansichten mit je zwei Dateien tragen; alle zu holen
   * hiesse, beim Aufschlagen einer Figur das Sechsfache zu laden, um fünf
   * Sechstel davon nicht zu zeigen.
   */
  const bildIds: string[] = [];
  for (const lauf of laeufe) {
    for (const stueck of lauf.stuecke) {
      const q = stueck.zeichnung.quelle;
      if (q.art !== 'bild') continue;
      bildIds.push(q.bildId);
      if (q.linieId) bildIds.push(q.linieId);
    }
  }
  const adressen = useBildadressen(bildIds, fassung);

  /*
   * Der Kasten einer Kopfbahn.
   *
   * Gedreht und verkleinert wird um den Halspunkt: `transform-origin` sitzt
   * dort, `scale` hält ihn damit fest, und `translate` setzt ihn an seinen
   * Platz auf dem Körper. Um die Mitte gedreht hübe sich der Kopf beim Neigen
   * vom Hals ab.
   *
   * Bei `darstellung: 'kopf'` bleibt der Kasten unverändert – dann ist das
   * Kopffeld das ganze Bild, und genau daher kommt die Schärfe des Portraits.
   */
  const kopfstil: React.CSSProperties =
    darstellung === 'kopf'
      ? {}
      : {
          transformOrigin: `${HALSPUNKT.x}% ${HALSPUNKT.y}%`,
          transform: `translate(${kopf.versatzX}%, ${kopf.versatzY}%) scale(${kopf.groesse}) rotate(${kopf.drehung}deg)`,
        };

  return (
    <div className={cx('relative aspect-square overflow-hidden', className)}>
      {laeufe.map((lauf, i) =>
        lauf.feld === 'kopf' ? (
          <div key={i} className="absolute inset-0" style={kopfstil}>
            {lauf.stuecke.map((stueck) => (
              <Stueck key={stueck.schicht.name} gezeichnet={stueck} adressen={adressen} />
            ))}
          </div>
        ) : (
          lauf.stuecke.map((stueck) => (
            <Stueck key={stueck.schicht.name} gezeichnet={stueck} adressen={adressen} />
          ))
        ),
      )}
    </div>
  );
}
