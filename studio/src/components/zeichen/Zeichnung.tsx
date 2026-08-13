/**
 * Ein Bauplan, gezeichnet.
 *
 * Die ganze Darstellung des Baukastens steht hier, und sie ist absichtlich
 * dünn: Ein `<g>` je Ebene, eine Verschiebung, eine Drehung, eine Spiegelung.
 * Alles Weitere – Farbe, Prägung, Licht – kommt von außen, so wie bei jedem
 * anderen Zeichen dieses Buches auch.
 *
 * Deshalb kann diese Komponente an jeder Stelle stehen, an der bisher ein
 * fertiges Zeichen stand: auf dem Einband, auf der Besitzseite, auf dem
 * Buchrücken, im Regal. Sie weiß nicht, wo sie ist, und muss es nicht wissen.
 */

import type { Emblem } from '../../lib/zeichen/emblem';
import { teilById } from '../../lib/zeichen/teile';

export function Zeichnung({
  emblem,
  size = 120,
  color = 'currentColor',
  className,
}: {
  emblem: Emblem;
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      style={{ color }}
      stroke="currentColor"
      aria-hidden
    >
      {emblem.layers.map((l) => {
        const teil = teilById(l.teil);
        if (!teil?.zeichnung) return null;
        /*
         * Die Reihenfolge der Umformungen ist nicht beliebig.
         *
         * Erst an den Platz, dann um den *eigenen* Mittelpunkt drehen und
         * spiegeln. Andersherum drehte sich jede Ebene um die Mitte des
         * ganzen Zeichens – ein Stern, den man kippen will, wanderte dann
         * quer durchs Bild, statt sich zu neigen.
         *
         * `x` und `y` sind Anteile; 100 ist die Breite des Feldes.
         */
        const t = [
          `translate(${l.x * 100} ${l.y * 100})`,
          'translate(50 50)',
          `rotate(${l.drehung})`,
          `scale(${l.gespiegelt ? -l.scale : l.scale} ${l.scale})`,
          'translate(-50 -50)',
        ].join(' ');
        return (
          <g key={l.id} transform={t} opacity={l.deckkraft}>
            {teil.zeichnung}
          </g>
        );
      })}
    </svg>
  );
}
