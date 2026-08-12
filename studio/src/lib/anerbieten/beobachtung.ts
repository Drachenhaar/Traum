/**
 * Was Dragoncore bemerkt.
 *
 * Vorweg das Wichtigste, weil es die Form dieser Datei bestimmt: **Diese
 * Maschine gibt es schon zweimal.** `lib/welt/regeln.ts` untersucht die
 * Struktur der Welt, `lib/spiegel/regeln.ts` das Werk als Ganzes. Beide lesen
 * ausschließlich vorhandene Daten, beide verändern nie etwas, beide geben
 * Befunde mit Belegen zurück. Der Auftrag verlangt genau das – und deshalb
 * entsteht hier keine dritte Maschine, sondern eine gemeinsame Form, in die
 * sich beide einfügen und in der später weitere Platz finden.
 *
 * Eine dritte zu bauen wäre der teuerste Fehler gewesen, den dieser Auftrag
 * anbietet: zwei Regelwerke, die dasselbe über dieselbe Welt sagen, mit
 * verschiedenen Worten und verschiedener Sicherheit.
 *
 * ---
 *
 * Die vier Schritte des Auftrags sind hier vier Dateien, und die Trennung ist
 * nicht Kosmetik – sie ist die Sicherheitsregel des ganzen Systems:
 *
 *   beobachtung.ts   Was ist eine Beobachtung? (diese Datei)
 *   beobachter.ts    Wer sieht was? – liest nur, verändert nie
 *   relevanz.ts      Ist das jetzt wichtig genug?
 *   anerbieten.ts    Darf jetzt gesprochen werden – und was?
 *
 * Keine dieser Dateien importiert den Speicher, keine schreibt, keine kennt
 * eine Schaltfläche. Wer hier eine Änderung an der Welt unterbringen will,
 * findet keinen Weg dazu, und das ist Absicht.
 */

/* --------------------------------------------------------- Wissensstand -- */

/**
 * Woher ein Satz kommt – und ob er zur Welt gehört.
 *
 * Die wichtigste Unterscheidung des ganzen Auftrags, und sie ist eine
 * Eigentumsfrage: Der Verfasser erschafft die Welt. Was Dragoncore bemerkt,
 * gehört nicht dazu, solange niemand es dazu erklärt hat.
 *
 *   `kanon`       – Der Verfasser hat es geschrieben. Das ist die Welt.
 *   `beobachtung` – Dragoncore hat es an den Daten gesehen. Nachvollziehbar,
 *                   aber keine Aussage über die Welt.
 *   `vorschlag`   – Etwas, das man tun könnte. Nie etwas, das getan wurde.
 *   `vermutung`   – Eine Deutung. Am weitesten von der Welt entfernt und
 *                   deshalb am deutlichsten zu kennzeichnen.
 *
 * Nichts, was diese Maschine erzeugt, beginnt je als `kanon`. Der Weg dorthin
 * führt ausschließlich über eine ausdrückliche Handlung des Verfassers – und
 * dann ist es sein Satz, nicht unserer.
 */
export type Wissensstand = 'kanon' | 'beobachtung' | 'vorschlag' | 'vermutung';

/* -------------------------------------------------------------- Belege --- */

/**
 * Worauf sich eine Beobachtung stützt.
 *
 * Ohne Belege wird nichts gezeigt. Das ist keine Empfehlung, sondern eine
 * Bedingung: Eine Beobachtung ohne nachvollziehbare Herkunft ist ein Orakel,
 * und ein Orakel hat in einem Buch nichts verloren, das jemand anderem
 * gehört.
 *
 * `warum` steht in derselben Sprache wie alles andere – „Beide leben laut
 * ihren Seiten an verschiedenen Orten" und nicht „relation_conflict(3)".
 */
export interface Beleg {
  /** Der Eintrag, auf den sich das stützt. Anklickbar. */
  entryId: string;
  /** Was daran den Ausschlag gibt, in einem halben Satz. */
  warum: string;
}

/* --------------------------------------------------------- Beobachtung --- */

/**
 * Die Art einer Beobachtung – und damit, was sie höchstens werden darf.
 *
 * Hier steht das Dragoncore-Gesetz als Datenfeld, weil es sonst irgendwann
 * jemand vergisst:
 *
 *   `technisch`   – Ein Zustand, den niemand gemeint haben kann. Eine
 *                   Beziehung auf eine gelöschte Seite, ein Ende vor dem
 *                   Anfang. Nur hieraus darf je eine Warnung werden.
 *
 *   `schoepferisch` – Alles andere. Ein Mensch nennt sich mutig und flieht
 *                   dreimal; ein Wesen lebt weit von seiner Nahrung. Das kann
 *                   Tiefe sein, es kann ein Rätsel sein, es kann Absicht
 *                   sein. Es ist **nie** ein Fehler, und es darf nie so
 *                   aussehen.
 */
