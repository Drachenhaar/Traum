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
import { buchtZiehen } from '../../lib/karte/bucht';
import { landzungeZiehen } from '../../lib/karte/landzunge';
import { baeume } from '../../lib/karte/wald';
import { neuerSeed } from '../../lib/karte/zufall';
import { EBENEN, stilImBand } from '../../lib/karte/stil';
import { useBand } from '../../lib/raum/band';
import { zeichneBaum } from './baumzeichnung';
import { cx } from '../../lib/utils';

/**
 * Was der Finger gerade tut.
 *
 * `waehlen` schiebt und tippt an, eine Bedeutung malt – und `bucht` nimmt weg.
 *
 * ---
 *
 * **Warum das Wegnehmen ein eigenes Wort ist und keine Bedeutung.**
 *
 * Die naheliegende Lösung wäre ein Radiergummi gewesen: ein Werkzeug, das
 * löscht, was es berührt. Ein Radiergummi kennt aber nur „weg" – er weiss
 * nicht, ob gerade eine Küste entsteht oder ein Fehler verschwindet, und was
 * er hinterlässt, ist ein Loch.
 *
 * Eine Bucht ist etwas anderes: Sie ist eine **Form**, die jemand zieht, und
 * sie hinterlässt eine Küste. Die Landzunge ist ihr Spiegelbild: dieselbe Form,
 * dieselben fünf Schritte, nur wächst sie an, statt wegzunehmen. Deshalb läuft sie durch dieselben fünf Schritte
 * wie das Malen und kommt als geschlossener Umriss zurück. Der Verfasser
 * bekommt kein mächtigeres Werkzeug, sondern ein Wort mehr.
 */
export type Werkzeug = Bedeutung | 'waehlen' | 'bucht' | 'landzunge';

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
  /**
   * Das Rückgängig – hier und nicht in der Werkzeugleiste.
   *
   * Es stand dort, solange die Leiste in eine Zeile passte. Mit der Landzunge
   * brach sie in eine dritte um, und das war der Anlass, die Frage einmal
   * richtig zu stellen: „Zurücknehmen" ist **kein Werkzeug**. Die Leiste
   * beantwortet „welches Wort spreche ich gerade"; das Rückgängig beantwortet
   * gar keine Frage, es macht etwas mit dem, was schon dasteht.
   *
   * Deshalb steht es jetzt an der Karte selbst, neben „Ganze Karte" – beides
   * Handlungen an dem, was man sieht, und beide dort, wo sie wirken.
   */
  kannZurueck: boolean;
  onZurueck: () => void;
}

