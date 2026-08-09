/**
 * Suche als Navigation.
 *
 * Ab ein paar hundert Eintraegen ist Blaettern keine Navigation mehr, sondern
 * Gluecksache. Dann wird die Suche zum eigentlichen Weg durch das Buch – und
 * eine Suche, die nur Seitentitel kennt, ist an dem Punkt zu wenig.
 *
 * Also findet sie vier Dinge statt einem:
 *
 *   Seiten       – wie bisher, ueber Titel, Text, Felder, Bloecke, Zeit
 *   Verbindungen – „Halvar herrschte ueber Koenigreich Aschen"
 *   Zeit         – „1044" fuehrt zur Welt in diesem Jahr
 *   Blaetter     – „Karte", „Zeitstrahl", „Manuskript" fuehren dorthin
 *
 * Alle vier lesen vorhandene Daten. Es gibt keinen Suchindex neben der Welt,
 * der irgendwann von ihr abweicht.
 */

import type { Entry, Relation } from '../types';
import { relationType } from './relations';
import { leseZeit, ordnung, schreibeJahr, type Kalender, DEFAULT_KALENDER } from './chronik/zeit';

/* ------------------------------------------------------------ Verbindungen */

export interface Verbindungsfund {
  relation: Relation;
  von: Entry;
  nach: Entry;
  /** Die Kante als Satz – das ist der Treffer, den man liest. */
  satz: string;
}

/**
 * Verbindungen, in denen der Suchbegriff vorkommt.
 *
 * Gesucht wird im fertigen Satz, nicht in seinen Teilen. Damit findet
 * „herrschte" alle Herrschaften, „Halvar" alle Kanten dieser Figur und
 * „Halvar Aschen" genau die eine dazwischen – ohne dass dafuer drei
 * verschiedene Suchen noetig waeren.
 */
export function sucheVerbindungen(
  query: string,
  relations: Relation[],
  byId: Map<string, Entry>,
  grenze = 6,
): Verbindungsfund[] {
  const begriffe = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!begriffe.length) return [];

  const treffer: Verbindungsfund[] = [];
  for (const relation of relations) {
    const von = byId.get(relation.fromId);
    const nach = byId.get(relation.toId);
    if (!von || !nach || von.deletedAt || nach.deletedAt) continue;

    const def = relationType(relation.type);
    const zeit = relation.beginn?.trim() || relation.ende?.trim()
      ? ` (${[relation.beginn?.trim(), relation.ende?.trim()].filter(Boolean).join('–')})`
      : '';
    const satz = `${von.title} ${def.label} ${nach.title}${zeit}`;
    const klein = satz.toLowerCase();
    if (!begriffe.every((b) => klein.includes(b))) continue;

    treffer.push({ relation, von, nach, satz });
    if (treffer.length >= grenze * 3) break;
  }

  /*
   * Kurze Saetze zuerst: „Mara besitzt Schmiede" ist ein praeziserer Treffer
   * fuer „Mara" als „Mara gehoert zu Haus Aschen der Nordmark".
   */
  return treffer.sort((a, b) => a.satz.length - b.satz.length).slice(0, grenze);
}

/* -------------------------------------------------------------------- Zeit */

export interface Zeitfund {
  /** Ordnungszahl fuer den Zeitstrahl. */
  wert: number;
  jahr: number;
  text: string;
}

/**
 * Liest sich die Eingabe als Jahr? Dann fuehrt sie zur Welt in diesem Jahr.
 *
 * Das ist der kuerzeste Weg zu einer Frage, die sonst drei Schritte kostet:
 * „Was gab es 1044?" Eintippen genuegt.
 */
export function sucheZeit(query: string, k: Kalender = DEFAULT_KALENDER): Zeitfund | undefined {
  const z = leseZeit(query, k);
  if (!z) return undefined;
  return {
    wert: ordnung(z, k),
    jahr: z.jahr,
    text: `Die Welt im Jahr ${schreibeJahr(z.jahr, k)}`,
  };
}

/* ---------------------------------------------------------------- Blaetter */

export interface Blattfund {
  pfad: string;
  titel: string;
  hinweis: string;
}

