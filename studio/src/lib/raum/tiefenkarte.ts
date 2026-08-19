/**
 * Die Tiefenkarte – was eine Bewegung *hier* bedeutet.
 *
 * Dies ist die zweite von vier Verantwortlichkeiten, und die Trennung ist der
 * ganze Sinn dieser Datei:
 *
 *   GESTENWERK   Wie bewegt sich der Benutzer?      `geste.ts`, `Raumschicht`
 *   TIEFENKARTE  Wohin bedeutet das *hier*?         diese Datei
 *   WELTMODELL   Was liegt dort?                    `useStudio`
 *   DARSTELLUNG  Wie sieht man es?                  `Tiefenraum.tsx`
 *
 * Vermischt man zwei davon, bekommt man eine App mit versteckten Menüs. Und
 * genau das war schon einmal gebaut.
 *
 * ---
 *
 * **Was hier vorher falsch war, und warum es sich richtig anfühlte.**
 *
 * Zuerst bedeuteten die vier Richtungen überall dasselbe: links Welt, rechts
 * Wesen, oben Wissen, unten Notizen. Das war offensichtlich ein globales Menü
 * mit Gesten statt Knöpfen.
 *
 * Die erste Korrektur band die Bedeutung an *Arbeitsraumklassen* – Buch,
 * Welt, Charakter, Roman, Artbook. Das fühlte sich wie ein Fortschritt an und
 * war doch derselbe Fehler in fünffacher Ausfertigung: immer noch eine
 * Tabelle, die von außen bestimmt, was rechts liegt. Nur eben fünf Tabellen
 * statt einer.
 *
 * Der Unterschied, um den es geht, ist nicht die Anzahl der Tabellen. Es ist
 * die Frage, **wer die Karte besitzt**. Sie gehört dem Werk, das gerade in
 * der Mitte liegt – nicht seiner Gattung und schon gar nicht dem Programm.
 * Der Benutzer soll nicht lernen „rechts sind Charaktere", sondern:
 *
 *   *Nach außen liegt mehr von dem, was ich gerade ansehe.*
 *
 * ---
 *
 * **Warum Richtungen fehlen dürfen – und müssen.**
 *
 * Hier stand einmal die Regel „jede Richtung führt überall mindestens eine
 * Ebene weit", mit der Begründung: eine Tür, die manchmal fehlt, ist
 * schlimmer als eine, die in einen kleinen Raum führt. Das Argument klingt
 * gut und ist falsch, weil es den Preis unterschlägt.
 *
 * Eine Richtung offenzuhalten, in der es nichts gibt, heißt: dort etwas
 * *erfinden*. Ein Raum, der nur existiert, damit die Geste nicht ins Leere
 * geht, zeigt zwangsläufig irgendetwas Naheliegendes statt etwas
 * Zugehörigem. Und dann hat man beides verloren – die leere Tür *und* das
 * Vertrauen, dass hinter einer Tür etwas Gemeintes liegt.
 *
 * Deshalb ist `Tiefenkarte` ein `Partial`: Eine fehlende Richtung ist eine
 * Aussage, keine Lücke. Was der Benutzer stattdessen lernt, ist verlässlicher
 * als vier immer gleiche Türen: Wo sich etwas regt, ist etwas.
 */

import type { Richtung, Stand } from './geste';

/**
 * Die Inhalte, die es zu zeigen gibt.
 *
 * Bewusst eine geschlossene Aufzählung und keine freie Zeichenkette: Ein
 * Tippfehler in einer Karte wäre sonst ein Raum, der still leer bleibt.
 * Genau dieser Fehler ist in diesem Projekt schon einmal passiert – zwei
 * Tiefenräume behaupteten monatelang, in diesem Buch lebe niemand, weil dort
 * `wesen` statt `bewohner` stand.
 *
 * **Diese Liste gehört zur Darstellung, nicht zur Bedeutung.** Sie wächst,
 * wenn es einen neuen Raum zu zeigen gibt – nicht, wenn eine Seite eine neue
 * Bedeutung hat. „Beteiligte an dieser Begegnung" und „wer dieser Figur
 * nahesteht" sind zwei Bedeutungen und derselbe Raum.
 */
export type Raumkennung = 'wesen' | 'zusammenhang' | 'geflecht' | 'welt' | 'wissen' | 'notizen';

/** Eine Ebene eines Weges: wie sie heißt und was dort gezeigt wird. */
export interface Tiefenstufe {
  titel: string;
  raum: Raumkennung;
}

/**
 * Ein Weg nach außen – benannt in der Sprache *dieser* Seite.
 *
 * `name` und `was` sind nicht dekorativ. Sie sind das, was aus „rechts" eine
 * Bedeutung macht: Auf einer Figur heißt derselbe Weg „Beziehungen", in einem
 * Kapitel „Wer darin vorkommt", bei einer Begegnung „Beteiligte". Dieselbe
 * Geste, dieselbe Regel, andere Auskunft.
 */
export interface Tiefenweg {
  name: string;
  /** Eine Zeile dazu, kein Satz. */
  was: string;
  /** Mindestens eine. Die Länge *ist* die Reichweite dieses Weges. */
  stufen: Tiefenstufe[];
}

