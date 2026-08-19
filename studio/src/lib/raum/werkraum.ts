/**
 * Der Arbeitsraum – Kontext statt globaler Navigation.
 *
 * Bis hierher bedeuteten die vier Richtungen überall dasselbe: links war
 * immer „Die Welt umher", rechts war immer drei Ebenen tief, oben war immer
 * „Wissen". Das ist eine globale Navigation mit Gesten statt mit Knöpfen –
 * und damit genau das, was Dragoncore nicht sein soll.
 *
 * Wer an einer Figur arbeitet, braucht andere Wege als jemand, der schreibt.
 * Wer auf einer Karte steht, braucht wieder andere. Die Oberfläche soll nicht
 * zeigen, was sie alles kann, sondern was gerade Bedeutung hat.
 *
 * ---
 *
 * **Was sich ändert und was nicht.**
 *
 * Die *Grammatik* bleibt in jedem Arbeitsraum Wort für Wort dieselbe:
 *
 *   – vier Richtungen, immer alle vier
 *   – ziehen deutet an, weiter ziehen verpflichtet, loslassen entscheidet
 *   – dieselbe Richtung nochmal geht tiefer, die Gegenrichtung zurück
 *   – ein Doppeltipp führt heim
 *
 * Was sich ändert, ist der *Wortschatz*: wie eine Richtung hier heißt, was
 * dort liegt und wie weit sie reicht.
 *
 * Warum alle vier Richtungen immer offen bleiben, auch wenn eine davon im
 * Romanraum wenig zu sagen hat: Eine Tür, die manchmal fehlt, ist schlimmer
 * als eine Tür, die in einen kleinen Raum führt. Beim ersten Mal hält man das
 * für kaputt, beim zweiten Mal traut man der Geste nicht mehr – und eine
 * Bedienung, der man nicht traut, benutzt man nicht.
 *
 * ---
 *
 * **Warum hier keine neuen Räume entstehen.**
 *
 * Die sechs Inhalte, die es gibt, gibt es schon: Wesen, Zusammenhang,
 * Geflecht, Welt, Wissen, Notizen. Diese Datei erfindet keinen siebten – das
 * wären neue Produktfunktionen, und die stehen ausdrücklich nicht im Auftrag.
 * Sie ordnet die vorhandenen sechs je Arbeitsraum neu an, benennt sie in der
 * Sprache dieses Raums und legt fest, wie tief man kommt.
 *
 * Das ist weniger, als es klingt, und mehr, als es aussieht: Es ist die
 * Stelle, an der später ein D&D-Raum, ein Artbook-Raum mit Varianten oder ein
 * Romanraum mit Szenen dazukommt, **ohne dass eine Komponente sich ändert**.
 * Genau darum steht es in einer eigenen Datei und nicht in `Tiefenraum.tsx`.
 */

import type { Richtung } from './geste';

/** In welchem Arbeitsraum steht der Benutzer gerade? */
export type Werkraum = 'buch' | 'welt' | 'charakter' | 'roman' | 'artbook';

/**
 * Die Inhalte, die es gibt.
 *
 * Bewusst eine geschlossene Aufzählung und keine freie Zeichenkette: Ein
 * Tippfehler in einer Tabelle weiter unten wäre sonst ein Raum, der still
 * leer bleibt. Genau dieser Fehler ist in diesem Projekt schon einmal
 * passiert – zwei Tiefenräume behaupteten monatelang, in diesem Buch lebe
 * niemand, weil dort `wesen` statt `bewohner` stand.
 */
export type Raumkennung = 'wesen' | 'zusammenhang' | 'geflecht' | 'welt' | 'wissen' | 'notizen';

export interface Weg {
  /** Wie diese Richtung *hier* heißt. */
  name: string;
  /** Was dort liegt – eine Zeile, kein Satz. */
  was: string;
  /** Die Überschrift je Ebene. Länge bestimmt, wie tief der Weg reicht. */
  ebenen: { titel: string; raum: Raumkennung }[];
}

export type Wege = Record<Richtung, Weg>;

/* ------------------------------------------------------------ Die Tabelle -- */

/*
 * Ein paar Bausteine, damit die Tabelle darunter lesbar bleibt.
 *
 * Sie sind Funktionen und keine geteilten Objekte: Zwei Arbeitsräume, die
 * sich versehentlich denselben Weg teilen, wären ein Fehler, den man erst
 * bemerkt, wenn jemand einen davon ändert.
 */
const notizen = (name = 'Notizen', was = 'Gedanken · Fundstücke'): Weg => ({
  name,
  was,
  ebenen: [{ titel: 'Was sich angesammelt hat', raum: 'notizen' }],
});

const wissen = (name = 'Wissen', titel = 'Was darüber bekannt ist'): Weg => ({
  name,
  was: 'Zusammenhang · Tiefe',
  ebenen: [{ titel, raum: 'wissen' }],
});

