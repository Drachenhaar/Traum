/**
 * Die Weltkarte.
 *
 * Ein Finger malt grobe Bedeutung, Dragoncore macht daraus eine Fläche. Das
 * ist der ganze Vorgang, und alles Übrige in dieser Datei dient dazu, dass er
 * sich nicht wie Software anfühlt.
 *
 * ---
 *
 * **Zwei Ebenen, aus zwei verschiedenen Gründen.**
 *
 *   SVG    – die Umrisse. Wenige, groß, und man muss sie treffen können.
 *   Canvas – die Bäume. Viele, klein, und niemand tippt einen einzelnen an.
 *
 * Beides liegt deckungsgleich übereinander und teilt dieselbe Sicht. Das
 * kostet die Mühe, die Ansicht zweimal zu rechnen – einmal als `viewBox`,
 * einmal als Matrix –, und spart den Ruck, den zweitausend SVG-Knoten auf
 * einem Telefon machen.
 *
 * ---
 *
 * **Ein Finger malt, zwei Finger bewegen.**
 *
 * Der wichtigste Satz für das Gefühl, und die eine Regel, die keine Ausnahme
 * hat: *Sobald ein zweiter Finger aufsetzt, wird der begonnene Strich
 * verworfen.* Nicht beendet – verworfen. Wer die Karte verschieben will,
 * setzt zwei Finger auf, und dabei berührt einer den Bildschirm einen
 * Sekundenbruchteil früher. Ohne diese Regel entsteht bei jedem Verschieben
 * ein kleiner Fleck, den niemand malen wollte, und die Karte wird zu einem
 * Ort, an dem man vorsichtig sein muss.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Undo2 } from 'lucide-react';
import {
  BEDEUTUNGEN,
  FELD,
  alsPfad,
  kasten,
  neuesFeature,
  type Bedeutung,
  type Kartendokument,
  type Kartenfeature,
  type Punkt,
} from '../../lib/karte/modell';
import { flaecheAus } from '../../lib/karte/kontur';
import { baeume } from '../../lib/karte/wald';
import { neuerSeed } from '../../lib/karte/zufall';
import { EBENEN, stilImBand } from '../../lib/karte/stil';
import { useBand } from '../../lib/raum/band';
import { zeichneBaum } from './baumzeichnung';
import { cx } from '../../lib/utils';

/** Was der Finger gerade tut. `waehlen` schiebt und tippt an, sonst wird gemalt. */
export type Werkzeug = Bedeutung | 'waehlen';

interface Sicht {
  x: number;
  y: number;
  /** Wie breit der sichtbare Ausschnitt im Kartenmaß ist. Die Karte ist quadratisch. */
  w: number;
}

const GANZ: Sicht = { x: 0, y: 0, w: FELD };
/** Näher heran als ein Achtel geht nicht – darunter malt man Pixel, nicht Welt. */
const ENGSTE = FELD / 8;
const WEITESTE = FELD * 1.3;

/**
 * Die Pinselbreite.
 *
 * An die Sicht gekoppelt und nicht fest: Der Finger ist immer gleich dick, und
 * ein Pinsel, der im Kartenmaß fest wäre, malte herausgezoomt Fäden und
 * herangezoomt Balken. So malt man immer „ungefähr fingerbreit" – ein
 * Maßstab, den der Verfasser kennt, ohne ihn zu lernen.
 */
function pinsel(sicht: Sicht): number {
  return sicht.w * 0.028;
}

/** Der Mittelpunkt einer Fläche – für Marken und Namen. */
function mitte(punkte: Punkt[]): Punkt {
  const k = kasten(punkte);
  return [(k.x0 + k.x1) / 2, (k.y0 + k.y1) / 2];
}

export interface WeltkarteProps {
  karte: Kartendokument;
  /** Jede *bedeutungstragende* Änderung. Verschieben und Zoomen gehören nicht dazu. */
  onChange: (karte: Kartendokument) => void;
  werkzeug: Werkzeug;
  gewaehlt?: string;
  onWaehle: (id: string | undefined) => void;
  /** Titel der Einträge, auf die Flächen zeigen. Die Karte hält keine Namen. */
  namen: Map<string, string>;
}