/**
 * Was eine Seite über ihre Umgebung weiß.
 *
 * `Partial` mit voller Absicht – siehe oben. Eine Seite mit einer einzigen
 * sinnvollen Richtung liefert eine Karte mit einem Eintrag, und das ist eine
 * vollständige Karte, keine halbe.
 */
export type Tiefenkarte = Partial<Record<Richtung, Tiefenweg>>;

/** Die leere Karte: eine Seite ohne Umgebung. Auch das ist gültig. */
export const OHNE_TIEFE: Tiefenkarte = {};

/* ------------------------------------------------------------- Auskunft --- */

/** Führt diese Richtung hier überhaupt irgendwohin? */
export function hatRichtung(karte: Tiefenkarte, r: Richtung): boolean {
  return (karte[r]?.stufen.length ?? 0) > 0;
}

/** Wie weit dieser Weg hier reicht – 0, wenn es ihn nicht gibt. */
export function reichweite(karte: Tiefenkarte, r: Richtung): number {
  return karte[r]?.stufen.length ?? 0;
}

/** Die Richtungen, die diese Seite tatsächlich anbietet. */
export function richtungen(karte: Tiefenkarte): Richtung[] {
  return (['links', 'rechts', 'oben', 'unten'] as Richtung[]).filter((r) => hatRichtung(karte, r));
}

/**
 * Welche Ebene liegt hier?
 *
 * Über das Ende hinaus wird die letzte Stufe wiederholt statt `undefined`
 * zurückzugeben – nicht als Kaschieren, sondern als letzte Verteidigung:
 * `naechsterStand` lässt gar nicht erst tiefer gehen, als der Weg reicht.
 * Kommt hier trotzdem eine zu große Zahl an, ist „die tiefste Stufe, die es
 * gibt" eine bessere Antwort als ein leerer Bildschirm.
 */
export function stufe(karte: Tiefenkarte, r: Richtung, tiefe: number): Tiefenstufe | undefined {
  const s = karte[r]?.stufen;
  if (!s?.length) return undefined;
  return s[Math.min(Math.max(1, tiefe), s.length) - 1];
}

/* ------------------------------------------------------------ Erlaubnis --- */

/**
 * Darf diese Geste von hier aus überhaupt etwas öffnen?
 *
 * **Die wichtigste Funktion dieser Datei**, weil sie die Regel „nichts
 * erfinden" von einer Absicht in eine Bedingung verwandelt. Sie steht hier
 * und nicht in der Raumschicht: Das Gestenwerk erkennt Bewegungen und darf
 * über Bedeutung nichts wissen.
 *
 * Die drei Fälle, in dieser Reihenfolge:
 *
 *   1. Aus der Mitte heraus – nur in Richtungen, die diese Seite anbietet.
 *   2. In der Tiefe, dieselbe Richtung – nur, solange der Weg noch reicht.
 *   3. In der Tiefe, die Gegenrichtung – immer. Der Weg zurück darf niemals
 *      von einer Karte abhängen; sonst könnte ein Seitenwechsel jemanden in
 *      einer Tiefe einsperren, aus der er nicht mehr herausfindet.
 *
 * Alles andere – quer aus der Tiefe heraus – bleibt stehen, wie schon in
 * `naechsterStand`.
 */
export function gesteErlaubt(karte: Tiefenkarte, stand: Stand, geste: Richtung): boolean {
  if (stand.ort === 'mitte' || stand.tiefe === 0) return hatRichtung(karte, geste);
  if (geste === stand.ort) return stand.tiefe < reichweite(karte, geste);
  /* Die Gegenrichtung führt zurück – immer, ausnahmslos. */
  return true;
}

/* ------------------------------------------------------------- Bauhilfe --- */

/**
 * Eine Karte aus Wegen bauen, ohne leere Einträge zu hinterlassen.
 *
 * Praktisch für Seiten, die ihre Richtungen bedingt belegen: „Beziehungen nur,
 * wenn diese Figur welche hat." Ein `undefined` fällt heraus, statt als
 * Richtung mit null Stufen stehenzubleiben – und `hatRichtung` muss nicht
 * zwischen „gibt es nicht" und „gibt es, ist aber leer" unterscheiden.
 */
export function karte(wege: Partial<Record<Richtung, Tiefenweg | undefined>>): Tiefenkarte {
  const aus: Tiefenkarte = {};
  for (const r of ['links', 'rechts', 'oben', 'unten'] as Richtung[]) {
    const w = wege[r];
    if (w && w.stufen.length > 0) aus[r] = w;
  }
  return aus;
}

/** Ein Weg mit einer einzigen Stufe – der häufigste Fall. */
export function weg(name: string, was: string, titel: string, raum: Raumkennung): Tiefenweg {
  return { name, was, stufen: [{ titel, raum }] };
}

/** Ein Weg über mehrere Stufen: „was gehört dazu", „wie hängt es zusammen", … */
export function tieferWeg(name: string, was: string, stufen: Tiefenstufe[]): Tiefenweg {
  return { name, was, stufen };
}
