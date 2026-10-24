/**
 * Das Staffageraster – damit eine Kachel nicht die ganze Karte durchsieht.
 *
 * ---
 *
 * **Der Fehler, den es behebt, war gemessen und nicht vermutet.**
 *
 * Der erste Anlauf ließ jede Kachel über die **gesamte** Staffageliste laufen
 * und die Stücke ausserhalb überspringen. Bei 575 Bäumen und 36 sichtbaren
 * Kacheln sind das 20 700 Durchläufe für ein vollständiges Backen – und es
 * wächst mit dem Produkt aus beidem. Genau das Verhalten, das die Kacheln
 * eigentlich abschaffen sollten, nur eine Stufe höher.
 *
 * Gemessen an der Karte mit zwei Wäldern war der gekachelte Weg deshalb beim
 * Zoomen **doppelt so teuer** wie der alte.
 *
 * ---
 *
 * **Warum ein festes Raster und nicht die Kachelstufe.**
 *
 * Die Zellgröße hängt bewusst *nicht* an der Kachelstufe. Sonst bräuchte man
 * je Stufe ein eigenes Raster, und beim Zoomen entstünde fünfmal dasselbe.
 * Eine Zelle von 50 Karteneinheiten ist grob genug, dass das Raster klein
 * bleibt, und fein genug, dass eine Kachel der feinsten Stufe (31 Einheiten)
 * höchstens vier Zellen anfasst.
 */

import type { Staffage } from './staffage';

/** Kantenlänge einer Rasterzelle im Kartenmaß. */
export const ZELLE = 50;

export class Staffageraster {
  private zellen = new Map<number, Staffage[]>();

  constructor(liste: Staffage[]) {
    for (const s of liste) {
      const z = this.schluessel(Math.floor(s.x / ZELLE), Math.floor(s.y / ZELLE));
      const f = this.zellen.get(z);
      if (f) f.push(s);
      else this.zellen.set(z, [s]);
    }
  }

  /**
   * Eine Zahl statt einer Zeichenkette als Schlüssel.
   *
   * Eine Karte ist 1000 Einheiten breit, also gibt es 20 Zellen je Achse –
   * mit Überstand und Rundung großzügig 4096. Das passt in eine Zahl, und
   * eine Zahl als Schlüssel spart je Nachschlag das Zusammenbauen einer
   * Zeichenkette. Bei zehntausend Nachschlägen je Bild ist das messbar.
   */
  private schluessel(i: number, j: number): number {
    return (i + 2048) * 4096 + (j + 2048);
  }

  /**
   * Alles, was diesen Kasten berühren kann – in Malreihenfolge.
   *
   * Die Liste kommt sortiert heraus, weil die Tiefensortierung sonst je
   * Kachel verloren ginge: Ein Baum muss auch innerhalb einer Kachel vor dem
   * stehen, was hinter ihm liegt.
   */
  imKasten(x0: number, y0: number, x1: number, y1: number): Staffage[] {
    const aus: Staffage[] = [];
    const i0 = Math.floor(x0 / ZELLE), i1 = Math.floor(x1 / ZELLE);
    const j0 = Math.floor(y0 / ZELLE), j1 = Math.floor(y1 / ZELLE);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const z = this.zellen.get(this.schluessel(i, j));
        if (z) aus.push(...z);
      }
    }
    aus.sort((a, b) => (a.ebene - b.ebene) || (a.y - b.y));
    return aus;
  }
}
