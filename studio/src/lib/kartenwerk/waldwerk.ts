/**
 * Das Waldwerk – wie aus Bäumen ein Wald wird.
 *
 * ---
 *
 * **Der Befund, aus dem es entstanden ist.**
 *
 * Dreimal dieselbe Fläche, dasselbe Streuwerk, dieselben Bilder (siehe
 * `WALDWERK.md`): gestempelt 11 ms, komponiert 97 ms. Zwischen beiden lag
 * **kein einziges neues Bild**. Der Unterschied war allein die Anordnung.
 *
 * Ein schöner Wald ist nicht ein besserer Baum. Er ist die Anordnung – und
 * dann ein besserer Baum.
 *
 * ---
 *
 * **Die sechs Lagen**
 *
 * ```
 * 4  Kronen         die Bäume selbst, nach y sortiert
 * 3  Kronendach     die Vereinigung aller Kronen, verwischt, dahinter –
 *                   und darin das Licht, mit `source-atop` eingelegt
 * 2  Unterholz      eigene Bilder – Farne, Blattwerk, Gräser
 * 1  Schattenwurf   alle Schatten zusammen, dann verwischt
 * 0  Waldboden      weiche Scheiben unter den Stämmen, verwischt
 * ```
 *
 * Im Entwurf waren es sechs. Das Licht ist in das Kronendach gewandert,
 * weil es als eigene Lage Kachelnähte erzeugte – siehe dort.
 *
 * ---
 *
 * **Warum alle sechs aus der Staffage kommen und nicht aus der Fläche.**
 *
 * Im Entwurf wurde der Waldboden aus dem **Umriss** gerechnet: Fläche
 * füllen, stark verwischen, fertig. Auf einer gekachelten Karte geht das
 * nicht – eine Kachel kennt ihren Ausschnitt, nicht die ganze Fläche, und
 * ein Umriss, der an der Kachelgrenze endet, hinterlässt genau die Naht, die
 * die Lage vermeiden soll.
 *
 * Also wird der Boden aus den **Bäumen** gebaut: eine weiche Scheibe unter
 * jedem Stamm, alle zusammen verwischt. Das ist nicht nur kachelbar, es ist
 * auch das ehrlichere Modell – der Boden eines Waldes ist dort dunkel, wo
 * Bäume stehen, und hört auf, wo keine mehr stehen. Der Saum entsteht von
 * selbst, weil das Streuwerk zum Rand hin ausdünnt.
 *
 * Damit braucht keine Lage den Umriss, und keine hat eine Kante.
 *
 * ---
 *
 * **Weichzeichner brauchen Rand.**
 *
 * Ein Weichzeichner, der an der Kachelgrenze aufhört, zieht dort einen
 * hellen Streifen. Jede verwischte Lage entsteht deshalb in einem Puffer
 * **mit Überstand**, wird dort verwischt und erst dann an ihren Platz
 * gesetzt. Der Überstand muss grösser sein als der Radius; bei 60
 * Karteneinheiten und höchstens 14 Bildpunkten Radius ist das reichlich.
 *
 * ---
 *
 * **Und warum die verwischten Lagen gröber gerechnet werden.**
 *
 * Was ohnehin verwischt wird, braucht keine volle Auflösung. Boden, Schatten
 * und Kronendach entstehen in halber Grösse und werden beim Setzen wieder
 * vergrössert – vier Fünftel der Arbeit gespart, und man sieht es nicht,
 * weil ein Weichzeichner genau das tut, was eine Vergrösserung auch tut.
 */

import type { Kartenstil } from '../karte/stil';
import type { Staffage } from './staffage';
import type { Stilbuch } from './stilbuch';
import type { Kasten } from './kachelwerk';
import { zahl } from '../karte/zufall';

/**
 * Derselbe Ort, dieselbe Zahl – unabhängig von der Kachel.
 *
 * Das ist die eine Bedingung, die jede Lage hier einhalten muss: Ein Wert,
 * der davon abhinge, in welcher Kachel er gerechnet wird, ergäbe an jeder
 * Kachelgrenze einen Sprung. `zahl` aus `karte/zufall.ts` ist ein
 * Ortszufall und tut genau das.
 */
const amOrt = (x: number, y: number, salz: number) =>
  zahl(1, Math.round(x), Math.round(y), salz);

/** Wie fein die verwischten Lagen gerechnet werden. */
const GROB = 0.5;

