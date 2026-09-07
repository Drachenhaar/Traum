/**
 * Die Grundformen des Baukastens.
 *
 * **Das sind keine Portraits, und sie sollen auch keine sein.**
 *
 * `lib/zeichen/embleme.tsx` hält fest, was vier Anläufe an einem gezeichneten
 * Drachen gekostet haben, und die Lehre daraus steht dort ausdrücklich: Ein
 * Lebewesen besteht nicht aus zwei Bögen. Ein gezeichnetes Gesicht als
 * eingebauter Vektor wäre derselbe Fehler noch einmal – nur dass diesmal
 * jede Figur des Buches ihn tragen würde.
 *
 * Also Silhouetten. Sie sagen »hier gehört eine Zeichnung hin« und geben
 * dem Baukasten am ersten Tag etwas zu zeigen, ohne sich als Kunst
 * auszugeben. Sobald eine eigene Zeichnung da ist, verschwinden sie
 * dahinter, und niemand vermisst sie.
 *
 * Sie sind **tönbar**: einfarbige Flächen, die jede Farbe annehmen. Damit
 * sind sie von Anfang an das, was der ganze Baukasten sein soll – wenig
 * Zeichnung, viel Vielfalt.
 */

import type { Grundform } from '../../lib/baukasten';

/**
 * Alle Formen zeichnen in dasselbe Feld von 100 × 100.
 *
 * Eine Zeichnung ist dann austauschbar gegen eine andere, ohne dass irgendwo
 * gerechnet werden muss – und ein hochgeladenes Bild wird in dasselbe Feld
 * gelegt. Das ist der Grund, warum der Versatz in Prozent angegeben wird und
 * nicht in Punkten: Prozente überleben jeden Grössenwechsel.
 */
export const FELD = 100;

export const GRUNDFORMEN: { form: Grundform; name: string }[] = [
  { form: 'kopf-rund', name: 'Kopf, rund' },
  { form: 'kopf-schmal', name: 'Kopf, schmal' },
  { form: 'kopf-kantig', name: 'Kopf, kantig' },
  { form: 'schultern', name: 'Schultern' },
  { form: 'scheibe', name: 'Scheibe' },
];

/**
 * Der Pfad einer Grundform.
 *
 * Bewusst wenige Punkte. Eine Silhouette, die viele Punkte braucht, ist
 * keine Silhouette mehr, sondern eine schlechte Zeichnung.
 *
 * ---
 *
 * **Die Verhältnisse, und warum sie zweimal gezeichnet wurden.**
 *
 * Im ersten Anlauf reichte der Kopf bis y = 83 und die Schultern begannen bei
 * y = 44. Jede Zahl für sich war vertretbar, übereinandergelegt ergaben sie
 * ein Ei auf einem Hügel: Der Kopf lag mit halbem Kinn *vor* der Brust, weil
 * er nach ihr gezeichnet wird. Aufgefallen ist es erst am Bild – gerechnet
 * hatte es niemand.
 *
 * Jetzt teilen sich alle Formen dieselbe Ordnung, und nur deshalb passen sie
 * aufeinander:
 *
 *     y 10 – 66   der Kopf
 *     y 56 – 68   der Hals (der Kopf deckt ihn oben ab)
 *     y 68 – 100  die Schultern, unten aus dem Bild laufend
 *
 * Wer eine eigene Zeichnung dazulegt, hat damit eine Angabe, an der er sich
 * ausrichten kann – und das ist mehr wert als jede einzelne dieser Formen.
 */
export function grundformPfad(form: Grundform): string {
  switch (form) {
    case 'kopf-rund':
      /* Ein Ei, unten etwas schwerer – so sitzt ein Kopf. */
      return 'M50 10c14 0 23 11 23 25 0 17-10 31-23 31S27 52 27 35c0-14 9-25 23-25z';
    case 'kopf-schmal':
      return 'M50 9c11 0 18 10 18 25 0 19-8 33-18 33S32 53 32 34c0-15 7-25 18-25z';
    case 'kopf-kantig':
      /* Eckige Kiefer: gerade Kanten statt Bögen, sonst ist es wieder das Ei. */
      return 'M50 10c13 0 22 9 22 22l-2 17-7 13-13 5-13-5-7-13-2-17c0-13 9-22 22-22z';
    case 'schultern':
      /* Hals und zwei Schultern, unten offen – sie laufen aus dem Bild. */
      return 'M50 56c7 0 11 4 11 12l14 6c10 4 16 12 18 20l2 6H5l2-6c2-8 8-16 18-20l14-6c0-8 4-12 11-12z';
    case 'scheibe':
      /* Für den Grund: eine Fläche, vor der etwas stehen kann. */
      return 'M50 6a44 44 0 110 88 44 44 0 010-88z';
  }
}

/** Eine Grundform als Bild, in einem Feld von 100 × 100. */
export function Grundformbild({
  form,
  farbe = 'currentColor',
  className,
}: {
  form: Grundform;
  farbe?: string;
  className?: string;
}) {
  return (
    <svg viewBox={`0 0 ${FELD} ${FELD}`} className={className} aria-hidden focusable="false">
      <path d={grundformPfad(form)} fill={farbe} />
    </svg>
  );
}
