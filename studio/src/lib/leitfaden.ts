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
  {
    /*
     * Der Weg aus dem Buch heraus.
     *
     * Er steht hier, weil ihn sonst niemand findet: Dieses Buch ist die ganze
     * Welt, solange man nicht weiss, dass daneben Platz ist. Und weil das
     * Anlegen eines weiteren Buches in der Bibliothek liegt, ist dieser
     * Wegweiser zugleich der einzige Hinweis darauf, dass es weitere geben
     * kann.
     */
    id: 'regal',
    ziel: 'regal',
    pfad: '/anhang',
    text: 'Dein Buch steht in einer Bibliothek. Hier klappst du es zu – und beginnst, wenn du magst, ein zweites.',
  },

  /*
   * Ab hier: die Bereiche.
   *
   * Jeder dieser Wegweiser hat einen `pfad` und schweigt deshalb ueberall
   * sonst. Man bekommt sie nicht vorgesetzt, sondern trifft sie an, wenn man
   * das erste Mal dort steht – und dann zeigen sie auf das eine, was diesen
   * Ort ausmacht und was man sonst uebersieht.
   */
  {
    id: 'karte',
    ziel: 'karte-zeit',
    pfad: '/karte',
    text: 'Ein Jahr wählen – und die Karte zeigt, was damals bestand. Die Sterne wandern nicht, nur ihr Licht ändert sich.',
  },
  {
    id: 'setzerei',
    ziel: 'setzerei-feld',
    pfad: '/setzerei',
    text: 'Geschriebenes hier einlegen – auch aus einem Gespräch mit ChatGPT. Das Buch erkennt die Angaben und setzt daraus eine Seite.',
  },
  {
    id: 'chronik',
    ziel: 'chronik-papierkorb',
    pfad: '/chronik',
    text: 'Nichts geht verloren: Entnommene Seiten warten hier, und frühere Fassungen lassen sich zurückholen.',
  },
  {
    id: 'kapitelzeichen',
    ziel: 'kapitelzeichen',
    pfad: '/schreiben/',
    text: 'Das Lesebändchen fächert die Kapitel auf. Antippen springt – danach faltet es sich wieder zusammen.',
  },
  {
    id: 'szenenblatt',
    ziel: 'szenenblatt',
    pfad: '/schreiben/',
    text: 'Hier steht, wer vorkommt und wo es spielt – und was die Welt zu dieser Zeit dazu sagt. Es öffnet neben dem Text, nicht darüber.',
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
  const offen = WEGPUNKTE.filter(
    (w) => !erledigt.has(w.id) && (!w.pfad || pfad.startsWith(w.pfad)) && vorhanden(w.ziel),
  );
  /*
   * Wer gerade auf der Faltkarte steht, soll etwas ueber die Faltkarte
   * hoeren – nicht ueber das Lesebaendchen, das es ueberall gibt. Was an
   * einen Ort gebunden ist, geht deshalb vor.
   */
  return offen.find((w) => w.pfad) ?? offen[0];
}

/** Wie weit ist der Leitfaden? Für die stille Zeile in den Einstellungen. */
export function leitfadenStand(stand: Leitfadenstand | undefined): {
  erledigt: number;
  gesamt: number;
} {
  return { erledigt: stand?.erledigt.length ?? 0, gesamt: WEGPUNKTE.length };
}
