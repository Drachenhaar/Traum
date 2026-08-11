/**
 * Der Leitfaden.
 *
 * Ein Buch, das keine Knöpfe zeigt, ist ruhig – und schweigt auch darüber,
 * was man tun kann. Die Führung am Anfang erklärt die Welt; danach steht man
 * vor einer schönen Seite und ahnt nicht, dass das Lesebändchen zum
 * Inhaltsverzeichnis führt oder dass der Stift am Rand die Seite öffnet.
 *
 * Also zeigt es der Leitfaden – einmal, an der Stelle, an der es passiert,
 * und nur wenn man ihn will. Drei Regeln:
 *
 *   **Einer nach dem anderen.** Nie zwei Wegweiser gleichzeitig. Ein
 *   Bildschirm mit vier Sprechblasen ist kein Leitfaden, sondern eine
 *   Bedienungsanleitung, die sich über das Buch gelegt hat.
 *
 *   **Nur, was hier ist.** Ein Wegweiser erscheint nur, wenn sein Ziel auf
 *   dieser Seite wirklich steht. Auf den Stift zu zeigen, den es hier nicht
 *   gibt, wäre schlimmer als zu schweigen.
 *
 *   **Einmal gesehen ist erledigt.** Wer weiterblättert, hat verstanden.
 *   Nichts kehrt zurück, außer man holt es zurück.
 */

/** Ein Ziel im Buch. Steht als `data-leitfaden="…"` am Element selbst. */
export interface Wegpunkt {
  id: string;
  /** Der Wert des `data-leitfaden`-Merkmals am Zielelement. */
  ziel: string;
  text: string;
  /**
   * Wo dieser Wegpunkt gilt – Anfang der Adresse. Leer heißt: überall.
   * So zeigt der Stift nur auf Eintragsseiten und die Karte nur im Anhang.
   */
  pfad?: string;
}

/*
 * Die Reihenfolge ist die Reihenfolge des Lernens, nicht die des Bildschirms:
 * erst wohin man kommt, dann wie man etwas festhält, dann wie man es
 * wiederfindet, dann das Feine.
 */
export const WEGPUNKTE: Wegpunkt[] = [
  {
    id: 'inhalt',
    ziel: 'inhalt',
    text: 'Das Lesebändchen führt zum Inhaltsverzeichnis – deine Übersicht über alles, was im Buch steht.',
  },
  {
    id: 'gedanke',
    ziel: 'gedanke',
    text: 'Ein Einfall? Hier hineintippen und sichern. Was daraus wird, entscheidest du später – oder nie.',
  },
  {
    id: 'suche',
    ziel: 'suche',
    text: 'Die Suche findet nicht nur Namen, sondern auch Jahre, Verbindungen und die Blätter des Buches selbst.',
  },
  {
    id: 'bearbeiten',
    ziel: 'bearbeiten',
    pfad: '/eintrag/',
    text: 'Der Stift macht aus der Seite eine Arbeitsfläche. Danach ist sie sofort wieder eine Buchseite.',
  },
  {
    id: 'mehr',
    ziel: 'mehr',
    pfad: '/eintrag/',
    text: 'Alles Seltene liegt hier gefaltet: drucken, vorlesen, duplizieren, aus dem Buch nehmen.',
  },
  {
    id: 'anhaenge',
    ziel: 'anhang:/roman',
    pfad: '/anhang',
    text: 'Hinten im Buch entsteht etwas: Hier schreibst du, während deine Welt danebensteht.',
  },
];

/** Was der Leitfaden sich merkt. Liegt in den Einstellungen. */
export interface Leitfadenstand {
  an: boolean;
  erledigt: string[];
}

export const LEITFADEN_START: Leitfadenstand = { an: true, erledigt: [] };

/**
 * Der nächste Wegpunkt, der hier gilt und noch nicht erledigt ist.
 *
 * `vorhanden` beantwortet, ob das Ziel auf dieser Seite wirklich steht – das
 * weiß nur die Oberfläche, deshalb kommt es von dort.
 */
export function naechsterWegpunkt(
  stand: Leitfadenstand | undefined,
  pfad: string,
  vorhanden: (ziel: string) => boolean,
): Wegpunkt | undefined {
  if (!stand?.an) return undefined;
  const erledigt = new Set(stand.erledigt);
  return WEGPUNKTE.find(
    (w) => !erledigt.has(w.id) && (!w.pfad || pfad.startsWith(w.pfad)) && vorhanden(w.ziel),
  );
}

/** Wie weit ist der Leitfaden? Für die stille Zeile in den Einstellungen. */
export function leitfadenStand(stand: Leitfadenstand | undefined): {
  erledigt: number;
  gesamt: number;
} {
  return { erledigt: stand?.erledigt.length ?? 0, gesamt: WEGPUNKTE.length };
}
