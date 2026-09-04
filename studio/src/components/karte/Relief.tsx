/**
 * Die Karte, erhoben.
 *
 * ---
 *
 * **Ein Blatt, kein Werkzeug.**
 *
 * Auf der flachen Karte wird gemalt: Finger auf, Küste ziehen, Fläche wählen,
 * Bedeutung setzen. Hier nicht. Auf einer isometrischen Ansicht zu zeichnen
 * hiesse, den Finger in einer Ebene zu führen und den Strich in einer anderen
 * entstehen zu sehen – das ist kein Werkzeug, das ist ein Vexierbild.
 *
 * Das Relief ist deshalb ausdrücklich zum **Ansehen**. Wer etwas ändern will,
 * legt es flach; die Daten sind dieselben, und beim Zurückschalten steht die
 * Änderung auch hier.
 *
 * ---
 *
 * **Warum die Bäume hier SVG sein dürfen.**
 *
 * Auf der flachen Karte sind sie Canvas, und der Grund steht in
 * `baumzeichnung.ts`: zweitausend Knoten, die bei jeder Verschiebung neu
 * bewertet werden, sind auf einem Telefon der Unterschied zwischen Gleiten und
 * Ruckeln.
 *
 * Hier wird nicht verschoben. Das Relief steht still, wird einmal gezeichnet
 * und danach nicht mehr angefasst – und dann ist SVG das ehrlichere Mittel:
 * Es druckt, es skaliert, und es braucht keinen zweiten Zeichenweg, der
 * dieselben Bäume ein zweites Mal beschreibt.
 *
 * **Eine Grenze steht trotzdem da.** Ein Wald von zweitausend Bäumen wären
 * hier zweitausend Knoten auf einmal; jenseits von `HOECHSTENS_BAEUME` wird
 * ausgedünnt. Lieber ein etwas lichterer Wald als eine Seite, die eine
 * Sekunde braucht.
 */

import { useMemo } from 'react';
import type { Kartendokument, Kartenfeature } from '../../lib/karte/modell';
import type { Kartenstil } from '../../lib/karte/stil';
import { baeume, type Baum } from '../../lib/karte/wald';
import {
  RELIEF,
  deckflaeche,
  hoeheVon,
  iso,
  reliefFolge,
  reliefKasten,
  reliefSicht,
  waende,
} from '../../lib/karte/relief';

/**
 * Wie viele Bäume das Relief höchstens trägt.
 *
 * Nicht gegriffen: Ein Wald mittlerer Grösse liegt bei drei- bis fünfhundert.
 * Zwölfhundert lässt also jeden gewöhnlichen Wald vollständig stehen und fängt
 * nur die Fälle ab, in denen jemand das halbe Feld bewaldet hat.
 */
const HOECHSTENS_BAEUME = 1200;

/** Ein Baum im Relief: Stamm senkrecht, Krone darüber. */
const BAUM_HOEHE = 26;

/**
 * Zwei Töne aus einem – heller im Licht, kühler im Schatten.
 *
 * Die zweite DNA-Regel lautet „Warmes Licht, kühler Schatten", und sie gilt
 * auch für eine Wand aus Papier. Gemischt wird deshalb nicht gegen Grau,
 * sondern gegen Weiss und gegen ein kühles Dunkel – eine Wand mit grauem
 * Schatten sähe aus wie ein Bauplan.
 */
function tonMischen(hex: string, licht: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  /* −0,18 im Schatten bis +0,10 im Licht, und im Schatten ein Hauch Blau. */
  const t = (licht - 0.5) * 0.28;
  const misch = (kanal: number, kuehl: number) => {
    const ziel = t >= 0 ? 255 : kuehl;
    const anteil = Math.abs(t);
    return Math.round(kanal + (ziel - kanal) * anteil);
  };
  return `rgb(${misch(r, 28)}, ${misch(g, 34)}, ${misch(b, 48)})`;
}

