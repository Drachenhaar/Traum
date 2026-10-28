/**
 * Nur eine leise Vorschau auf einer bewusst gezeichneten Straße.
 * Kein NPC und kein heimlicher Eintrag ins Buch: der Verfasser schaltet sie ein.
 * Die Figur läuft in einem eigenen Overlay, der Kachelrenderer bleibt unberührt.
 */
import { useEffect, useState } from 'react';
import type { Kartenweg } from '../../lib/karte/wege';
import { positionAufWeg, weglange } from '../../lib/karte/wege';
import type { Kartenstil } from '../../lib/karte/stil';

interface Bild {
  x: number;
  y: number;
  phase: number;
  richtung: number;
}
type Sicht = { x: number; y: number; w: number };

export function Wanderfigur({ wege, sicht, stil }: {
  wege: readonly Kartenweg[];
  sicht: Sicht;
  stil: Kartenstil;
}) {
  const erster = wege.find((w) => weglange(w.punkte) > 0);
  const [bild, setBild] = useState<Bild | null>(null);

  useEffect(() => {
    if (!erster) { setBild(null); return; }
    const laenge = weglange(erster.punkte);
    if (laenge < 1) { setBild(null); return; }

    const reduziert = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let lebt = true;
    let raf = 0;
    let letzter = 0;
    let wegmeter = 0;
    let letzteZeichnung = 0;

    const zeige = (distanz: number) => {
      const p = positionAufWeg(erster.punkte, distanz);
      const naechster = positionAufWeg(erster.punkte, Math.min(laenge, distanz + 0.6));
      if (!p || !naechster) return;
      setBild({
        x: p[0], y: p[1],
        phase: distanz * .16,
        richtung: naechster[0] < p[0] ? -1 : 1,
      });
    };
    zeige(0);
    if (reduziert) return;

    const bildlauf = (zeit: number) => {
      if (!lebt) return;
      if (!letzter) letzter = zeit;
      const dt = Math.min(.045, (zeit - letzter) / 1000);
      letzter = zeit;
      if (!document.hidden && zeit - letzteZeichnung >= 32) {
        wegmeter += dt * 15;
        const u = wegmeter % (laenge * 2);
        const distanz = u <= laenge ? u : 2 * laenge - u;
        zeige(distanz);
        letzteZeichnung = zeit;
      }
      raf = requestAnimationFrame(bildlauf);
    };
    raf = requestAnimationFrame(bildlauf);
    return () => { lebt = false; cancelAnimationFrame(raf); };
  }, [erster]);

  if (!bild || !erster) return null;
  const scale = Math.max(.3, Math.min(1.3, sicht.w / 900));
  const schritt = Math.sin(bild.phase) * 3;
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`${sicht.x} ${sicht.y} ${sicht.w} ${sicht.w}`}
      aria-label="Eine kleine Person wandert über den eingezeichneten Weg"
      role="img"
    >
      <g transform={`translate(${bild.x} ${bild.y}) scale(${bild.richtung * scale} ${scale})`}>
        <ellipse cx="0" cy="1" rx="9" ry="3" fill={stil.fels.schatten} opacity=".25" />
        <path d={`M-3 -17 L${-4 - schritt} -2`} stroke={stil.fels.schatten} strokeWidth="3.5" strokeLinecap="round" />
        <path d={`M3 -17 L${4 + schritt} -2`} stroke={stil.wald.stamm} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M-8 -38 L8 -38 L10 -19 L-10 -19 Z" fill={stil.wald.laub} />
        <path d={`M-7 -34 L${-9 + schritt * .5} -22`} stroke={stil.wald.stamm} strokeWidth="3" strokeLinecap="round" />
        <path d={`M7 -34 L${9 - schritt * .5} -22`} stroke={stil.wald.stamm} strokeWidth="3" strokeLinecap="round" />
        <circle cx="0" cy="-46" r="7" fill={stil.land.linie} />
        <path d="M-7 -48 Q-3 -58 7 -50" fill="none" stroke={stil.wald.stamm} strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
}
