/**
 * Zurückhaltende Kartenbauwerke als Pinsel-Fallback.
 * Sobald der Atlas echte Illustrationen enthält, bleibt das Modell gleich.
 * Fußpunkt bei (0,0); nur der Stil liefert Farben und den Zeichenmodus.
 */
import type { Kartenstil } from '../karte/stil';
import type { Staffage } from './staffage';

export function zeichneBauwerk(ctx: CanvasRenderingContext2D, s: Staffage, stil: Kartenstil) {
  const h = s.h;
  const p = (x: number, y: number) => [x * h, y * h] as const;
  const pfad = (punkte: readonly (readonly [number, number])[], farbe: string) => {
    ctx.beginPath();
    punkte.forEach(([x, y], i) => i ? ctx.lineTo(...p(x, y)) : ctx.moveTo(...p(x, y)));
    ctx.closePath();
    ctx.fillStyle = farbe; ctx.fill();
  };
  const strich = (punkte: readonly (readonly [number, number])[], farbe: string, breite = .035) => {
    ctx.beginPath();
    punkte.forEach(([x, y], i) => i ? ctx.lineTo(...p(x, y)) : ctx.moveTo(...p(x, y)));
    ctx.strokeStyle = farbe; ctx.lineWidth = breite * h; ctx.lineJoin = 'round'; ctx.stroke();
  };
  ctx.save();
  ctx.translate(s.x, s.y);
  // Schatten liegt unter dem Standpunkt, auch wenn das Gebäude gedreht würde.
  ctx.fillStyle = stil.fels.schatten;
  ctx.globalAlpha = .2;
  ctx.beginPath(); ctx.ellipse(h * .06, h * .065, h * .88, h * .22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  const dach = stil.wald.stamm;
  const wand = stil.land.flaeche;
  const schatten = stil.fels.hoehe;
  const licht = stil.fels.licht;
  if (s.variante === 2) {
    // Flache Steinbrücke mit leichtem Bogen – auf der Karte ein bauliches Objekt.
    pfad([[-1.08,-.25],[1.08,-.25],[1.19,-.07],[-1.19,-.07]],schatten);
    pfad([[-1.09,-.31],[.9,-.35],[1.09,-.22],[-.9,-.18]],licht);
    strich([[-1,-.38],[-1.09,-.5]],dach,.045);
    strich([[1,-.36],[1.08,-.5]],dach,.045);
  } else if (s.variante === 1) {
    // Turm: Turmkörper und kleines Walmdach in identischer Schrägansicht.
    pfad([[-.39,-1.13],[.12,-1.04],[.12,-.05],[-.39,-.15]],wand);
    pfad([[.12,-1.04],[.48,-1.25],[.48,-.29],[.12,-.05]],schatten);
    pfad([[-.49,-1.12],[.07,-1.62],[.57,-1.37],[.12,-.95]],dach);
    strich([[.24,-.61],[.36,-.7]],stil.marke,.09);
    strich([[-.19,-.67],[-.02,-.63]],stil.marke,.09);
  } else {
    // Haus: Front, beschienene Giebelwand, Dach; warmes Fenster.
    pfad([[-.67,-.8],[.11,-.58],[.11,-.06],[-.67,-.22]],wand);
    pfad([[.11,-.58],[.68,-.89],[.68,-.36],[.11,-.06]],schatten);
    pfad([[-.78,-.81],[-.05,-1.34],[.8,-1.04],[.11,-.55]],dach);
    strich([[-.35,-.45],[-.2,-.39],[-.2,-.16]],stil.marke,.05);
    pfad([[.32,-.62],[.48,-.7],[.48,-.52],[.32,-.43]],stil.fels.licht);
    strich([[.39,-.68],[.39,-.48]],dach,.024);
  }
  // Feine Kontur statt lauter Schwarzlinien.
  ctx.globalAlpha = .45;
  ctx.strokeStyle = stil.marke; ctx.lineWidth = h * .026;
  ctx.restore();
}
