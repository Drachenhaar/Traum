/**
 * Wie ein Baum aussieht.
 *
 * Getrennt vom Bauteil, weil es hier nur um Striche geht und um nichts sonst –
 * kein Zustand, kein React, keine Karte. Die Funktion bekommt einen Kontext
 * und einen Baum und zeichnet ihn.
 *
 * **Warum Canvas und nicht SVG.** Ein Wald sind schnell zweitausend Bäume.
 * Als SVG wären das zweitausend Knoten im Dokument, die der Browser bei jeder
 * Verschiebung neu bewerten muss – auf einem Telefon ist das der Unterschied
 * zwischen einer Karte, die gleitet, und einer, die ruckt. Auf Canvas sind es
 * zweitausend Striche, und der Browser weiß von keinem einzigen.
 *
 * Die Umrisse bleiben trotzdem SVG: Sie sind wenige, man muss sie treffen
 * können, und ein Pfad, den man antippen kann, ist im Dokument besser
 * aufgehoben als in einer Trefferberechnung von Hand.
 *
 * **Warum die Bäume so schlicht sind.** Drei Formen, ein Stamm, eine Krone,
 * keine Blätter. Ein detaillierter Baum sieht einzeln besser aus und in
 * Massen schlechter: Aus zweihundert genauen Bäumen wird ein Fleck, aus
 * zweihundert angedeuteten wird ein Wald. Das ist keine Sparsamkeit, das ist
 * der Unterschied zwischen Illustration und Karte.
 */

import type { Baum } from '../../lib/karte/wald';
import type { Kartenstil } from '../../lib/karte/stil';

/**
 * Grundgröße eines Baumes im Kartenmaß (0…1000).
 *
 * Ungefähr so groß wie der mittlere Abstand der Bäume (`WALD_VORGABE.abstand`),
 * und das ist kein Zufall: Sind die Bäume deutlich kleiner, sieht ein Wald aus
 * wie gesprenkelter Pfeffer – man zählt Punkte, statt eine Fläche zu sehen.
 * Sind sie größer, verschmelzen sie zu einem Fleck. Bei etwa gleichauf
 * berühren sich die Kronen gerade so, und das Auge liest „Wald".
 */
const GROESSE = 15;

export function zeichneBaum(
  ctx: CanvasRenderingContext2D,
  baum: Baum,
  stil: Kartenstil,
  massstab: number,
): void {
  const h = GROESSE * baum.groesse;
  /*
   * Unter einem halben Bildschirmpunkt wird aus einem Baum ein Staubkorn –
   * dann ist ein Punkt ehrlicher und zehnmal billiger als drei Bögen.
   */
  if (h * massstab < 1.6) {
    ctx.fillStyle = stil.wald.laub;
    ctx.fillRect(baum.x, baum.y - h * 0.4, h * 0.5, h * 0.5);
    return;
  }

  ctx.save();
  ctx.translate(baum.x, baum.y);
  ctx.rotate(baum.neigung);

  /* Der Stamm: eine Linie, mehr braucht es bei dieser Größe nicht. */
  ctx.strokeStyle = stil.wald.stamm;
  ctx.lineWidth = Math.max(0.3, h * 0.09);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -h * 0.42);
  ctx.stroke();

  ctx.fillStyle = stil.wald.laub;
  ctx.beginPath();
  if (baum.form === 1) {
    /* Nadelbaum – zwei Stufen, damit die Silhouette nicht dreieckig wirkt. */
    ctx.moveTo(0, -h);
    ctx.lineTo(h * 0.34, -h * 0.42);
    ctx.lineTo(h * 0.2, -h * 0.46);
    ctx.lineTo(h * 0.42, -h * 0.06);
    ctx.lineTo(-h * 0.42, -h * 0.06);
    ctx.lineTo(-h * 0.2, -h * 0.46);
    ctx.lineTo(-h * 0.34, -h * 0.42);
    ctx.closePath();
  } else if (baum.form === 2) {
    /* Ein breiter Busch – drei überlappende Bögen. */
    ctx.arc(-h * 0.22, -h * 0.5, h * 0.28, 0, Math.PI * 2);
    ctx.arc(h * 0.22, -h * 0.5, h * 0.26, 0, Math.PI * 2);
    ctx.arc(0, -h * 0.66, h * 0.3, 0, Math.PI * 2);
  } else {
    /* Der Laubbaum – eine Krone, leicht aus der Mitte, damit nichts wie
     * gestempelt aussieht. */
    ctx.ellipse(0, -h * 0.62, h * 0.36, h * 0.4, 0, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}