/** Mischt zwei Farben – für Töne, die es im Stil nicht gibt. */
function mische(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const k = (v: number) =>
    Math.round(((pa >> v) & 255) + (((pb >> v) & 255) - ((pa >> v) & 255)) * t);
  return `rgb(${k(16)},${k(8)},${k(0)})`;
}

function neueLeinwand(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Eine Lage anlegen, zeichnen, verwischen, setzen.
 *
 * Der Puffer deckt die Kachel **samt Überstand** ab und rechnet im
 * Kartenmass – wer hineinzeichnet, muss nichts über Kacheln wissen.
 */
function lage(
  ctx: CanvasRenderingContext2D,
  kasten: Kasten,
  massstab: number,
  rand: number,
  unschaerfe: number,
  deckung: number,
  male: (p: CanvasRenderingContext2D) => void,
) {
  const breite = (kasten.x1 - kasten.x0 + rand * 2) * massstab * GROB;
  const hoehe = (kasten.y1 - kasten.y0 + rand * 2) * massstab * GROB;
  if (breite < 2 || hoehe < 2) return;

  const leinwand = neueLeinwand(Math.ceil(breite), Math.ceil(hoehe));
  const p = leinwand.getContext('2d') as CanvasRenderingContext2D | null;
  if (!p) return;

  const m = massstab * GROB;
  p.setTransform(m, 0, 0, m, -(kasten.x0 - rand) * m, -(kasten.y0 - rand) * m);
  male(p);

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = `blur(${unschaerfe}px)`;
  ctx.globalAlpha = deckung;
  /*
   * **Der Puffer beginnt beim Überstand, nicht bei Null.**
   *
   * Er deckt `kasten` *plus* `rand` auf jeder Seite ab; die Kachel selbst
   * fängt erst `rand * massstab` Bildpunkte weiter rechts und weiter unten
   * an. Bei Null gesetzt landete jede verwischte Lage um genau diesen
   * Betrag verschoben – im Bild sah es aus, als gäbe es sie gar nicht,
   * weil Boden und Schatten neben ihren Bäumen lagen.
   */
  const versatz = -rand * massstab;
  /*
   * **Die Zielgrösse wird gerechnet, nicht aus dem Puffer abgelesen.**
   *
   * Der Puffer ist auf ganze Bildpunkte aufgerundet; `leinwand.width / GROB`
   * ist deshalb bis zu zwei Punkte breiter als der Ausschnitt, den er
   * darstellt. Gesetzt wie abgelesen, wäre jede Lage um diesen Rest gedehnt
   * – je Kachel verschieden, und an jeder Kachelgrenze stösst dann eine
   * leicht verschobene Lage an die nächste. Im Bild ein feines Raster, das
   * man erst sieht, wenn man danach sucht.
   */
  ctx.drawImage(
    leinwand as CanvasImageSource,
    0, 0, leinwand.width, leinwand.height,
    versatz, versatz,
    (kasten.x1 - kasten.x0 + rand * 2) * massstab,
    (kasten.y1 - kasten.y0 + rand * 2) * massstab,
  );
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  ctx.restore();
}

export interface Waldwerkplan {
  /** Überstand im Kartenmass – muss zum Kachelwerk passen. */
  rand: number;
  /** Gerätedichte, für die Unschärfe in Bildpunkten. */
  dichte: number;
}

/**
 * Die Staffage einer Kachel malen – komponiert, wo es sich lohnt.
 *
 * Arten, deren Stileintrag `verdichtet` trägt, bilden zusammen eine Masse
 * und bekommen die sechs Lagen. Alles andere – Siedlungen, Felsen, was noch
 * kommt – wird einfach gezeichnet. Ein Dorf soll kein Blätterdach bekommen.
 */
export function maleStaffage(
  ctx: CanvasRenderingContext2D,
  kasten: Kasten,
  massstab: number,
  liste: Staffage[],
  stilbuch: Stilbuch,
  stil: Kartenstil,
  plan: Waldwerkplan,
) {
  const dicht: Staffage[] = [];
  const einzeln: Staffage[] = [];
  for (const s of liste) {
    const e = stilbuch.eintrag(s.art);
    if (!e) continue;
    (e.verdichtet ? dicht : einzeln).push(s);
  }

  if (dicht.length) {
    /*
     * Die Bezugshöhe für die Unschärfe: die grösste unter den verdichteten
     * Arten, aus dem Stilbuch und nicht aus dieser Kachel. Siehe `maleDicht`.
     */
    let bezug = 15;
    for (const art of stilbuch.arten()) {
      const e = stilbuch.eintrag(art);
      if (e?.verdichtet && e.hoehe > bezug) bezug = e.hoehe;
    }
    maleDicht(ctx, kasten, massstab, dicht, stilbuch, stil, plan, bezug);
  }

  for (const s of einzeln) {
    const e = stilbuch.eintrag(s.art);
    if (e) e.zeichne(ctx, s, massstab);
  }
}

function maleDicht(
  ctx: CanvasRenderingContext2D,
  kasten: Kasten,
  massstab: number,
  baeume: Staffage[],
  stilbuch: Stilbuch,
  stil: Kartenstil,
  plan: Waldwerkplan,
  massstabHoehe: number,
) {
  const { rand } = plan;

  /*
   * **Die Unschärfe hängt am Inhalt, nicht an einer festen Zahl.**
   *
   * Der erste Anlauf nahm feste Bildpunkte – neun für den Boden, dreizehn
   * für das Kronendach. Im Entwurf stimmte das, dort war ein Baum
   * hundertfünfundsechzig Punkte hoch. Auf der ganzen Karte ist er
   * **achtzehn**, und ein Weichzeichner von sechsundzwanzig Punkten löscht
   * die Lage einfach aus. Im Bild sah es aus, als gäbe es sie nicht.
   *
   * Gerechnet wird deshalb in Vielfachen der Baumhöhe auf dem Bildschirm.
   * Dann sieht ein Wald herangezoomt genauso aus wie in der Übersicht –
   * nur grösser.
   */
  /*
   * **Und sie darf nicht von dieser Kachel abhängen.**
   *
   * Der erste Anlauf nahm den Median der Bäume *in der Kachel*. Das klingt
   * vernünftig und ist der sicherste Weg zu Kachelnähten: Jede Kachel
   * bekommt eine andere Unschärfe, und im Bild liegt ein Raster aus hell
   * und dunkel über dem Wald. Deutlich zu sehen, sobald man weiss, wonach
   * man sucht.
   *
   * Genommen wird deshalb die Höhe aus dem **Stilbuch** – dieselbe Zahl für
   * die ganze Karte, egal wie viele Bäume gerade in dieser Kachel stehen.
   */
  const hPx = Math.max(2, massstabHoehe * massstab);
  const px = (n: number) => Math.max(1, Math.min(40, hPx * n));

  const boden = mische(stil.wald.laub, stil.wald.stamm, 0.45);
  const dach = mische(stil.wald.laub, stil.wald.flaeche, 0.3);

  /* ---- 1 · Der Waldboden ----
     Eine weiche Scheibe unter jedem Stamm. Zusammen ergibt das eine Fläche,
     die dort dunkel ist, wo Bäume stehen, und ausläuft, wo keine mehr
     stehen – der Saum entsteht von selbst. */
  lage(ctx, kasten, massstab, rand, px(0.32), 0.5, (p) => {
    p.fillStyle = boden;
    for (const s of baeume) {
      p.beginPath();
      p.ellipse(s.x, s.y - s.h * 0.08, s.h * 0.62, s.h * 0.4, 0, 0, 7);
      p.fill();
    }
  });

  /* ---- 2 · Der Schattenwurf ----
     Alle Schatten zusammen und erst dann verwischt. Einzeln unter jeden Baum
     gesetzt sähe jeder aus wie ein Aufkleber mit Schlagschatten; gemeinsam
     ergeben sie das Dunkel unter einem Blätterdach. */
  lage(ctx, kasten, massstab, rand, px(0.22), 0.4, (p) => {
    p.fillStyle = '#1e2616';
    for (const s of baeume) {
      p.beginPath();
      p.ellipse(s.x + s.h * 0.2, s.y - s.h * 0.03, s.h * 0.4, s.h * 0.13, 0, 0, 7);
      p.fill();
    }
  });

  /* ---- 3 · Unterholz ----
     Dieselben Bilder, klein. Sie füllen die Stammzone, damit man nicht
     zwischen den Stämmen hindurch auf den Boden sieht.

     Zwei je Baum und nur bei jedem zweiten – mehr kostet mehr, als es
     bringt, und ein Wald ohne Lücken sieht gestopft aus. */
  for (const s of baeume) {
    const e = stilbuch.eintrag(s.art);
    if (!e) continue;
    /*
     * **Eigene Bilder, wenn es welche gibt – sonst der alte Behelf.**
     *
     * Hier stand nur die zweite Hälfte: dasselbe Baumbild, auf ein Fünftel
     * verkleinert. Aus zwei Schritten Entfernung geht das durch, aus der
     * Nähe steht da ein Kiefernwäldchen in Kniehöhe.
     *
     * Welche Art der Unterwuchs ist, sagt der Stileintrag (`unterwuchs`).
     * Dieses Modul nennt keine Art beim Namen – und es muss auch keine
     * kennen: Fehlt die Art im Bildersatz, ist `unten` undefiniert und es
     * bleibt beim Behelf. Eine Karte ohne Unterholzbilder sieht dann aus
     * wie vorher und nicht kahl.
     */
    const unten = e.unterwuchs ? stilbuch.eintrag(e.unterwuchs) : undefined;
    const malt = unten ?? e;

    for (let k = 0; k < 2; k++) {
      if (amOrt(s.x + k * 37, s.y - k * 23, 601) > 0.5) continue;
      const wuchs = amOrt(s.x, s.y + k, 719);
      malt.zeichne(ctx, {
        ...s,
        x: s.x + (amOrt(s.x, s.y + k, 701) - 0.5) * s.h * 0.75,
        y: s.y + (amOrt(s.y, s.x + k, 709) - 0.2) * s.h * 0.14,
        /*
         * **Nie grösser als die Art sich selbst erklärt.**
         *
         * `hoehe` ist die Grösse, für die der Bildersatz gebacken wurde;
         * wer darüber hinausgeht, holt sich dieselbe Unschärfe zurück, die
         * die Bäume hatten. Deshalb nach unten gestreut und nicht nach
         * oben.
         */
        h: unten ? unten.hoehe * (0.6 + wuchs * 0.4) : s.h * (0.2 + wuchs * 0.16),
        variante: unten
          ? Math.floor(amOrt(s.y + k, s.x, 727) * unten.varianten)
          : s.variante,
        spiegel: amOrt(s.x + k, s.y, 733) > 0.5,
      }, massstab);
    }
  }

  /* ---- 4 · Das Kronendach, und darin das Licht ----
     Die Vereinigung aller Kronen, verwischt, **hinter** den Bäumen. Sie
     füllt die Lücken zwischen den Kronen – und erst dadurch sieht man eine
     Decke statt einzelner Bäume. Am Rand verschwindet sie von selbst, weil
     dort keine Kronen mehr sind.

     **Das Licht liegt in derselben Lage und nicht in einer eigenen.**

     Es war eine eigene, und sie war die letzte Quelle von Kachelnähten: Ein
     Lichtfleck wurde nur gesetzt, wo Bäume stehen – und welche Bäume eine
     Kachel sieht, endet beim Überstand. Derselbe Fleck lag in der einen
     Kachel innerhalb und in der Nachbarkachel ausserhalb der Prüfung.

     Jetzt wird er **in** das Kronendach gemalt, mit `source-atop`. Dann
     erscheint er genau dort, wo schon eine Decke ist, und braucht von den
     Bäumen nichts zu wissen. Dieselbe Deckung, dieselbe Unschärfe, eine
     Lage weniger. */
  lage(ctx, kasten, massstab, rand, px(0.5), 0.6, (p) => {
    p.fillStyle = dach;
    for (const s of baeume) {
      p.beginPath();
      p.ellipse(s.x, s.y - s.h * 0.58, s.h * 0.34, s.h * 0.3, 0, 0, 7);
      p.fill();
    }

    /*
     * Die Flecken sitzen auf einem **raumfesten** Gitter, nicht auf einem
     * gewürfelten Ort: Ein Fleck, dessen Lage vom Kachelrand abhinge, sässe
     * in der Nachbarkachel woanders, und die Naht wäre wieder da.
     */
    p.globalCompositeOperation = 'source-atop';
    const feld = 90;
    for (let j = Math.floor((kasten.y0 - rand) / feld); j <= Math.ceil((kasten.y1 + rand) / feld); j++) {
      for (let i = Math.floor((kasten.x0 - rand) / feld); i <= Math.ceil((kasten.x1 + rand) / feld); i++) {
        const x = (i + amOrt(i, j, 41)) * feld;
        const y = (j + amOrt(j, i, 43)) * feld;
        const r = 34 + amOrt(i, j, 47) * 52;
        const g = p.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, stil.papier);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        p.fillStyle = g;
        p.globalAlpha = 0.3 + amOrt(j, i, 53) * 0.28;
        p.beginPath();
        p.arc(x, y, r, 0, 7);
        p.fill();
      }
    }
    p.globalAlpha = 1;
    p.globalCompositeOperation = 'source-over';
  });

  /* ---- 5 · Die Kronen ---- */
  for (const s of baeume) {
    const e = stilbuch.eintrag(s.art);
    if (e) e.zeichne(ctx, s, massstab);
  }

}