export type Natur = 'technisch' | 'schoepferisch';

/**
 * Eine Beobachtung.
 *
 * `zuversicht` sagt, wie sicher das Muster *da* ist – nicht, wie wichtig es
 * ist. Die zweite Frage beantwortet `relevanz.ts` und beantwortet sie später,
 * weil sie von Dingen abhängt, die die Beobachtung nicht kennt: was schon
 * gezeigt wurde, was der Verfasser weggewinkt hat, was er gerade tut.
 *
 * Die beiden zu vermischen wäre bequem und falsch. Ein sehr sicheres Muster
 * kann völlig uninteressant sein, und ein unsicheres kann genau das sein,
 * worauf jemand seit Wochen wartet.
 */
export interface Beobachtung {
  id: string;
  /** Welcher Beobachter das gesehen hat – für Gedächtnis und Häufigkeit. */
  art: string;
  /** Worum es geht: meist ein Eintrag. Leer, wenn es die ganze Welt betrifft. */
  betrifft?: string;
  natur: Natur;
  stand: Wissensstand;
  /** Was gesehen wurde – ein Satz, ruhig, ohne Urteil. */
  text: string;
  /** Woran es liegt. Nie leer. */
  belege: Beleg[];
  /** Wie sicher das Muster da ist. 0 bis 1. */
  zuversicht: number;
}

/**
 * Trägt diese Beobachtung genug, um überhaupt gezeigt werden zu dürfen?
 *
 * Zwei Bedingungen, und beide sind hart. Ohne Beleg kein Wort – sonst steht
 * eine Behauptung da, die niemand prüfen kann. Und keine Beobachtung mit dem
 * Stand `kanon`: Was Dragoncore bemerkt, ist nie die Welt, und wer diesen
 * Stand hier setzt, hat etwas missverstanden.
 */
export function tragfaehig(b: Beobachtung): boolean {
  return b.belege.length > 0 && b.stand !== 'kanon' && b.text.trim().length > 0;
}

/* ---------------------------------------------------------- Die Stufen --- */

/**
 * Wie laut Dragoncore werden darf.
 *
 * Vier Stufen, und die erste ist der Normalfall. Das ist wörtlich gemeint:
 * Die meisten Beobachtungen werden nie jemand sehen, und das ist kein
 * verschenktes Wissen, sondern der Grund, warum die wenigen gezeigten etwas
 * gelten.
 *
 *   `still`     – Erkannt, nicht gezeigt. Der Normalfall.
 *   `leise`     – Ein Zeichen am Rand. Kein Text, keine Bewegung, kein Ton.
 *   `anerbieten`– Ein Satz und drei Antworten. Nie ein Fenster, nie ein
 *                 roter Balken, nie etwas, das aussieht wie ein Fehler.
 *   `warnung`   – Nur für `technisch`. Alles andere kann hier nicht landen,
 *                 und die Funktion darunter sorgt dafür.
 */
export type Stufe = 'still' | 'leise' | 'anerbieten' | 'warnung';

/** Ab welcher Relevanz eine Stufe überhaupt erreichbar ist. */
const AB: Record<Exclude<Stufe, 'still'>, number> = {
  leise: 0.35,
  anerbieten: 0.62,
  warnung: 0.55,
};

/**
 * Welche Stufe eine Beobachtung bei dieser Relevanz erreicht.
 *
 * Die Reihenfolge der Prüfungen ist die Aussage: Zuerst wird gefragt, ob
 * überhaupt gewarnt werden *darf*, und diese Frage hängt nicht an der
 * Relevanz, sondern an der Natur. Eine schöpferische Beobachtung erreicht
 * `warnung` bei keiner Zahl der Welt – auch nicht bei Zuversicht 1.
 */
export function stufeVon(b: Beobachtung, relevanz: number): Stufe {
  if (b.natur === 'technisch' && relevanz >= AB.warnung) return 'warnung';
  if (relevanz >= AB.anerbieten) return 'anerbieten';
  if (relevanz >= AB.leise) return 'leise';
  return 'still';
}