/**
 * Was in welchem Arbeitsraum in welcher Richtung liegt.
 *
 * Zu lesen als: „Im Charakterraum führt rechts zu den Beziehungen und reicht
 * drei Ebenen weit; links führt zur Herkunft und reicht zwei."
 *
 * Die Tiefen sind nicht dekorativ. Sie sind die Antwort auf §9: Tiefe ist
 * nicht binär. Wo ein Arbeitsraum tatsächlich etwas zu sagen hat, reicht der
 * Weg weiter; wo nicht, endet er nach einer Ebene, statt eine zweite mit
 * denselben Daten in anderer Anordnung zu füllen.
 */
export const WERKRAEUME: Record<Werkraum, Wege> = {
  /*
   * BUCH – der Heimatraum, und die Fassung, die es vorher überall gab.
   *
   * Er bleibt absichtlich unverändert: Wer das Buch kennt, soll nach dieser
   * Änderung nichts Neues lernen müssen. Die anderen Räume sind Abweichungen
   * *von hier*.
   */
  buch: {
    links: {
      name: 'Welt',
      was: 'Orte · Raum · Geografie',
      ebenen: [{ titel: 'Die Welt umher', raum: 'welt' }],
    },
    rechts: {
      name: 'Wesen',
      was: 'Charaktere · Beziehungen',
      ebenen: [
        { titel: 'Wesen in der Nähe', raum: 'wesen' },
        { titel: 'Wie sie zusammenhängen', raum: 'zusammenhang' },
        { titel: 'Das ganze Geflecht', raum: 'geflecht' },
      ],
    },
    oben: wissen(),
    unten: notizen(),
  },

  /*
   * WELT – die Karte ist die Mitte.
   *
   * Hier liegt das Gewicht links: Wer auf einer Karte steht, will von Orten
   * zu dem, was über sie bekannt ist. Die Wesen bleiben erreichbar, aber
   * nicht bis ins ganze Geflecht – das gehört zum Charakterraum, und wer es
   * braucht, holt eine Figur in die Mitte.
   */
  welt: {
    links: {
      name: 'Orte',
      was: 'Wo es liegt · was dort ist',
      ebenen: [
        { titel: 'Orte dieser Welt', raum: 'welt' },
        { titel: 'Was über sie bekannt ist', raum: 'wissen' },
      ],
    },
    rechts: {
      name: 'Bewohner',
      was: 'Wer dort lebt',
      ebenen: [
        { titel: 'Wer hier lebt', raum: 'wesen' },
        { titel: 'Wie sie zusammenhängen', raum: 'zusammenhang' },
      ],
    },
    oben: wissen('Wissen', 'Was über diese Gegend bekannt ist'),
    unten: notizen('Notizen', 'Was am Wegrand liegt'),
  },

  /*
   * CHARAKTER – die Figur ist die Mitte und bleibt der Anker.
   *
   * Der tiefste Weg des Systems, und der einzige, der bis zum ganzen
   * Geflecht reicht: Charakter → Beziehungen → einzelne Beziehung → das
   * ganze Netz. Links geht es zur Herkunft und von dort zum Ort.
   */
  charakter: {
    links: {
      name: 'Herkunft',
      was: 'Woher · wohin',
      ebenen: [
        { titel: 'Woher diese Figur kommt', raum: 'welt' },
        { titel: 'Was über diesen Ort bekannt ist', raum: 'wissen' },
      ],
    },
    rechts: {
      name: 'Beziehungen',
      was: 'Wer dazugehört',
      ebenen: [
        { titel: 'Wer dieser Figur nahesteht', raum: 'wesen' },
        { titel: 'Wie sie zusammenhängen', raum: 'zusammenhang' },
        { titel: 'Das ganze Geflecht', raum: 'geflecht' },
      ],
    },
    oben: wissen('Wissen', 'Was über diese Figur bekannt ist'),
    unten: notizen('Notizen', 'Was zu ihr notiert wurde'),
  },

  /*
   * ROMAN – der ruhigste Raum von allen.
   *
   * Die Mitte ist Text. Figuren, Schauplätze und Notizen sind erreichbar und
   * **nicht sichtbar**; die Weltmaschine darf beim Schreiben nicht
   * mitreden. Deshalb reicht hier kein Weg über zwei Ebenen hinaus: Wer beim
   * Schreiben drei Ebenen tief geht, schreibt nicht mehr.
   */
  roman: {
    links: {
      name: 'Schauplätze',
      was: 'Wo es spielt',
      ebenen: [{ titel: 'Wo diese Geschichte spielt', raum: 'welt' }],
    },
    rechts: {
      name: 'Figuren',
      was: 'Wer darin vorkommt',
      ebenen: [
        { titel: 'Wer darin vorkommt', raum: 'wesen' },
        { titel: 'Wie sie zueinander stehen', raum: 'zusammenhang' },
      ],
    },
    oben: wissen('Zusammenhang', 'Was dahintersteht'),
    unten: notizen('Notizen', 'Randnotizen · Einfälle'),
  },

  /*
   * ARTBOOK – galerieartig, wenig Chrome.
   *
   * Das Bild ist die Mitte. Was daneben liegt, ist eine Auskunft und keine
   * Arbeitsfläche – deshalb überall eine Ebene, außer bei den Wesen: Wer
   * abgebildet ist, führt sinnvoll noch einen Schritt weiter.
   */
  artbook: {
    links: {
      name: 'Schauplatz',
      was: 'Wo es spielt',
      ebenen: [{ titel: 'Wo das hier liegt', raum: 'welt' }],
    },
    rechts: {
      name: 'Abgebildet',
      was: 'Wer darauf zu sehen ist',
      ebenen: [
        { titel: 'Wer hier zu sehen ist', raum: 'wesen' },
        { titel: 'Wie sie zusammenhängen', raum: 'zusammenhang' },
      ],
    },
    oben: wissen('Wissen', 'Was dazu bekannt ist'),
    unten: notizen('Fundstücke', 'Was dazugehört'),
  },
};