/**
 * Die eigenen Orte des Buches.
 *
 * Bewusst eine Liste und kein Ableiten aus der Routentabelle: Was hier steht,
 * ist das, wonach jemand *sucht* – nicht jede Adresse, die es gibt. Die
 * Stichworte sind die Woerter, die man tatsaechlich eintippt, wenn man den
 * richtigen Namen gerade nicht weiss.
 */
const BLAETTER: (Blattfund & { stichworte: string[] })[] = [
  { pfad: '/roman', titel: 'Manuskript', hinweis: 'Schreiben, Kapitel, Szenen',
    stichworte: ['roman', 'manuskript', 'schreiben', 'kapitel', 'szene', 'text', 'buch schreiben'] },
  { pfad: '/zeitstrahl', titel: 'Zeitstrahl', hinweis: 'Die Welt in der Zeit',
    stichworte: ['zeit', 'zeitstrahl', 'jahr', 'chronologie', 'geschichte', 'wann'] },
  { pfad: '/karte', titel: 'Faltkarte', hinweis: 'Die Ordnung der Welt',
    stichworte: ['karte', 'graph', 'faltkarte', 'sternkarte', 'verbindungen', 'netz'] },
  { pfad: '/setzerei', titel: 'Setzerei', hinweis: 'Geschriebenes einlegen',
    stichworte: ['setzerei', 'einlegen', 'import', 'chatgpt', 'setzen', 'text einfügen'] },
  { pfad: '/spiegel', titel: 'Der Spiegel', hinweis: 'Was wiederkehrt',
    stichworte: ['spiegel', 'muster', 'motive', 'wiederkehr'] },
  { pfad: '/chronik', titel: 'Chronik', hinweis: 'Verlauf und Papierkorb',
    stichworte: ['chronik', 'verlauf', 'papierkorb', 'gelöscht', 'geloescht', 'zurückholen', 'fassung'] },
  { pfad: '/register', titel: 'Register', hinweis: 'Alles alphabetisch',
    stichworte: ['register', 'index', 'alphabetisch', 'liste'] },
  { pfad: '/tafelteil', titel: 'Tafelteil', hinweis: 'Alle Bilder',
    stichworte: ['tafel', 'bilder', 'bild', 'galerie', 'illustration'] },
  { pfad: '/lose-blaetter', titel: 'Lose Blätter', hinweis: 'Sammeln und skizzieren',
    stichworte: ['lose blätter', 'lose blaetter', 'canvas', 'moodboard', 'skizze', 'bogen'] },
  { pfad: '/werkbank', titel: 'Werkbank', hinweis: 'Produktionsstand',
    stichworte: ['werkbank', 'pipeline', 'produktion', 'asset'] },
  { pfad: '/mein-buch', titel: 'Mein Buch', hinweis: 'Einband, Titel, Zeichen',
    stichworte: ['mein buch', 'einband', 'cover', 'titel', 'zeichen', 'umschlag'] },
  { pfad: '/kolophon', titel: 'Kolophon', hinweis: 'Einstellungen und Sicherung',
    stichworte: ['kolophon', 'einstellungen', 'sicherung', 'backup', 'export', 'daten'] },
];

export function sucheBlaetter(query: string, grenze = 3): Blattfund[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const bewertet = BLAETTER.map((b) => {
    const titel = b.titel.toLowerCase();
    let punkte = 0;
    if (titel === q) punkte = 100;
    else if (titel.startsWith(q)) punkte = 60;
    else if (titel.includes(q)) punkte = 40;
    for (const s of b.stichworte) {
      if (s === q) punkte = Math.max(punkte, 80);
      else if (s.startsWith(q)) punkte = Math.max(punkte, 30);
      else if (q.length > 3 && s.includes(q)) punkte = Math.max(punkte, 15);
    }
    return { blatt: b, punkte };
  })
    .filter((x) => x.punkte > 0)
    .sort((a, b) => b.punkte - a.punkte);

  return bewertet.slice(0, grenze).map(({ blatt }) => ({
    pfad: blatt.pfad,
    titel: blatt.titel,
    hinweis: blatt.hinweis,
  }));
}
