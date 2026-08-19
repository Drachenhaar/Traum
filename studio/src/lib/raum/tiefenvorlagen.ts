/**
 * Standardkarten – der Rückfall, nicht die Wahrheit.
 *
 * Hier stand einmal `werkraum.ts` mit einer Tabelle von fünf Arbeitsräumen,
 * und diese Tabelle *war* die Bedeutung: Was rechts liegt, entschied das
 * Programm anhand der Adresse. Das ist der Fehler, den der Auftrag
 * ausdrücklich verwirft – die Karte gehört dem Werk in der Mitte, nicht
 * seiner Gattung.
 *
 * Was von der Tabelle bleibt, ist ihr *zweiter*, legitimer Zweck: Nicht jede
 * Seite dieses Buches wird ihre Tiefe je selbst beschreiben, und bis dahin
 * soll trotzdem etwas Vernünftiges dort liegen. Also ein Vorrat an Karten,
 * den eine Seite **erben kann, wenn sie nichts Eigenes sagt** – und den jede
 * Seite mit einem Aufruf überschreibt.
 *
 * Der Unterschied ist keine Wortklauberei, sondern ablesbar am Aufrufweg:
 *
 *   vorher   Programm liest Adresse  →  Programm bestimmt Bedeutung
 *   jetzt    Seite meldet Bedeutung  →  Programm nimmt sie entgegen
 *            (und greift nur hierher, wenn keine kam)
 *
 * ---
 *
 * **Was hier nicht mehr steht: die Pflicht zu vier Richtungen.**
 *
 * Die alte Tabelle belegte in jedem Arbeitsraum alle vier Richtungen, notfalls
 * mit „Notizen" als Füllung. Das war Erfinden auf Vorrat. Diese Karten lassen
 * Richtungen frei, wo nichts Eigenes zu sagen ist – und wo doch etwas steht,
 * ist es kein Platzhalter.
 */

import { karte, tieferWeg, weg, type Tiefenkarte } from './tiefenkarte';

/**
 * Die Karte eines Eintrags, abgeleitet aus seiner Art.
 *
 * Der Typ eines Eintrags ist das Wenige, was das Programm ohne Zutun der
 * Seite über deren Umgebung weiß – und mehr soll es auch nicht raten. Eine
 * Figur bringt Beziehungen mit, ein Ort seine Umgebung; was ein *bestimmter*
 * Ort noch mitbringt, weiß nur er selbst.
 */
export function karteFuerEintrag(typ: string | undefined): Tiefenkarte {
  if (typ === 'character')
    return karte({
      links: weg('Herkunft', 'Woher · wohin', 'Woher diese Figur kommt', 'welt'),
      rechts: tieferWeg('Beziehungen', 'Wer dazugehört', [
        { titel: 'Wer dieser Figur nahesteht', raum: 'wesen' },
        { titel: 'Wie sie zusammenhängen', raum: 'zusammenhang' },
        { titel: 'Das ganze Geflecht', raum: 'geflecht' },
      ]),
      oben: weg('Wissen', 'Was bekannt ist', 'Was über diese Figur bekannt ist', 'wissen'),
      unten: weg('Notizen', 'Gedanken · Fundstücke', 'Was zu ihr notiert wurde', 'notizen'),
    });

  if (typ === 'location')
    return karte({
      links: tieferWeg('Umgebung', 'Wo es liegt', [
        { titel: 'Was ringsum liegt', raum: 'welt' },
        { titel: 'Was darüber bekannt ist', raum: 'wissen' },
      ]),
      rechts: tieferWeg('Bewohner', 'Wer dort lebt', [
        { titel: 'Wer hier lebt', raum: 'wesen' },
        { titel: 'Wie sie zusammenhängen', raum: 'zusammenhang' },
      ]),
      oben: weg('Geschichte', 'Was geschehen ist', 'Was über diesen Ort bekannt ist', 'wissen'),
      unten: weg('Fundstücke', 'Was am Wegrand liegt', 'Was hier notiert wurde', 'notizen'),
    });

  /*
   * Alles andere: **zwei** Richtungen, nicht vier.
   *
   * Ein Gegenstand, ein Ereignis, eine Stimme – was daneben liegt, weiß bis
   * auf Weiteres niemand. „Wer damit zu tun hat" und „was notiert wurde"
   * stimmen fast immer; „die Welt umher" und „das ganze Geflecht" wären
   * geraten. Also bleiben links und oben leer, bis die Seite selbst etwas
   * anderes sagt.
   */
  return karte({
    rechts: weg('Wer dazugehört', 'Wesen · Beziehungen', 'Wer damit zu tun hat', 'wesen'),
    unten: weg('Notizen', 'Gedanken · Fundstücke', 'Was dazu notiert wurde', 'notizen'),
  });
}

/**
 * Die Karte einer Buchseite ohne eigenen Eintrag – Inhaltsverzeichnis,
 * Kapitelauftakt, Anhang.
 *
 * Solche Seiten sind Wegweiser und keine Werke. Sie haben eine Umgebung, aber
 * keine tiefe: Wer im Inhaltsverzeichnis steht, will hinein, nicht daneben.
 */
export function karteFuerBuchseite(): Tiefenkarte {
  return karte({
    links: weg('Welt', 'Orte · Raum', 'Die Welt umher', 'welt'),
    rechts: weg('Wesen', 'Charaktere', 'Wer in diesem Buch lebt', 'wesen'),
    unten: weg('Notizen', 'Gedanken · Fundstücke', 'Was sich angesammelt hat', 'notizen'),
  });
}

/**
 * Die Rückfallkarte für einen Pfad.
 *
 * Bewusst kurz und bewusst dumm: Sie kennt nur, was aus der Adresse und dem
 * Ankertyp hervorgeht. Alles Genauere ist Sache der Seite. Wächst diese
 * Funktion je über zwanzig Zeilen hinaus, ist das das Zeichen, dass wieder
 * das Programm zu bestimmen anfängt, was eine Seite bedeutet.
 */
export function standardkarte(pfad: string, ankerTyp?: string): Tiefenkarte {
  if (pfad.startsWith('/eintrag/') || pfad.startsWith('/spiegel')) return karteFuerEintrag(ankerTyp);
  return karteFuerBuchseite();
}