export function Weltkarte({ karte, onChange, werkzeug, gewaehlt, onWaehle, namen }: WeltkarteProps) {
  /* Die Karte traegt den Band, in dem das Buch gerade gebunden ist. */
  const dunkel = useBand();
  const stil = stilImBand(karte.styleId, dunkel);
  const huelle = useRef<HTMLDivElement>(null);
  const leinwand = useRef<HTMLCanvasElement>(null);
  const [sicht, setSicht] = useState<Sicht>(GANZ);
  const [spur, setSpur] = useState<Punkt[] | null>(null);

  /*
   * Die Finger.
   *
   * In einem Ref und nicht im Zustand: Sie ändern sich sechzigmal in der
   * Sekunde, und jede dieser Änderungen ein Neuzeichnen der ganzen Seite
   * auszulösen wäre der sicherste Weg zu einer hakeligen Karte.
   */
  const finger = useRef(new Map<number, { x: number; y: number }>());
  const geste = useRef<{ abstand: number; mitte: Punkt; sicht: Sicht } | null>(null);
  const bewegt = useRef(false);

  /* ------------------------------------------------------ Bildschirm ↔ Karte */

  const zuKarte = useCallback(
    (cx0: number, cy0: number): Punkt => {
      const r = huelle.current?.getBoundingClientRect();
      if (!r || !r.width) return [0, 0];
      return [
        sicht.x + ((cx0 - r.left) / r.width) * sicht.w,
        sicht.y + ((cy0 - r.top) / r.height) * sicht.w,
      ];
    },
    [sicht],
  );

  /* ----------------------------------------------------------- Die Bäume --- */

  /*
   * Einmal je Flächenzustand gerechnet, nicht je Bild.
   *
   * Das ist der Grund, warum das Verschieben der Karte nichts kostet: Beim
   * Schieben ändert sich `features` nicht, also rechnet hier niemand. Erst
   * wenn eine Waldfläche entsteht oder verschwindet, entstehen neue Bäume –
   * und dank des Ortszufalls sind es dieselben wie vorher, plus die neuen.
   */
  const waelder = useMemo(() => {
    const m = new Map<string, ReturnType<typeof baeume>>();
    for (const f of karte.features) {
      if (f.art === 'wald') m.set(f.id, baeume(f));
    }
    return m;
  }, [karte.features]);

  /* --------------------------------------------------------- Das Zeichnen -- */

  useEffect(() => {
    const c = leinwand.current;
    const box = huelle.current;
    if (!c || !box) return;
    let angefordert = 0;

    const male = () => {
      angefordert = 0;
      const breite = box.clientWidth;
      const hoehe = box.clientHeight;
      if (!breite || !hoehe) return;
      /* Auf einem Telefon sind ein CSS-Punkt und ein Bildpunkt nicht dasselbe. */
      const dicht = Math.min(2, window.devicePixelRatio || 1);
      if (c.width !== Math.round(breite * dicht)) c.width = Math.round(breite * dicht);
      if (c.height !== Math.round(hoehe * dicht)) c.height = Math.round(hoehe * dicht);

      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);

      const massstab = (breite / sicht.w) * dicht;
      ctx.setTransform(massstab, 0, 0, massstab, -sicht.x * massstab, -sicht.y * massstab);

      for (const f of karte.features) {
        if (f.art !== 'wald') continue;
        const liste = waelder.get(f.id);
        if (!liste) continue;
        for (const b of liste) zeichneBaum(ctx, b, stil, massstab / dicht);
      }
    };

    const anfordern = () => {
      if (!angefordert) angefordert = requestAnimationFrame(male);
    };
    anfordern();
    window.addEventListener('resize', anfordern);
    return () => {
      window.removeEventListener('resize', anfordern);
      if (angefordert) cancelAnimationFrame(angefordert);
    };
  }, [karte.features, waelder, sicht, stil]);

  /* ------------------------------------------------------------- Finger ---- */

  const abstandUndMitte = (): { abstand: number; mitte: Punkt } => {
    const [a, b] = [...finger.current.values()];
    return {
      abstand: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      mitte: [(a.x + b.x) / 2, (a.y + b.y) / 2],
    };
  };

  const runter = (e: React.PointerEvent) => {
    finger.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    bewegt.current = false;

    if (finger.current.size >= 2) {
      /*
       * Der zweite Finger verwirft den Strich.
       *
       * Siehe oben: Wer verschieben will, setzt nie beide Finger im selben
       * Augenblick auf. Ohne diese Zeile hinterlässt jede Verschiebung einen
       * Fleck.
       */
      setSpur(null);
      const { abstand, mitte: m } = abstandUndMitte();
      geste.current = { abstand, mitte: m, sicht };
      return;
    }

    geste.current = null;
    if (werkzeug !== 'waehlen') setSpur([zuKarte(e.clientX, e.clientY)]);
  };

  const bewegen = (e: React.PointerEvent) => {
    if (!finger.current.has(e.pointerId)) return;
    const vorher = finger.current.get(e.pointerId)!;
    finger.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = huelle.current?.getBoundingClientRect();
    if (!r || !r.width) return;
    if (Math.hypot(e.clientX - vorher.x, e.clientY - vorher.y) > 1) bewegt.current = true;

    if (finger.current.size >= 2 && geste.current) {
      /*
       * Verschieben und Zoomen in einem.
       *
       * Gerechnet wird nicht schrittweise, sondern immer vom Beginn der Geste
       * aus. Schrittweise summierte sich jede Rundung auf, und die Karte
       * driftete unter den Fingern weg – ein Fehler, den man nicht sieht,
       * sondern spürt.
       */
      const { abstand, mitte: m } = abstandUndMitte();
      const start = geste.current;
      const w = Math.max(ENGSTE, Math.min(WEITESTE, (start.sicht.w * start.abstand) / abstand));
      const punktX = start.sicht.x + ((start.mitte[0] - r.left) / r.width) * start.sicht.w;
      const punktY = start.sicht.y + ((start.mitte[1] - r.top) / r.height) * start.sicht.w;
      setSicht({
        x: punktX - ((m[0] - r.left) / r.width) * w,
        y: punktY - ((m[1] - r.top) / r.height) * w,
        w,
      });
      return;
    }

    if (werkzeug === 'waehlen') {
      const dx = ((e.clientX - vorher.x) / r.width) * sicht.w;
      const dy = ((e.clientY - vorher.y) / r.height) * sicht.w;
      setSicht((s) => ({ ...s, x: s.x - dx, y: s.y - dy }));
      return;
    }

    setSpur((s) => (s ? [...s, zuKarte(e.clientX, e.clientY)] : s));
  };

  const hoch = (e: React.PointerEvent) => {
    finger.current.delete(e.pointerId);
    if (finger.current.size >= 1) return;
    geste.current = null;
    if (!spur) return;
    setSpur(null);
    if (werkzeug === 'waehlen') return;

    /*
     * Der Startwert wird *vor* dem Verfeinern gezogen und dann behalten.
     *
     * Sonst hätte die Fläche eine Küste, die mit einer anderen Zahl gerechnet
     * wurde als der, die gespeichert wird – und beim nächsten Öffnen sähe sie
     * anders aus als in dem Augenblick, in dem sie entstand.
     */
    const seed = neuerSeed();
    const punkte = flaecheAus(spur, pinsel(sicht), seed);
    /* Ein Tippen ist kein Fleck. Es entsteht nichts, und das ist richtig. */
    if (!punkte) return;
    const f: Kartenfeature = { ...neuesFeature(werkzeug, punkte), seed };
    onChange({ ...karte, features: [...karte.features, f] });
    onWaehle(f.id);
  };

  const zurueckSetzen = () => setSicht(GANZ);

  /* ------------------------------------------------------------ Zeichnen --- */

  const geordnet = useMemo(
    () =>
      [...karte.features].sort((a, b) => EBENEN.indexOf(a.art) - EBENEN.indexOf(b.art)),
    [karte.features],
  );

  const farben = (art: Bedeutung) =>
    art === 'wasser' ? stil.wasser : art === 'wald' ? stil.wald : stil.land;

  return (
    <div className="relative w-full">
      <div
        ref={huelle}
        className="relative aspect-square w-full overflow-hidden rounded-2xl border border-line"
        /*
         * Diese Flaeche gehoert dem Finger allein.
         *
         * Die Raumschicht fragt vor jeder Geste, ob unter dem Finger etwas
         * liegt, das ihn selbst braucht – `data-raum="aus"` ist die Antwort.
         * Ohne sie wuerde ein Strich, der am rechten Kartenrand beginnt, den
         * Wesensraum andeuten, waehrend jemand eine Kueste malt. Zwei Gesten,
         * die sich um denselben Finger streiten, ergeben keine Bedienung.
         */
        data-raum="aus"
        style={{ background: stil.papier, touchAction: 'none' }}
        onPointerDown={runter}
        onPointerMove={bewegen}
        onPointerUp={hoch}
        onPointerCancel={hoch}
        onPointerLeave={hoch}
      >
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`${sicht.x} ${sicht.y} ${sicht.w} ${sicht.w}`}
          aria-label="Weltkarte"
        >
          {/* Der Rand des Feldes – damit man weiß, wo die Welt aufhört. */}
          <rect
            x={0}
            y={0}
            width={FELD}
            height={FELD}
            fill="none"
            stroke={stil.koernung}
            strokeWidth={stil.strich}
          />
          {geordnet.map((f) => {
            const c = farben(f.art);
            const d = alsPfad(f.punkte);
            return (
              <g key={f.id}>
                {f.art === 'wasser' && (
                  /* Der Saum: ein heller, breiter Strich unter der Kante. Zwei
                     Zeilen, und das Wasser liegt plötzlich *in* der Karte. */
                  <path d={d} fill="none" stroke={stil.wasser.saum} strokeWidth={stil.strich * 5} />
                )}
                <path
                  d={d}
                  fill={c.flaeche}
                  stroke={c.linie}
                  strokeWidth={stil.strich}
                  onClick={() => {
                    if (!bewegt.current) onWaehle(f.id);
                  }}
                />
              </g>
            );
          })}

          {/* Was gerade unter dem Finger entsteht. */}
          {spur && spur.length > 1 && (
            <polyline
              points={spur.map(([x, y]) => `${x},${y}`).join(' ')}
              fill="none"
              stroke={stil.entwurf}
              strokeOpacity={0.45}
              strokeWidth={pinsel(sicht) * 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>

        <canvas
          ref={leinwand}
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden
        />

        {/*
          Die dritte Lage: Namen und Auswahl – über den Bäumen.

          Sie standen zuerst in der unteren Ebene, und im ersten gerenderten
          Bild verschwand „Der Mooswald" halb hinter seinem eigenen Wald. Ein
          Name, den die Karte verdeckt, ist kein Name. Die Reihenfolge ist
          damit: Flächen, Bäume, Beschriftung – dieselbe, in der ein Zeichner
          es täte.
        */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`${sicht.x} ${sicht.y} ${sicht.w} ${sicht.w}`}
          aria-hidden
        >
          {geordnet.map((f) => {
            if (gewaehlt !== f.id) return null;
            return (
              <path
                key={`w_${f.id}`}
                d={alsPfad(f.punkte)}
                fill="none"
                stroke={stil.wahl}
                strokeWidth={stil.strich * 2}
                strokeDasharray={`${sicht.w * 0.014} ${sicht.w * 0.01}`}
              />
            );
          })}
          {geordnet.map((f) => {
            const name = f.entryId ? namen.get(f.entryId) : undefined;
            if (!name) return null;
            const [tx, ty] = mitte(f.punkte);
            return (
              <text
                key={`n_${f.id}`}
                x={tx}
                y={ty}
                textAnchor="middle"
                fill={stil.marke}
                fontSize={sicht.w * 0.026}
                /* Ein heller Saum, damit der Name auch über dichtem Laub steht. */
                stroke={stil.papier}
                strokeWidth={sicht.w * 0.006}
                paintOrder="stroke"
              >
                {name}
              </text>
            );
          })}
        </svg>

        {karte.features.length === 0 && !spur && (
          <p className="pointer-events-none absolute inset-x-6 bottom-6 text-center text-sm text-ink-muted">
            Mal einen Fleck. Zwei Finger verschieben.
          </p>
        )}
      </div>

      {sicht.w !== FELD && (
        <button
          type="button"
          onClick={zurueckSetzen}
          className="absolute right-3 top-3 touch-target rounded-full border border-line bg-cream-50 px-3 text-sm text-ink-muted shadow-card"
        >
          Ganze Karte
        </button>
      )}
    </div>
  );
}

/**
 * Die Leiste darunter.
 *
 * Vier Knöpfe und ein Rückgängig – mehr nicht. Jede Erweiterung dieser Leiste
 * ist der Anfang eines Kartenprogramms, und Dragoncore baut kein
 * Kartenprogramm.
 */
export function Werkzeugleiste({
  werkzeug,
  onWerkzeug,
  kannZurueck,
  onZurueck,
}: {
  werkzeug: Werkzeug;
  onWerkzeug: (w: Werkzeug) => void;
  kannZurueck: boolean;
  onZurueck: () => void;
}) {
  const knopf = (id: Werkzeug, name: string) => (
    <button
      key={id}
      type="button"
      onClick={() => onWerkzeug(id)}
      aria-pressed={werkzeug === id}
      className={cx(
        'touch-target rounded-full border px-4 text-sm',
        werkzeug === id
          ? 'border-brass-500 bg-brass-500 text-paper-50'
          : 'border-line bg-cream-50 text-ink-muted',
      )}
    >
      {name}
    </button>
  );

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {knopf('waehlen', 'Ansehen')}
      {BEDEUTUNGEN.map((b) => knopf(b.id, b.name))}
      <button
        type="button"
        onClick={onZurueck}
        disabled={!kannZurueck}
        className="touch-target ml-auto flex items-center gap-1 rounded-full border border-line bg-cream-50 px-4 text-sm text-ink-muted disabled:opacity-40"
      >
        <Undo2 size={16} aria-hidden />
        {/*
          „Zurücknehmen" und nicht „Zurück".

          Auf jedem Anhangsblatt steht unten „Zurück zu den Anhängen". Zwei
          Knöpfe, die beide mit demselben Wort beginnen und von denen einer die
          Seite verlässt und der andere einen Strich löscht – das ist keine
          Kleinigkeit, sondern der Unterschied zwischen „ich nehme das zurück"
          und „meine Karte ist weg". Gefunden hat es der eigene Testlauf, der
          nach „Zurück" suchte und beim falschen Knopf landete.
        */}
        Zurücknehmen
      </button>
    </div>
  );
}