export function Relief({
  karte,
  stil,
  namen,
}: {
  karte: Kartendokument;
  stil: Kartenstil;
  /** Kennung einer Seite → ihr Titel, für die Beschriftung. */
  namen: Map<string, string>;
}) {
  /*
   * Alles Gerechnete an einer Stelle und nur, wenn sich die Karte ändert.
   *
   * Die Dicke jeder Fläche kostet ein Raster von 625 Punkten mal der Zahl der
   * Kanten. Bei jedem Anstrich neu wäre das bei zwanzig Flächen spürbar – und
   * es müsste nie sein, denn dieselbe Fläche ergibt immer dieselbe Höhe.
   */
  const bild = useMemo(() => {
    const folge = reliefFolge(karte.features);
    const hoehen = new Map<string, number>();
    for (const f of folge) hoehen.set(f.id, hoeheVon(f));
    /*
     * Der Rahmen kommt aus den Flächen selbst – siehe `reliefSicht`. Die Bäume
     * ragen darüber hinaus, also bekommt jede Waldfläche ihre Baumhöhe
     * aufgeschlagen; sonst stünden die Kronen am oberen Rand abgeschnitten.
     */
    const kaesten = folge.map((f) => {
      const k = reliefKasten(f.punkte, hoehen.get(f.id) ?? 0);
      return f.art === 'wald' ? { ...k, y0: k.y0 - BAUM_HOEHE } : k;
    });

    /* Die Bäume – dieselben wie flach, nur mit einem Grund unter den Füssen. */
    let gesamt = 0;
    const waelder = new Map<string, { baum: Baum; grund: number }[]>();
    for (const f of folge) {
      if (f.art !== 'wald') continue;
      const grund = hoehen.get(f.id) ?? 0;
      const liste = baeume(f);
      gesamt += liste.length;
      waelder.set(
        f.id,
        liste.map((baum) => ({ baum, grund })),
      );
    }
    /*
     * Ausdünnen, wenn es zu viele werden – gleichmässig über alle Wälder, und
     * immer dieselben. Ein Zufall an dieser Stelle hiesse: bei jedem Öffnen
     * ein anderer Wald.
     */
    const schritt = gesamt > HOECHSTENS_BAEUME ? Math.ceil(gesamt / HOECHSTENS_BAEUME) : 1;
    if (schritt > 1) {
      for (const [id, liste] of waelder) {
        waelder.set(
          id,
          liste.filter((_, i) => i % schritt === 0),
        );
      }
    }

    return { folge, hoehen, sicht: reliefSicht(kaesten), waelder, ausgeduennt: schritt > 1 };
  }, [karte.features]);

  const farben = (f: Kartenfeature) =>
    f.art === 'wasser' ? stil.wasser : f.art === 'wald' ? stil.wald : stil.land;

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-line"
      style={{ background: stil.papier }}
      /*
       * Kein `data-raum="aus"`: Hier wird nichts gemalt, also darf die
       * Raumschicht ihre Randgesten behalten. Auf der flachen Karte war die
       * Sperre nötig, weil sich zwei Gesten um denselben Finger stritten – ein
       * Streit, den es hier nicht gibt.
       */
    >
      <svg
        className="block h-auto w-full"
        viewBox={`${bild.sicht.x} ${bild.sicht.y} ${bild.sicht.w} ${bild.sicht.h}`}
        aria-label="Weltkarte als Relief"
      >
        {/*
          Die Grundplatte – der Rand des Feldes, isometrisch.

          Sie ist nicht Zierde: Ohne sie schweben die Flächen im Nichts, und man
          sieht nicht, wo die Welt aufhört. Auf der flachen Karte tut dasselbe
          ein Rechteck.
        */}
        <path
          d={deckflaeche(
            [
              [0, 0],
              [1000, 0],
              [1000, 1000],
              [0, 1000],
            ],
            0,
          )}
          fill="none"
          stroke={stil.koernung}
          strokeWidth={stil.strich}
        />

        {bild.folge.map((f) => {
          const h = bild.hoehen.get(f.id) ?? 0;
          const c = farben(f);
          const wand = waende(f.punkte, h);
          return (
            <g key={f.id}>
              {/*
                Erst die Wände, dann die Deckfläche.

                Andersherum läge die Kante der Deckfläche unter ihrer eigenen
                Wand – ein Strich, der halb verschwindet, und das Auge liest
                ihn als Fehler im Papier.
              */}
              {wand.map((w, i) => (
                <path
                  key={i}
                  d={w.d}
                  fill={tonMischen(c.flaeche, w.licht)}
                  stroke={c.linie}
                  strokeWidth={stil.strich * 0.7}
                  strokeLinejoin="round"
                />
              ))}
              <path
                d={deckflaeche(f.punkte, h)}
                fill={c.flaeche}
                stroke={c.linie}
                strokeWidth={stil.strich}
                strokeLinejoin="round"
              />
              {/*
                Der Saum am Wasser – dieselbe Zeile wie flach, aus demselben
                Grund: Zwei Striche, und das Meer liegt *in* der Karte statt
                darauf.
              */}
              {f.art === 'wasser' && (
                <path
                  d={deckflaeche(f.punkte, h)}
                  fill="none"
                  stroke={stil.wasser.saum}
                  strokeWidth={stil.strich * 3}
                  strokeOpacity={0.5}
                />
              )}
            </g>
          );
        })}

        {/*
          Die Bäume, zuletzt und über allem.

          Senkrecht: In der Isometrie bleibt eine Senkrechte senkrecht, und das
          ist der ganze Grund, warum diese Projektion sich für gezeichnete
          Reliefs eignet. Ein Baum, der mit der Fläche mitkippte, sähe aus wie
          umgefallen.
        */}
        {bild.folge.map((f) => {
          const liste = bild.waelder.get(f.id);
          if (!liste) return null;
          return (
            <g key={`w_${f.id}`}>
              {liste.map(({ baum, grund }, i) => {
                const [px, py] = iso(baum.x, baum.y, grund);
                const h = BAUM_HOEHE * baum.groesse;
                return (
                  <g key={i}>
                    <line
                      x1={px}
                      y1={py}
                      x2={px}
                      y2={py - h * 0.45}
                      stroke={stil.wald.stamm}
                      strokeWidth={Math.max(0.4, h * 0.09)}
                      strokeLinecap="round"
                    />
                    <ellipse
                      cx={px}
                      cy={py - h * 0.62}
                      rx={h * 0.3}
                      ry={h * 0.36}
                      fill={stil.wald.laub}
                    />
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Die Namen – über den Bäumen, wie auf der flachen Karte. */}
        {bild.folge.map((f) => {
          const name = f.entryId ? namen.get(f.entryId) : undefined;
          if (!name) return null;
          let sx = 0;
          let sy = 0;
          for (const [x, y] of f.punkte) {
            sx += x;
            sy += y;
          }
          const h = bild.hoehen.get(f.id) ?? 0;
          const [tx, ty] = iso(sx / f.punkte.length, sy / f.punkte.length, h + RELIEF.wald);
          return (
            <text
              key={`n_${f.id}`}
              x={tx}
              y={ty}
              textAnchor="middle"
              fill={stil.marke}
              fontSize={bild.sicht.w * 0.024}
              stroke={stil.papier}
              strokeWidth={bild.sicht.w * 0.006}
              paintOrder="stroke"
            >
              {name}
            </text>
          );
        })}
      </svg>

      {karte.features.length === 0 && (
        <p className="pointer-events-none absolute inset-x-6 bottom-6 text-center text-sm text-ink-muted">
          Noch ist nichts gemalt. Leg die Karte flach, dann kannst du anfangen.
        </p>
      )}
    </div>
  );
}
