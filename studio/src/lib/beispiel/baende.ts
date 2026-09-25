/**
 * Die Bände zum Ansehen.
 *
 * Eine Liste und nicht zwei Aufrufe, und der Grund steht in der Geschichte
 * dieses Verzeichnisses: Der erste Beispielband stempelte seinen Inhalt nur
 * mit `bookId` und keiner `worldId`. Seit Fassung 8 wird nach Welt geladen –
 * fünfzig herrenlose Einträge fielen beim nächsten Start dem Buch zu, das
 * gerade vorne lag, samt neuer Herkunft. Gemessen: einundfünfzig Einträge in
 * der eigenen Welt statt einem.
 *
 * Ein zweiter Band mit eigener Ladefunktion wäre die zweite Gelegenheit für
 * denselben Fehler gewesen. Deshalb gibt es jetzt **einen** Weg ins Regal, und
 * ein neuer Band ist eine Zeile hier – nicht eine Kopie der Ladelogik.
 *
 * Was ein Band mitbringen muss, steht in `Beispielband` und sonst nirgends.
 */

import type { Entry, LibraryBook, Relation } from '../../types';

/*
 * **Hier wird nichts von den Bänden importiert.**
 *
 * Gemessen: Die Prosa der beiden Bände wog 113 kB und lag im Hauptbündel –
 * geladen von jedem, der sie nie aufschlägt, und mitverantwortlich für acht
 * Sekunden leeren Bildschirm im Mobilfunknetz.
 *
 * Ein einziger `import` einer Titelzeile hätte das ganze Modul
 * mitgebracht; Einband und Titel stehen deshalb **hier** und nicht dort. Die
 * Bandmodule tragen nur noch die Welt und werden erst geholt, wenn jemand
 * „ansehen" antippt.
 */

export interface Beispielband {
  /** Stabile Kennung – steht in keiner Oberfläche, nur in Prüfungen und Aufrufen. */
  id: string;
  /** Wie er im Regal heisst. */
  titel: string;
  /** Eine Zeile darüber, was er zeigt. Steht im Angebot, nicht im Buch. */
  worum: string;
  /** Einband, Weltname, Zeichen. */
  buch: Partial<LibraryBook>;
  /**
   * Holt den Band und baut Inhalt und Verbindungen.
   *
   * **Beide Kennungen, immer.** `bookId` sagt, wo etwas entstanden ist,
   * `worldId`, wem es gehört. Wer hier eine weglässt, baut den Fehler von
   * oben nach.
   *
   * Der Rückgabewert ist ein Versprechen, weil das Bandmodul erst in diesem
   * Augenblick geholt wird – siehe oben.
   */
  baue: (bookId: string, worldId: string) => Promise<{ entries: Entry[]; relations: Relation[] }>;
}

export const BEISPIELBAENDE: Beispielband[] = [
  {
    id: 'dragoncore',
    titel: 'Dragoncore',
    worum: 'Eine Kette aus Ursachen: ein gefällter Baum, und am Ende schweigt ein Vogel.',
    buch: {
      title: 'Dragoncore',
      subtitle: 'Ein Band zum Ansehen',
      worldName: 'Dragoncore',
      worldTagline: 'Vierzig Dächer an einem Hang, und sieben Glocken, die niemand läutet.',
      coverMaterial: 'leder',
      /*
       * `waldgruen`, nicht `moos`.
       *
       * `moos` gibt es – aber als *Band*farbe, nicht als Einbandfarbe. Der
       * Wert fiel still auf Umbra zurück, und still ist hier das Problem: Der
       * Einband sah aus wie jeder andere. Gültige Farben: `bookIdentity.ts`.
       */
      coverColor: 'waldgruen',
      emblemType: 'preset',
      emblemId: 'dragoncore',
    },
    baue: (b, w) => import('./dragoncore').then((m) => m.dragoncore(b, w)),
  },
  {
    id: 'riesen',
    /*
     * Der zweite Band zeigt bewusst eine **andere Art von Zusammenhang.**
     *
     * Im ersten läuft eine Kette von einer Ursache zu einer Wirkung – ein
     * gefällter Baum, und am Ende schweigt ein Vogel. Hier läuft sie von
     * einer **Beobachtung** zu einer Antwort: Fische stehen still, ein
     * Wärter sieht hin, ein Hang bewegt sich. Zwei Bände, die dasselbe
     * vorführen, wären einer zu viel.
     */
    titel: 'Das Observatorium der stillen Riesen',
    worum: 'Fische stehen still, ein Hang öffnet ein Auge, und eine Kuppel antwortet nach oben.',
    buch: {
      title: 'Das Observatorium der stillen Riesen',
      subtitle: 'Ein Band zum Ansehen',
      worldName: 'Das Tal der stillen Riesen',
      worldTagline: 'Der Tierwärter bemerkte es zuerst an den Kois.',
      coverMaterial: 'leinen',
      /* Leinen und Nachtblau, damit die beiden Bände im Regal auch von
         weitem zwei sind. `tinte` stand hier zuerst und gibt es nicht. */
      coverColor: 'nachtblau',
      emblemType: 'preset',
      emblemId: 'sonne',
    },
    baue: (b, w) => import('./riesen').then((m) => m.riesen(b, w)),
  },
];

/**
 * Einen Band an seiner Kennung finden.
 *
 * Ohne Rückfall auf den ersten: Ein Aufruf mit einer Kennung, die es nicht
 * gibt, ist ein Fehler im Code und keine Lage, aus der man raten sollte –
 * sonst stünde eines Tages der falsche Band im Regal, und niemand wüsste,
 * warum.
 */
export function bandMit(id: string): Beispielband | undefined {
  return BEISPIELBAENDE.find((b) => b.id === id);
}