export function Weltkarte({
  karte,
  onChange,
  werkzeug,
  gewaehlt,
  onWaehle,
  namen,
  kannZurueck,
  onZurueck,
}: WeltkarteProps) {
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
    if (werkzeug === 'bucht') return formen(buchtZiehen, spur);
    if (werkzeug === 'landzunge') return formen(landzungeZiehen, spur);

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

  /**
   * Eine Form ziehen – Bucht oder Landzunge.
   *
   * Beide beantworten dieselben drei Fragen und beantworten sie verschieden;
   * die Antworten stehen in `lib/karte/bucht.ts` und `lib/karte/landzunge.ts`.
   * Hier bleibt nur, was dieses Bauteil angeht: die Pinselbreite aus der
   * Sicht, und der eine Satz, der nichts durchreicht, wenn der Strich
   * danebenging.
   *
   * Ohne Wirkung kein Schritt: Jeder Aufruf von `onChange` legt oben einen
   * Eintrag im Rückgängig ab. Sonst müsste man dreimal „Zurücknehmen"
   * drücken, um einen Strich zurückzunehmen, und niemand fände heraus, warum.
   *
   * Und nichts wird ausgewählt. Beim Malen zeigt die Auswahl auf das eben
   * Entstandene – hier wurde etwas *verändert*, und ein Bedienfeld, das
   * danach auf irgendeine Fläche zeigt, sagt nur aus, welche das Verfahren
   * zufällig zuerst gefunden hat.
   */
  const formen = (
    wort: (f: Kartenfeature[], spur: Punkt[], radius: number) => Kartenfeature[] | undefined,
    gezogen: Punkt[],
  ) => {
    const features = wort(karte.features, gezogen, pinsel(sicht));
    if (features) onChange({ ...karte, features });
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

          {/*
            Was gerade unter dem Finger entsteht.

            Die Bucht in Wasserton und nicht in Entwurfsgold – sie ist der
            einzige Strich, der etwas *wegnimmt*, und der Unterschied muss
            schon während des Ziehens sichtbar sein. Wer erst beim Loslassen
            merkt, dass er im falschen Werkzeug war, hat seine Küste verloren
            und muss sie über „Zurücknehmen" suchen.

            **Und die Landzunge bleibt beim Entwurfsgold.** Der Gedanke lag
            nahe, ihr die Landfarbe zu geben – dieselbe Spiegelung wie sonst
            überall. Er ist falsch: Land ist auf dieser Karte fast das Papier
            selbst („Land ist kein Ding, sondern das, was übrig bleibt"), und
            eine Vorschau in Papierfarbe auf Papier sieht man nicht. Die Regel
            ist einfacher als die Spiegelung: **Gold heisst, hier entsteht
            etwas; Wasser heisst, hier weicht etwas.** Danach steht die
            Landzunge bei Land, Wasser und Wald – und die Bucht allein.

            **Aber die Wasserlinie, nicht die Wasserfläche.** Der erste Anlauf
            nahm `wasser.flaeche` – und das ist ein Ton, der auf einer halben
            Seite ruhig sein soll. Über Land gerechnet blieben davon 13, 1, 12
            Farbstufen Unterschied übrig; die Entwurfsfarbe bringt 32, 44, 67.
            Der Strich war da und man sah ihn kaum. Bedeutung gegen Lesbarkeit
            zu tauschen ist ein schlechter Tausch, wenn beides zu haben ist:
            `wasser.linie` ist derselbe kühle Ton, nur kräftig genug.
          */}
          {spur && spur.length > 1 && (
            <polyline
              points={spur.map(([x, y]) => `${x},${y}`).join(' ')}
              fill="none"
              stroke={werkzeug === 'bucht' ? stil.wasser.linie : stil.entwurf}
              strokeOpacity={werkzeug === 'bucht' ? 0.75 : 0.45}
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
            {/*
              Auf der leeren Karte hat die Bucht nichts, worin sie liegen
              könnte. Das gehört gesagt: Ein Werkzeug, das auf einen Strich
              schweigt, sieht kaputt aus.
            */}
            {werkzeug === 'bucht'
              ? 'Eine Bucht braucht eine Küste. Male zuerst Land.'
              : 'Mal einen Fleck. Zwei Finger verschieben.'}
          </p>
        )}
      </div>

      {/*
        Die zwei Handlungen an der Karte, oben rechts und beide nur dann da,
        wenn sie etwas zu tun haben. Ein Knopf, der nichts kann, ist eine
        Behauptung über das Bild darunter.
      */}
      <div className="pointer-events-none absolute right-3 top-3 flex gap-2">
        {kannZurueck && (
          <button
            type="button"
            onClick={onZurueck}
            /*
             * **Hier nur das Zeichen, kein Wort – und das ist die Ausnahme.**
             *
             * Dieses Buch schreibt Wörter aus; eine Falte, die verschweigt,
             * was sie verbirgt, ist eine Wundertüte. Hier liegt der Fall
             * anders: Der Knopf sitzt **auf** der Karte. Mit Beschriftung ist
             * er 147 Punkte breit und deckt bei 322 Punkten Kartenbreite fast
             * die halbe obere Kante – und er erscheint genau dann, wenn dort
             * etwas steht, das man gerade gezeichnet hat.
             *
             * Der Rückpfeil ist das eine Zeichen, das jeder kennt, und er
             * steht neben dem, was er zurücknimmt. Der Name bleibt trotzdem
             * da, für alles, was nicht sieht: `aria-label`.
             */
            aria-label="Zurücknehmen"
            title="Zurücknehmen"
            className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-line bg-cream-50 text-ink-muted shadow-card no-tap-highlight"
          >
            <Undo2 size={17} aria-hidden />
          </button>
        )}
        {sicht.w !== FELD && (
          <button
            type="button"
            onClick={zurueckSetzen}
            className="pointer-events-auto touch-target rounded-full border border-line bg-cream-50 px-3 text-sm text-ink-muted shadow-card"
          >
            Ganze Karte
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Die Leiste darunter.
 *
 * Vier Knöpfe und ein Rückgängig – mehr nicht. Jede Erweiterung dieser Leiste
 * ist der Anfang eines Kartenprogramms, und Dragoncore baut kein
 * Kartenprogramm.
 *
 * ---
 *
 * **Zwei Reihen, und die Trennung ist die Reihe selbst.**
 *
 *   oben   ansehen und malen       – Ansehen, Land, Wasser, Wald
 *   unten  umformen und zurück     – Bucht, Landzunge, Zurücknehmen
 *
 * Ein Knopf, der neben seinen Nachbarn steht und etwas grundsätzlich anderes
 * tut, wird genau einmal aus Versehen gedrückt – auf einem Telefon liegen sie
 * acht Punkte auseinander. Und die Bucht ist genau so ein Knopf: Sie sieht aus
 * wie „Wald", verhält sich aber wie „Zurücknehmen".
 *
 * Der erste Versuch setzte einen senkrechten Strich dazwischen und liess die
 * Leiste weiter umbrechen, wie sie wollte. Auf 390 Punkten Breite brach sie
 * mitten in der ersten Gruppe um: „Ansehen Land Wasser" / „Wald │ Bucht
 * Zurücknehmen". Der Strich stand da und trennte nichts – „Wald" war von
 * seinen eigenen Nachbarn abgeschnitten, und die Trennung, die er anzeigte,
 * lief quer zur Trennung, die man sah. Gesehen hat das erst der Blick auf das
 * gerenderte Bild; im Quelltext stand der Strich an der richtigen Stelle.
 *
 * Jetzt sind es zwei erklärte Reihen. Der Umbruch ist keine Folge der
 * Bildschirmbreite mehr, sondern die Aussage selbst.
 *
 * **Und deshalb `px-3.5` statt `px-4`.** Gemessen: Die vier Knöpfe der oberen
 * Reihe sind bei `px-4` zusammen 324 Punkte breit, der Platz beträgt 322. Zwei
 * Punkte, und die Reihe bräche wieder mitten hinein – die Trennung wäre so
 * unlesbar wie vorher. Zwei Punkte weniger Polsterung je Seite lösen das mit
 * vierzehn Punkten Luft.
 */
export function Werkzeugleiste({
  werkzeug,
  onWerkzeug,
}: {
  werkzeug: Werkzeug;
  onWerkzeug: (w: Werkzeug) => void;
}) {
  const knopf = (id: Werkzeug, name: string) => (
    <button
      key={id}
      type="button"
      onClick={() => onWerkzeug(id)}
      aria-pressed={werkzeug === id}
      className={cx(
        'touch-target rounded-full border px-3.5 text-sm',
        werkzeug === id
          ? 'border-brass-500 bg-brass-500 text-paper-50'
          : 'border-line bg-cream-50 text-ink-muted',
      )}
    >
      {name}
    </button>
  );

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {knopf('waehlen', 'Ansehen')}
        {BEDEUTUNGEN.map((b) => knopf(b.id, b.name))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {knopf('bucht', 'Bucht')}
        {knopf('landzunge', 'Landzunge')}
      </div>
    </div>
  );
}