/* ------------------------------------------------------- Wo bin ich? ------ */

/**
 * Aus welchem Pfad ergibt sich welcher Arbeitsraum?
 *
 * Aufgezählt, nicht geraten – und mit `buch` als Rückfall, weil das Buch der
 * Heimatraum ist. Ein unbekannter Pfad landet damit in der Fassung, die
 * überall funktioniert, statt in einer, die zufällig passt.
 *
 * `ankerTyp` entscheidet den einzigen Fall, den der Pfad allein nicht
 * beantworten kann: `/eintrag/:id` ist ein Charakterraum, wenn dort eine
 * Figur steht, und sonst der gewöhnliche Buchraum. Ein Ort ist keine Figur,
 * und ihm „Beziehungen" als tiefsten Weg anzubieten wäre eine Auskunft, die
 * nicht stimmt.
 */
export function werkraumVon(pfad: string, ankerTyp?: string): Werkraum {
  if (pfad.startsWith('/weltkarte') || pfad.startsWith('/karte') || pfad.startsWith('/reise'))
    return 'welt';
  if (pfad.startsWith('/schreiben') || pfad.startsWith('/roman')) return 'roman';
  if (pfad.startsWith('/tafeln') || pfad.startsWith('/tafelteil') || pfad.startsWith('/lose-blaetter'))
    return 'artbook';
  if (pfad.startsWith('/spiegel')) return 'charakter';
  /*
   * Ein Eintrag ist der Arbeitsraum dessen, was in ihm steht.
   *
   * Eine Figur bringt ihre Beziehungen mit und reicht bis ins ganze Geflecht.
   * Ein Ort bringt seine Umgebung mit: Wer dort lebt, was darüber bekannt
   * ist. Beides demselben Weg zuzuordnen hieße, einem Ort „Beziehungen" als
   * tiefsten Weg anzubieten – eine Auskunft, die nicht stimmt.
   *
   * Alles andere – ein Gegenstand, ein Ereignis, eine Stimme – landet im
   * Buchraum. Nicht aus Verlegenheit: Der Buchraum ist der Heimatraum, und
   * ein Eintrag ohne eigenen Charakter ist genau das, was er ist – eine Seite
   * in einem Buch.
   */
  if (pfad.startsWith('/eintrag/')) {
    if (ankerTyp === 'character') return 'charakter';
    if (ankerTyp === 'location') return 'welt';
    return 'buch';
  }
  return 'buch';
}

/** Die vier Wege dieses Arbeitsraums. */
export function wege(w: Werkraum): Wege {
  return WERKRAEUME[w] ?? WERKRAEUME.buch;
}

/** Der Weg in eine Richtung – benannt, beschrieben, so tief wie er reicht. */
export function weg(w: Werkraum, r: Richtung): Weg {
  return wege(w)[r];
}

/**
 * Wie tief dieser Weg hier reicht.
 *
 * Nie null: Jede Richtung führt mindestens eine Ebene weit, sonst wäre die
 * Grammatik nicht mehr überall dieselbe.
 */
export function hoechsteTiefe(w: Werkraum, r: Richtung): number {
  return Math.max(1, weg(w, r).ebenen.length);
}

/**
 * Welcher Inhalt steht auf dieser Ebene?
 *
 * Über das Ende hinaus wird die letzte Ebene wiederholt statt `undefined`
 * zurückzugeben. Das ist kein Kaschieren: `naechsterStand` lässt gar nicht
 * erst tiefer gehen, als der Weg reicht. Wenn hier trotzdem eine zu große
 * Zahl ankommt, ist die Antwort „der tiefste Raum, den es gibt" besser als
 * ein leerer Bildschirm.
 */
export function ebene(w: Werkraum, r: Richtung, tiefe: number): { titel: string; raum: Raumkennung } {
  const e = weg(w, r).ebenen;
  return e[Math.min(Math.max(1, tiefe), e.length) - 1];
}
