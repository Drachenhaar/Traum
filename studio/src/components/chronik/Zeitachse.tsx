/**
 * Die Achse und die Spuren.
 *
 * Getrennt von der Seite, die sie benutzt: Hier steht nur, wie Zeit zu Pixeln
 * wird und was davon gezeichnet werden muss. Keine Auswahl, keine Pruefung,
 * keine Datenbank.
 *
 * **Nur was zu sehen ist.** Eine Welt mit tausend Eintraegen ergaebe tausend
 * Elemente im Dokument, von denen zwanzig sichtbar waeren. Deshalb bekommt
 * jeder Eintrag seine Spur *einmal* (damit die Zeilen beim Schieben nicht
 * springen), gezeichnet wird aber nur, was ins Fenster faellt.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type Kalender,
  ausOrdnung,
  jahrLaenge,
  ordnung,
  schreibeJahr,
} from '../../lib/chronik/zeit';
import type { Datierter } from '../../lib/chronik/zustand';

/** Ein Eintrag mit fester Spur. */
export interface Balken {
  d: Datierter;
  spur: number;
  von: number;
  bis: number;
  /** Ein Zeitpunkt, keine Spanne – wird als Raute gezeichnet. */
  punkt: boolean;
  /** Offen nach links oder rechts: „war immer schon da", „besteht bis heute". */
  offenLinks: boolean;
  offenRechts: boolean;
}

const SPUR_HOEHE = 26;
const BALKEN_HOEHE = 16;

/**
 * Spuren vergeben.
 *
 * Gierig von links: Jeder Balken kommt in die erste Spur, in der er nicht mit
 * dem vorigen zusammenstoesst. Das ergibt wenige Spuren und keine
 * Ueberdeckung – und es ist stabil, weil es nur von den Daten abhaengt und
 * nicht davon, wohin gerade geschaut wird.
 */
export function verteileSpuren(datierte: Datierter[], luft: number): Balken[] {
  const mit = datierte.filter((d) => d.datiert);

  /* Ohne Rand kein sinnvoller Anfang: offene Enden bekommen die Weltgrenzen. */
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const d of mit) {
    if (d.zeit.von !== undefined) { min = Math.min(min, d.zeit.von); max = Math.max(max, d.zeit.von); }
    if (d.zeit.bis !== undefined) { min = Math.min(min, d.zeit.bis); max = Math.max(max, d.zeit.bis); }
  }
  if (!Number.isFinite(min)) return [];

  const balken: Balken[] = mit
    .map((d) => {
      const offenLinks = d.zeit.von === undefined;
      const offenRechts = d.zeit.bis === undefined;
      const von = d.zeit.von ?? min;
      const bis = d.zeit.bis ?? (offenLinks ? von : max);
      return {
        d,
        spur: 0,
        von,
        bis: Math.max(von, bis),
        punkt: !offenLinks && !offenRechts ? bis - von < luft : false,
        offenLinks,
        offenRechts,
      };
    })
    .sort((a, b) => a.von - b.von || a.bis - b.bis);

  /* Rechter Rand je Spur. */
  const enden: number[] = [];
  for (const b of balken) {
    let spur = enden.findIndex((ende) => ende <= b.von - luft);
    if (spur === -1) {
      spur = enden.length;
      enden.push(0);
    }
    enden[spur] = b.bis;
    b.spur = spur;
  }
  return balken;
}

/** Abstaende der Jahresstriche, von fein nach grob. */
const SCHRITTE = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

function schrittFuer(jahreImBild: number): number {
  /* Ungefaehr acht Beschriftungen – mehr wird zur Tapete. */
  const ziel = jahreImBild / 8;
  return SCHRITTE.find((s) => s >= ziel) ?? SCHRITTE[SCHRITTE.length - 1];
}

