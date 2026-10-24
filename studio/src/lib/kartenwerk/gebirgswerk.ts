/**
 * Das Gebirgswerk – aus dem Höhenfeld wird ein Relief.
 *
 * ---
 *
 * **Ein Kachelmaler mehr, keine zweite Zeichenmaschine.**
 *
 * `useKartenleinwand.ts` hat die Stelle, an der das hier andockt, von
 * Anfang an vorgesehen und beschrieben: Das Kachelwerk kennt zwei Lagen,
 * `grund` und `bewuchs`, und bisher lief nur die zweite. Dies ist die
 * erste. Kein neuer Renderer, kein zweites Modell, keine zweite Wahrheit –
 * dasselbe Kachelwerk, derselbe Maler, ein weiterer Pinsel.
 *
 * Damit gilt für das Gebirge alles, was für den Wald schon galt: Es wird je
 * Kachel gerechnet, gezielt entwertet, nach Budget gebacken und beim
 * Schieben nur kopiert. **Beim Schwenken und Zoomen wird nichts neu
 * gerechnet.**
 *
 * ---
 *
 * **Warum geschummelt wird, und wo nicht.**
 *
 * Eine Kachel von 512 × 512 Punkten hätte 262 144 Orte. Jeder davon
 * kostet einen Fusspunkt über alle Kammsegmente und drei Lagen Rauschen –
 * das wäre eine Viertelsekunde je Kachel und damit unbrauchbar.
 *
 * Gerechnet wird deshalb auf einem **gröberen Gitter** und beim Setzen
 * weich vergrössert. Eine Schattierung ist von Natur aus glatt; was dabei
 * verlorengeht, ist nichts, was man sieht. Gemessen steht die Zahl unten.
 *
 * Wo *nicht* geschummelt wird: Das Gitter hängt an der **Welt** und nicht
 * an der Kachel. Zwei Nachbarkacheln fragen an ihrer gemeinsamen Grenze
 * exakt dieselben Orte – sonst stünde dort eine Naht, und zwar eine, die
 * mit jedem Zoomschritt anderswo läge.
 *
 * ---
 *
 * **Die Beleuchtung.**
 *
 * Von links oben, wie alles in diesem Satz (siehe `scripts/atlas/saetze.mjs`,
 * `VERTRAG.lichtVonLinks`). Die Neigung kommt aus den Nachbarwerten des
 * Gitters; damit sie überhaupt eine Neigung ist, müssen Höhe und Breite
 * dasselbe Mass haben – deshalb `GEBIRGE.vollhoehe` im Kartenmaß und nicht
 * ein Wert zwischen null und eins.
 *
 * ---
 *
 * **Die Erweiterungsstelle für gemalte Berge.**
 *
 * `gratpunkte` liefert die Orte, an denen der Grat am höchsten ist, mit
 * Höhe und Richtung – genau das, was ein Bildersatz später braucht, um
 * seine gemalten Felswände dorthin zu setzen. Sie wird heute von niemandem
 * gelesen, und das ist Absicht: Die Stelle gehört angelegt, solange man
 * weiss, warum. Eine zweite Renderengine wird daraus nicht.
 */

import type { Gebirgskamm } from '../karte/modell';
import { GEBIRGE, gebirgsfeld, gebirgskasten, hoeheBei } from '../karte/gebirge';
import type { Kartenstil } from '../karte/stil';
import type { Kasten } from './kachelwerk';

/**
 * Wie fein gerechnet wird: ein Gitterpunkt je so viele Bildpunkte.
 *
 * Vier ist gemessen und nicht geraten. Bei zwei kostet eine Kachel das
 * Vierfache und sieht gleich aus; bei acht sieht man die Vergrösserung an
 * den Graten als Treppe.
 */
const GITTER_PX = 4;

/** Höchste Gitterweite je Kachel – ein Deckel gegen Ausreisser. */
const HOECHSTENS = 192;

