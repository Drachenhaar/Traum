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
  { form: 'kopf-profil', name: 'Kopf, im Profil' },
  { form: 'schultern', name: 'Schultern' },
  { form: 'schultern-seite', name: 'Schultern, von der Seite' },
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
    case 'kopf-profil':
      /*
       * Der Kopf von der Seite – nach links gewandt, wie alle Seitenformen.
       *
       * Nach *links*, weil die Spiegelregel dann die rechte Ansicht umsonst
       * mitliefert. Welche der beiden Seiten man zeichnet, ist eine
       * Verabredung; sie überhaupt zu treffen ist der Punkt, sonst zeigen
       * eingebaute Formen und eigene Zeichnungen in verschiedene Richtungen.
       *
       * Die Nase ist der ganze Unterschied zwischen einem Profil und einem
       * Ei. Ohne sie sähe man nicht, dass die Figur sich abgewandt hat.
       *
       * Sie zeigt nach links, und das ist keine Kleinigkeit: Im ersten Anlauf
       * lag sie rechts. Die Zeichnung war für sich in Ordnung, hiess „nach
       * links" und blickte nach rechts – gesehen hat man es sofort, gerechnet
       * hätte man es nie.
       */
      return 'M46 11C33 11 28 22 30 34C31 36 32 37 32 39L26 48C26 50 30 51 34 51C33 53 32 54 32 56C33 57 34 57 34 58C32 59 32 60 33 62C34 65 38 66 43 66L58 66C67 66 72 60 74 50C76 42 77 32 74 25C70 15 58 11 46 11Z';
    case 'schultern':
      /* Hals und zwei Schultern, unten offen – sie laufen aus dem Bild. */
      return 'M50 56c7 0 11 4 11 12l14 6c10 4 16 12 18 20l2 6H5l2-6c2-8 8-16 18-20l14-6c0-8 4-12 11-12z';
    case 'schultern-seite':
      /*
       * Dieselbe Büste, seitlich: die Brust nach vorn, der Rücken dahinter.
       * Ebenfalls nach links – siehe oben.
       *
       * Sie musste dreimal gezeichnet werden, und zweimal war der Fehler
       * derselbe: Ich hatte die Vorderansicht gespiegelt statt eine
       * Seitenansicht gebaut. Gespiegelt ist eine Büste aber immer noch
       * symmetrisch – am Bild sah man eine Glocke, keinen Menschen. Eine
       * Seitenansicht ist **unsymmetrisch**: Die Brust reicht weiter nach
       * vorn, als der Rücken nach hinten reicht.
       */
      return 'M52 56C47 56 45 60 46 67L28 75C16 81 9 90 8 100L86 100C87 85 83 75 74 71L64 66C65 60 60 56 56 56Z';
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