export function Zeitachse({
  balken,
  kalender,
  /** Wohin ein Klick fuehrt. */
  onWaehlen,
  /** Der Zeitpunkt, an dem das Lesezeichen steht. */
  marke,
  onMarke,
  hervor,
}: {
  balken: Balken[];
  kalender: Kalender;
  onWaehlen: (id: string) => void;
  marke: number;
  onMarke: (n: number) => void;
  /** Eintraege, die die Pruefung angemerkt hat. */
  hervor: Set<string>;
}) {
  const box = useRef<HTMLDivElement>(null);
  /*
   * Null, nicht ein angenommener Wert.
   *
   * Stand hier eine Zahl, passte sich der erste Ausschnitt an eine Breite an,
   * die es nicht gab – und weil das nur einmal geschieht, blieb der Fehler:
   * Die Achse zeigte einen Ausschnitt statt der ganzen Welt. Erst messen,
   * dann einpassen.
   */
  const [breite, setBreite] = useState(0);

  /* Ausschnitt: Mitte und wie viele Zeiteinheiten auf einen Pixel gehen. */
  const grenzen = useMemo(() => {
    let von = Number.POSITIVE_INFINITY;
    let bis = Number.NEGATIVE_INFINITY;
    for (const b of balken) {
      von = Math.min(von, b.von);
      bis = Math.max(bis, b.bis);
    }
    if (!Number.isFinite(von)) {
      const jetzt = ordnung({ jahr: 0, roh: '', genauigkeit: 'jahr' }, kalender);
      return { von: jetzt, bis: jetzt + jahrLaenge(kalender) * 100 };
    }
    /* Etwas Luft an beiden Enden, damit nichts an der Kante klebt. */
    const luft = Math.max(jahrLaenge(kalender) * 2, (bis - von) * 0.06);
    return { von: von - luft, bis: bis + luft };
  }, [balken, kalender]);

  const [mitte, setMitte] = useState((grenzen.von + grenzen.bis) / 2);
  const [proPixel, setProPixel] = useState(1);
  const gestellt = useRef(false);

  /* Beim ersten Mal so einstellen, dass die ganze Welt ins Bild passt. */
  useEffect(() => {
    if (gestellt.current || breite <= 0) return;
    const spanne = Math.max(1, grenzen.bis - grenzen.von);
    setProPixel(spanne / breite);
    setMitte((grenzen.von + grenzen.bis) / 2);
    gestellt.current = true;
  }, [grenzen, breite]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const messen = () => setBreite(el.clientWidth);
    messen();
    const ro = new ResizeObserver(messen);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const links = mitte - (breite / 2) * proPixel;
  const rechts = mitte + (breite / 2) * proPixel;
  const xVon = useCallback((n: number) => (n - links) / proPixel, [links, proPixel]);

  /* --------------------------------------------------------- Nur Sichtbares */

  /*
   * Was gezeichnet wird – und was davon eine Beschriftung bekommt.
   *
   * Balken duerfen sich eine Spur teilen, sobald sie zeitlich auseinander
   * liegen. Ihre Namen brauchen aber viel mehr Platz als sie selbst: „König
   * Halvar" und „Die Große Dürre" liegen einundzwanzig Jahre auseinander und
   * standen trotzdem uebereinander, sobald das Jahrhundert ins Bild passte.
   *
   * Deshalb entscheidet sich erst hier, beim jeweiligen Zoom, wer seinen
   * Namen zeigen darf: der Erste in der Spur, und danach jeder, der weit
   * genug vom vorigen entfernt steht. Wer schweigt, ist trotzdem da – sein
   * Balken bleibt, und ein Tippen fuehrt zu ihm.
   */
  const sichtbar = useMemo(() => {
    const rand = (rechts - links) * 0.5;
    const drin = balken
      .filter((b) => b.bis >= links - rand && b.von <= rechts + rand)
      .sort((a, b) => a.spur - b.spur || a.von - b.von);

    /* Rechter Rand der letzten Beschriftung, je Spur. */
    const belegt = new Map<number, number>();
    return drin.map((b) => {
      const x = (b.von - links) / proPixel;
      /* Grob geschaetzt: Serifenschrift in 12 px, gut sechs Pixel je Zeichen. */
      const textBreite = b.d.entry.title.length * 6.2 + 12;
      const bisher = belegt.get(b.spur) ?? -Infinity;
      const beschriftet = x >= bisher;
      if (beschriftet) belegt.set(b.spur, x + textBreite);
      return { b, beschriftet, textBreite };
    });
  }, [balken, links, rechts, proPixel]);

  const spuren = useMemo(() => Math.max(1, ...balken.map((b) => b.spur + 1)), [balken]);

  /* ------------------------------------------------------------- Achse */

  const striche = useMemo(() => {
    const jahr = jahrLaenge(kalender);
    const jahreImBild = (rechts - links) / jahr;
    const schritt = schrittFuer(jahreImBild);
    const erstes = Math.ceil(ausOrdnung(links, kalender).jahr / schritt) * schritt;
    const out: { jahr: number; x: number }[] = [];
    for (let j = erstes; ; j += schritt) {
      const x = xVon(ordnung({ jahr: j, roh: '', genauigkeit: 'jahr' }, kalender));
      if (x > breite) break;
      out.push({ jahr: j, x });
      if (out.length > 200) break; // Notbremse
    }
    return out;
  }, [links, rechts, breite, kalender, xVon]);

  /* ------------------------------------------------------- Schieben, Zoomen */

  const zieht = useRef<{ x: number; mitte: number } | null>(null);
  const zeiger = useRef<Map<number, number>>(new Map());
  const kniff = useRef<{ abstand: number; proPixel: number } | null>(null);

  const zoomeAuf = (neu: number, ankerX: number) => {
    const begrenzt = Math.min(
      Math.max(neu, jahrLaenge(kalender) / 4000),
      Math.max(1, (grenzen.bis - grenzen.von) * 4) / Math.max(1, breite),
    );
    /* Der Punkt unter dem Finger bleibt, wo er ist. */
    const zeitUnterAnker = links + ankerX * proPixel;
    const neueMitte = zeitUnterAnker + (breite / 2 - ankerX) * begrenzt;
    setProPixel(begrenzt);
    setMitte(neueMitte);
  };

  const beiRad = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = box.current?.getBoundingClientRect();
    const ankerX = rect ? e.clientX - rect.left : breite / 2;
    zoomeAuf(proPixel * (e.deltaY > 0 ? 1.18 : 1 / 1.18), ankerX);
  };

  const runter = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    zeiger.current.set(e.pointerId, e.clientX);
    if (zeiger.current.size === 1) zieht.current = { x: e.clientX, mitte };
    if (zeiger.current.size === 2) {
      const [a, b] = [...zeiger.current.values()];
      kniff.current = { abstand: Math.abs(a - b), proPixel };
      zieht.current = null;
    }
  };

  const bewegt = (e: React.PointerEvent) => {
    if (!zeiger.current.has(e.pointerId)) return;
    zeiger.current.set(e.pointerId, e.clientX);

    if (kniff.current && zeiger.current.size === 2) {
      const [a, b] = [...zeiger.current.values()];
      const jetzt = Math.abs(a - b);
      if (jetzt > 8) {
        const rect = box.current?.getBoundingClientRect();
        const ankerX = rect ? (a + b) / 2 - rect.left : breite / 2;
        zoomeAuf((kniff.current.proPixel * kniff.current.abstand) / jetzt, ankerX);
      }
      return;
    }

    if (zieht.current) setMitte(zieht.current.mitte - (e.clientX - zieht.current.x) * proPixel);
  };

  const hoch = (e: React.PointerEvent) => {
    zeiger.current.delete(e.pointerId);
    if (zeiger.current.size < 2) kniff.current = null;
    if (zeiger.current.size === 0) zieht.current = null;
  };

  const markeX = xVon(marke);

  return (
    <div>
      {/* ------------------------------------------------------------ Achse */}
      <div
        ref={box}
        onWheel={beiRad}
        onPointerDown={runter}
        onPointerMove={bewegt}
        onPointerUp={hoch}
        onPointerCancel={hoch}
        /*
         * `touch-none`: Auf dem iPhone gehoert jede Geste hier dem Zeitstrahl.
         * Ohne das schoebe ein Wischen die Seite darunter, und das Schwenken
         * waere unbrauchbar.
         */
        className="relative w-full cursor-grab touch-none select-none overflow-hidden rounded-[2px] active:cursor-grabbing"
        style={{ height: 34 + spuren * SPUR_HOEHE + 12 }}
      >
        {/* Jahresstriche */}
        {striche.map((s) => (
          <div key={s.jahr} className="pointer-events-none absolute top-0" style={{ left: s.x }}>
            <div
              className="absolute top-[26px] w-px"
              style={{
                height: spuren * SPUR_HOEHE + 6,
                background: 'linear-gradient(180deg, rgba(140,109,49,0.22), rgba(140,109,49,0.04))',
              }}
            />
            <span className="absolute -translate-x-1/2 whitespace-nowrap font-serif text-[11.5px] tabular-nums text-ink-faint">
              {schreibeJahr(s.jahr, kalender)}
            </span>
          </div>
        ))}

        {/* Die Linie der Achse selbst */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 top-[25px] h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(140,109,49,0.5), transparent)' }}
        />

        {/* Das Lesezeichen in der Zeit */}
        {markeX >= -20 && markeX <= breite + 20 && (
          <div className="pointer-events-none absolute top-[18px]" style={{ left: markeX }}>
            <div
              className="absolute w-px"
              style={{ height: spuren * SPUR_HOEHE + 14, background: 'rgba(184,134,11,0.75)' }}
            />
            <span
              aria-hidden
              className="absolute -translate-x-1/2 -translate-y-[9px] h-[7px] w-[7px] rotate-45"
              style={{ background: '#B8860B' }}
            />
          </div>
        )}

        {/* --------------------------------------------------------- Balken */}
        {sichtbar.map(({ b, beschriftet, textBreite }) => {
          const x = xVon(b.von);
          const w = Math.max(3, (b.bis - b.von) / proPixel);
          const y = 34 + b.spur * SPUR_HOEHE;
          const angemerkt = hervor.has(b.d.entry.id);

          /*
           * Die Beschriftung haftet am linken Bildrand, wenn der Balken schon
           * davor beginnt. Stand sie – wie zuerst – schlicht hinter dem
           * Balken, war sie bei allem, was breiter als das Bild ist,
           * ausserhalb: also ausgerechnet bei den langlebigen Dingen, den
           * Reichen und den Waeldern.
           */
          /*
           * Am rechten Rand klappt der Name nach links um, statt aus dem Bild
           * zu laufen – so wie eine Zeile umbricht, bevor sie den Satzspiegel
           * verlaesst.
           */
          const passtRechts = x + 7 + textBreite <= breite;
          const beschriftungX = passtRechts
            ? Math.max(4, x + 7)
            : Math.max(4, Math.min(x, breite) - textBreite);

          return (
            <button
              key={b.d.entry.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onWaehlen(b.d.entry.id);
              }}
              title={b.d.entry.title}
              className="group absolute left-0 right-0 no-tap-highlight"
              style={{ top: y, height: BALKEN_HOEHE }}
            >
              {b.punkt ? (
                <span
                  className="absolute block h-[9px] w-[9px] rotate-45 transition-transform group-hover:scale-125"
                  style={{
                    left: x,
                    top: 7,
                    background: b.d.entry.coverImage ? '#B8860B' : '#8C6D31',
                    boxShadow: angemerkt ? '0 0 0 2px rgba(140,58,50,0.55)' : 'none',
                  }}
                />
              ) : (
                <span
                  className="absolute block h-[6px] rounded-[2px] transition-all group-hover:h-[8px]"
                  style={{
                    left: x,
                    top: 9,
                    width: w,
                    background: angemerkt
                      ? 'linear-gradient(90deg, rgba(140,58,50,0.8), rgba(140,58,50,0.5))'
                      : 'linear-gradient(90deg, rgba(140,109,49,0.75), rgba(140,109,49,0.4))',
                    /* Offene Enden verlaufen, statt hart abzuschneiden. */
                    maskImage: b.offenLinks
                      ? 'linear-gradient(90deg, transparent, black 24px)'
                      : b.offenRechts
                        ? 'linear-gradient(90deg, black, black calc(100% - 24px), transparent)'
                        : undefined,
                  }}
                />
              )}
              {beschriftet && (
                <span
                  className="absolute top-0 whitespace-nowrap font-serif text-[12px] leading-none text-ink-muted transition-colors group-hover:text-gild-600"
                  style={{
                    left: beschriftungX,
                    /* Ein Hauch Papier hinter der Schrift, damit sie über den
                       Jahresstrichen lesbar bleibt. */
                    textShadow: '0 0 4px rgba(247,242,232,0.95), 0 0 8px rgba(247,242,232,0.8)',
                  }}
                >
                  {b.d.entry.title}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* -------------------------------------------------- Das Lesezeichen */}
      <label className="mt-4 block">
        <span className="rubric mb-1.5 block">Die Welt im Jahr</span>
        <input
          type="range"
          min={links}
          max={rechts}
          step={Math.max(1, (rechts - links) / 2000)}
          value={Math.min(Math.max(marke, links), rechts)}
          onChange={(e) => onMarke(Number(e.target.value))}
          aria-label="Zeitpunkt wählen"
          className="h-11 w-full cursor-pointer touch-none accent-gild-500"
        />
      </label>
    </div>
  );
}
