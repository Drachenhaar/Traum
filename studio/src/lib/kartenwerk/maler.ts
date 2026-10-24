/**
 * Der Maler – die einzige Stufe, die wirklich zeichnet.
 *
 * ---
 *
 * Er kopiert die sichtbaren Kacheln in die Sicht und sonst nichts. Genau
 * deshalb wäre er später die einzige Stelle, die ein WebGL-Maler ersetzen
 * müsste; die Stufen darüber – Gelände, Streuwerk, Stilbuch, Kachelwerk –
 * erführen davon nichts.
 *
 * ---
 *
 * **Die Vorschau aus der gröberen Stufe.**
 *
 * Fehlt eine Kachel ganz, wird die Kachel darüber genommen und ihr Viertel
 * vergrößert. Das ist unscharf und sofort da. Zwei Stufen weit wird gesucht,
 * dann nicht mehr: Was viermal vergrößert wird, ist ein Farbfleck und hilft
 * niemandem.
 *
 * Diese drei Zeilen sind der Unterschied zwischen „die Karte baut sich auf"
 * und „die Karte ist weiß und wird dann plötzlich da sein".
 */

import { kachelmass, type Kachelwerk } from './kachelwerk';

export interface Sichtfeld {
  x: number;
  y: number;
  /** Breite des sichtbaren Ausschnitts im Kartenmaß; die Karte ist quadratisch. */
  w: number;
}

export interface Malbericht {
  stufe: number;
  /** Wie viele Kacheln gezeichnet wurden. */
  kacheln: number;
  /** Davon aus der gröberen Stufe geborgt – also unscharf. */
  vorschau: number;
  /** Davon veraltet – also noch nicht nachgezogen. */
  veraltet: number;
  /** Ob noch etwas gebacken werden muss. */
  offen: boolean;
}

/**
 * Eine Lage in die Sicht malen.
 *
 * `breitePx` ist die Breite des Zielbereichs in **Bildpunkten des Geräts**,
 * also schon mit der Dichte multipliziert. Der Kontext muss entsprechend
 * gesetzt sein.
 */
export function maleLage(
  ctx: CanvasRenderingContext2D,
  werk: Kachelwerk,
  sicht: Sichtfeld,
  breitePx: number,
  stufe: number,
): Malbericht {
  const massstab = breitePx / sicht.w;
  const mass = kachelmass(stufe);
  werk.aktuelleStufe = stufe;
  const mitte = { x: sicht.x + sicht.w / 2, y: sicht.y + sicht.w / 2 };

  const i0 = Math.floor(sicht.x / mass);
  const i1 = Math.floor((sicht.x + sicht.w) / mass);
  const j0 = Math.floor(sicht.y / mass);
  const j1 = Math.floor((sicht.y + sicht.w) / mass);

  let kacheln = 0;
  let vorschau = 0;
  let veraltet = 0;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  for (let j = j0; j <= j1; j++) {
    for (let i = i0; i <= i1; i++) {
      const da = werk.nachsehen(i, j, stufe);

      if (da) {
        const r = rahmen(i, j, mass, sicht, massstab);
        ctx.drawImage(da.kachel.leinwand as CanvasImageSource, r.x, r.y, r.b, r.h);
        kacheln++;
        if (!da.frisch) {
          veraltet++;
          /*
           * **Ein veraltetes Bild muss nachbestellt werden.**
           *
           * Hier stand nichts, und das war ein stiller Fehler: Der Maler fand
           * die zur Seite gelegte Kachel, zeichnete sie zufrieden und
           * forderte nie eine neue an. Gemessen nach einer Waldänderung:
           * **neun Kacheln blieben dauerhaft veraltet** – die neuen Bäume
           * erschienen erst, wenn man weit genug wegscrollte, dass die
           * Kachel aus dem Speicher fiel.
           *
           * Gefunden hat es die Sonde, nicht das Auge. Im Bild sah es
           * vollständig aus; es war nur falsch.
           */
          werk.anfordern(i, j, stufe, mitte);
        }
        continue;
      }

      werk.anfordern(i, j, stufe, mitte);

      /* Vorschau: die gröbere Stufe, ausschnittweise vergrößert. */
      let gemalt = false;
      for (let hoch = 1; hoch <= 2 && !gemalt; hoch++) {
        const gz = stufe - hoch;
        if (gz < 0) break;
        const gi = Math.floor(i / 2 ** hoch);
        const gj = Math.floor(j / 2 ** hoch);
        const oben = werk.nachsehen(gi, gj, gz);
        if (!oben) continue;
        const teil = 2 ** hoch;
        const q = oben.kachel.leinwand.width / teil;
        const sx = (i - gi * teil) * q;
        const sy = (j - gj * teil) * q;
        const r = rahmen(i, j, mass, sicht, massstab);
        ctx.drawImage(oben.kachel.leinwand as CanvasImageSource, sx, sy, q, q, r.x, r.y, r.b, r.h);
        kacheln++;
        vorschau++;
        gemalt = true;
      }
    }
  }

  ctx.restore();
  return { stufe, kacheln, vorschau, veraltet, offen: werk.wartend() > 0 };
}

/**
 * Der Platz einer Kachel in der Sicht, **auf ganze Bildpunkte eingerastet**.
 *
 * ---
 *
 * **Warum eingerastet und nicht überlappt.**
 *
 * Hier stand ein halber Bildpunkt Übermaß. Zwei Kacheln, die genau
 * aneinanderstoßen, lassen beim Vergrößern sonst eine haarfeine Lücke – der
 * Browser rundet die eine Kante nach unten und die andere nach oben. Eine
 * halbe Überlappung schloss sie, und solange eine Kachel undurchsichtig war,
 * sah man davon nichts: Was zweimal übereinander gemalt wird, sieht aus wie
 * einmal.
 *
 * Mit dem Waldwerk ist eine Kachel **nicht mehr undurchsichtig**. Boden,
 * Schatten und Kronendach sind halbdurchsichtige Lagen über nichts. Zweimal
 * übereinander gemalt ergeben sie einen dunkleren Streifen – und weil das an
 * jeder Kachelgrenze passiert, lag über dem ganzen Wald ein feines dunkles
 * Gitter. Im Bild gut sichtbar, sobald man einmal darauf geachtet hat.
 *
 * Statt zu überlappen, wird nun gerundet: Die rechte Kante der Kachel `i`
 * wird aus **derselben Rechnung** gewonnen wie die linke Kante der Kachel
 * `i+1`. Zwei Nachbarn können sich also gar nicht uneinig sein – keine
 * Lücke, kein doppelter Streifen.
 */
function rahmen(
  i: number,
  j: number,
  mass: number,
  sicht: Sichtfeld,
  massstab: number,
): { x: number; y: number; b: number; h: number } {
  const links = Math.round((i * mass - sicht.x) * massstab);
  const oben = Math.round((j * mass - sicht.y) * massstab);
  const rechts = Math.round(((i + 1) * mass - sicht.x) * massstab);
  const unten = Math.round(((j + 1) * mass - sicht.y) * massstab);
  return { x: links, y: oben, b: rechts - links, h: unten - oben };
}
