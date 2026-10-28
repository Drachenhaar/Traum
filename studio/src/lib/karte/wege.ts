/**
 * Wege sind Linien mit Bedeutung. Sie sind weder Küsten noch Waldflächen.
 * Ein Weg entsteht ausschließlich dort, wo der Nutzer ihn zeichnet.
 */
import type { Punkt } from './modell';

export interface Kartenweg {
  id: string;
  punkte: Punkt[];
  seed: number;
  entryId?: string;
}

function abstand(a: Punkt, b: Punkt): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** Entfernt Stiftzittern, ohne Endpunkte oder Kurven zu erfinden. */
export function wegAusStrich(spur: readonly Punkt[], mindestAbstand = 3): Punkt[] | undefined {
  const erlaubt = spur.filter((p) =>
    p.length === 2 && p.every((n) => Number.isFinite(n)),
  );
  if (erlaubt.length < 2) return undefined;
  const aus: Punkt[] = [[...erlaubt[0]] as Punkt];
  for (let i = 1; i < erlaubt.length - 1; i++) {
    if (abstand(aus[aus.length - 1], erlaubt[i]) >= mindestAbstand) {
      aus.push([...erlaubt[i]] as Punkt);
    }
  }
  if (abstand(aus[aus.length - 1], erlaubt[erlaubt.length - 1]) > 0) {
    aus.push([...erlaubt[erlaubt.length - 1]] as Punkt);
  }
  if (aus.length < 2 || weglange(aus) < 8) return undefined;
  // Obergrenze für Mobilgeräte; erster und letzter Punkt bleiben erhalten.
  if (aus.length <= 400) return aus;
  const gekuerzt: Punkt[] = [];
  for (let i = 0; i < 400; i++) gekuerzt.push(aus[Math.round(i * (aus.length - 1) / 399)]);
  return gekuerzt;
}

export function weglange(punkte: readonly Punkt[]): number {
  let laenge = 0;
  for (let i = 1; i < punkte.length; i++) laenge += abstand(punkte[i - 1], punkte[i]);
  return laenge;
}

/** Weglänge statt Bildrate bestimmt die Geschwindigkeit der kleinen Wanderfigur. */
export function positionAufWeg(punkte: readonly Punkt[], distanz: number): Punkt | undefined {
  if (!punkte.length) return undefined;
  if (punkte.length === 1) return [...punkte[0]] as Punkt;
  let rest = Math.max(0, Number.isFinite(distanz) ? distanz : 0);
  for (let i = 1; i < punkte.length; i++) {
    const a = punkte[i - 1], b = punkte[i];
    const stueck = abstand(a, b);
    if (stueck === 0) continue;
    if (rest <= stueck) {
      const t = rest / stueck;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    rest -= stueck;
  }
  return [...punkte[punkte.length - 1]] as Punkt;
}