function farbe(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function neueLeinwand(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Überschneiden sich zwei Kästen? */
function trifft(a: Kasten, b: { x0: number; y0: number; x1: number; y1: number }): boolean {
  return a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0;
}

export interface Gebirgsplan {
  /** Gerätedichte – nur für die Feinheit des Gitters. */
  dichte: number;
}

/**
 * Das Relief einer Kachel malen.
 *
 * Trägt die Kachel kein Gebirge, wird **nichts** gezeichnet und sie bleibt
 * durchsichtig. Das ist wichtiger, als es klingt: Die Lage liegt über dem
 * Land und unter dem Wald, und eine Kachel, die ihren Grund füllte, löschte
 * dort die Küste.
 */
export function maleGebirge(
  ctx: CanvasRenderingContext2D,
  kasten: Kasten,
  massstab: number,
  kaemme: Gebirgskamm[],
  stil: Kartenstil,
  plan: Gebirgsplan,
): void {
  const nah = kaemme.filter((k) => k.punkte.length >= 2 && trifft(kasten, gebirgskasten(k)));
  if (!nah.length) return;

  const mass = kasten.x1 - kasten.x0;
  const breitePx = mass * massstab;
  const n = Math.max(8, Math.min(HOECHSTENS, Math.round(breitePx / GITTER_PX)));
  const schritt = mass / n;

  /*
   * Ein Ring mehr auf jeder Seite.
   *
   * Die Neigung eines Gitterpunktes braucht seine Nachbarn. Ohne den Ring
   * hätte der Rand jeder Kachel keine – und bekäme ersatzweise die Neigung
   * null, also einen hellen Streifen an jeder Kachelgrenze.
   */
  const w = n + 3;
  /*
   * **Einmal vorsortieren, dann sechzehntausend Mal fragen.**
   *
   * `gebirgsfeld` wirft weg, was diese Kachel nicht erreichen kann. Ohne
   * das kostete eine Reliefkachel 51 ms – das Sechsfache des Bildbudgets,
   * und ein Ruckeln, das man sieht.
   */
  const feld = gebirgsfeld(nah, {
    x0: kasten.x0 - schritt,
    y0: kasten.y0 - schritt,
    x1: kasten.x1 + schritt,
    y1: kasten.y1 + schritt,
  });
  const h = new Float32Array(w * w);
  for (let j = 0; j < w; j++) {
    const y = kasten.y0 + (j - 1) * schritt;
    for (let i = 0; i < w; i++) {
      h[j * w + i] = feld(kasten.x0 + (i - 1) * schritt, y);
    }
  }

  /* Trägt die Kachel am Ende doch nichts, bleibt sie durchsichtig. */
  let irgendwas = false;
  for (let k = 0; k < h.length && !irgendwas; k++) if (h[k] > 0.002) irgendwas = true;
  if (!irgendwas) return;

  const [gr, gg, gb] = farbe(stil.fels.flaeche);
  const [lr, lg, lb] = farbe(stil.fels.licht);
  const [sr, sg, sb] = farbe(stil.fels.schatten);
  const [hr, hg, hb] = farbe(stil.fels.hoehe);

  const bild = new ImageData(w, w);
  const d = bild.data;

  /*
   * **Das Licht steht bei 45 Grad.**
   *
   * Der erste Anlauf nahm 29 – und bei Hängen von 35 Grad lag damit fast
   * alles im Schatten. Physikalisch richtig und als Karte unbrauchbar: Eine
   * Reliefschummerung zeigt Form und nicht Tageszeit.
   */
  const el = Math.PI / 4;
  const lh = Math.cos(el);
  const lx = -lh * 0.707, ly = -lh * 0.707, lz = Math.sin(el);

  for (let j = 1; j < w - 1; j++) {
    for (let i = 1; i < w - 1; i++) {
      const k = j * w + i;
      const hoch = h[k];
      const ziel = (j - 1) * w + (i - 1);

      if (hoch <= 0.002) {
        d[ziel * 4 + 3] = 0;
        continue;
      }

      /*
       * Die Neigung aus den Nachbarwerten. `vollhoehe` bringt die Höhe in
       * dasselbe Mass wie der Abstand – ohne das wäre jede Neigung fast
       * null und das Gebirge flach wie ein Aufkleber.
       */
      const dx = ((h[k + 1] - h[k - 1]) * GEBIRGE.vollhoehe) / (2 * schritt);
      const dy = ((h[k + w] - h[k - w]) * GEBIRGE.vollhoehe) / (2 * schritt);
      const nl = Math.hypot(dx, dy, 1);
      /* Lambert: das Skalarprodukt aus Normale und Lichtrichtung. */
      const lam = Math.max(0, (-dx * lx - dy * ly + lz) / nl);

      /*
       * Zwei Mischungen hintereinander: erst wie hoch (Grund → Höhe), dann
       * wie beschienen (Schatten → Licht). Die zweite wird mit der Höhe
       * stärker, damit der Fuss sanft in das Land übergeht statt mit einer
       * Kante aufzuhören.
       */
      const t = Math.min(1, hoch * 1.35);
      const br = gr + (hr - gr) * t;
      const bg = gg + (hg - gg) * t;
      const bb = gb + (hb - gb) * t;

      /*
       * **Eine Kurve und kein Fenster.**
       *
       * Hier stand `(lam − 0.34) / 0.52`, also ein Ausschnitt – und alles
       * darunter wurde auf null geklemmt. Genau dort liegt aber der ganze
       * abgewandte Hang: Seine Rücken und Rinnen fielen in dieselbe
       * Schattenfarbe, und die halbe Landschaft war eine glatte Fläche.
       *
       * Die Wurzelkurve spreizt das dunkle Ende, ohne das helle zu
       * verbrennen. Nichts wird geklemmt, nichts geht verloren.
       */
      const s = Math.pow(lam, 0.62);
      const kraft = 0.46 + 0.42 * t;
      const mr = s < 0.5 ? br + (sr - br) * (1 - s * 2) : br + (lr - br) * (s * 2 - 1);
      const mg = s < 0.5 ? bg + (sg - bg) * (1 - s * 2) : bg + (lg - bg) * (s * 2 - 1);
      const mb = s < 0.5 ? bb + (sb - bb) * (1 - s * 2) : bb + (lb - bb) * (s * 2 - 1);

      d[ziel * 4] = br + (mr - br) * kraft;
      d[ziel * 4 + 1] = bg + (mg - bg) * kraft;
      d[ziel * 4 + 2] = bb + (mb - bb) * kraft;
      /*
       * Durchsichtig am Fuss. So liegt das Gebirge *auf* dem Land statt
       * ein Loch hineinzuschneiden, und zwei sich berührende Züge gehen
       * ineinander über.
       */
      d[ziel * 4 + 3] = 255 * Math.min(1, hoch * 7);
    }
  }

  /*
   * Das Gitter ist (w−2)² gross und deckt genau [x0, x1] samt Rändern ab.
   * Gesetzt wird so, dass der Mittelpunkt des Bildpunktes `i` auf den Ort
   * `x0 + i·schritt` fällt – deshalb die halbe Zelle Versatz. Ohne sie läge
   * das Relief um einen halben Gitterschritt neben seinem Kamm, und an der
   * Kachelgrenze stiessen zwei verschobene Hälften aufeinander.
   */
  const raster = neueLeinwand(w - 2, w - 2);
  const rctx = raster.getContext('2d') as CanvasRenderingContext2D | null;
  if (!rctx) return;
  rctx.putImageData(bild, 0, 0, 0, 0, w - 2, w - 2);

  const S = schritt * massstab;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(raster as CanvasImageSource, -0.5 * S, -0.5 * S, (w - 2) * S, (w - 2) * S);
  ctx.restore();
  void plan;
}

/**
 * Die Gratpunkte eines Zuges – **die Stelle für die gemalten Berge.**
 *
 * Geliefert wird je Abschnitt ein Ort auf dem Kamm, seine Höhe und die
 * Richtung, in die der Kamm dort zeigt. Ein späterer Bildersatz setzt daran
 * seine Felswände: an den Gipfeln die grossen, in den Sätteln die kleinen,
 * gedreht wie der Grat.
 *
 * Heute liest das niemand. Es steht hier, weil die Rechnung dieselbe ist
 * wie oben und der Ort dafür hier – und weil eine Erweiterungsstelle, die
 * man erst baut, wenn man sie braucht, meist am falschen Platz entsteht.
 */
export interface Gratpunkt {
  x: number;
  y: number;
  /** Höhe 0…1 am Grat. */
  hoehe: number;
  /** Richtung des Kamms an dieser Stelle, im Bogenmaß. */
  richtung: number;
}

export function gratpunkte(k: Gebirgskamm, abstand = 18): Gratpunkt[] {
  if (k.punkte.length < 2) return [];
  const aus: Gratpunkt[] = [];
  for (let i = 1; i < k.punkte.length; i++) {
    const [ax, ay] = k.punkte[i - 1];
    const [bx, by] = k.punkte[i];
    const laenge = Math.hypot(bx - ax, by - ay);
    const schritte = Math.max(1, Math.round(laenge / abstand));
    const richtung = Math.atan2(by - ay, bx - ax);
    for (let s = 0; s < schritte; s++) {
      const t = (s + 0.5) / schritte;
      const x = ax + (bx - ax) * t;
      const y = ay + (by - ay) * t;
      aus.push({ x, y, hoehe: hoeheBei(x, y, k), richtung });
    }
  }
  return aus;
}
