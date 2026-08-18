/**
 * Der Buchkörper – als Mathematik.
 *
 * Dieselbe Bauart wie `lib/raum/geste.ts` und aus demselben Grund: Was ein
 * Buch schwer wirken lässt, sind fünf Kurven und drei Schwellen, und die
 * einzige Art, sie verlässlich zu prüfen, ist ohne Browser. „Der Deckel fällt
 * ab der Hälfte von selbst" ist eine Aussage über eine Funktion.
 *
 * Kein React, kein DOM, keine Zeit. Alles hier bekommt einen Fortschritt und
 * gibt eine Zahl zurück.
 *
 * ---
 *
 * **Was hier ausdrücklich nicht steht.**
 *
 * Keine Papierphysik. Kein Netz, keine Biegebalken, kein WebGL. Version 1 soll
 * herausfinden, ob eine gute Illusion reicht – und diese Datei ist der Vorrat
 * an Illusionen. Erst wenn das Gerät sagt „nein, das reicht nicht", lohnt eine
 * echte Engine ihren Preis.
 */

import type { Raumkonfig } from '../raum/konfig';

export type Buchzustand = 'geschlossen' | 'beruehrt' | 'oeffnet' | 'offen' | 'blaettert';

/** Die Richtung eines Blattwechsels. `vor` ist zur nächsten Seite. */
export type Blattrichtung = 'vor' | 'zurueck';

const klemme = (w: number, a = 0, b = 1) => Math.max(a, Math.min(b, w));

/* ------------------------------------------------------------ Berührung ---- */

export interface Beruehrung {
  /** Wie weit das Buch anhebt, in Punkten. */
  hub: number;
  /** Wie stark es größer wird. 1 = gar nicht. */
  skala: number;
  /** Wie weit der Schatten wandert, in Punkten. */
  schattenweg: number;
}

/**
 * Was passiert, wenn ein Finger das geschlossene Buch berührt.
 *
 * Sehr wenig, und das ist der Punkt. Das Buch soll *antworten*, nicht
 * aufspringen. Ein Hub von vier Punkten sieht man nicht bewusst – man merkt
 * nur, dass etwas unter dem Finger lebendig ist.
 *
 * Das wahrgenommene Gewicht dreht alle drei Werte zugleich: Was schwer ist,
 * hebt weniger, wächst weniger und wirft seinen Schatten träger. Deshalb ein
 * Regler und nicht drei – „das Buch fühlt sich zu leicht an" ist *ein*
 * Gedanke.
 */
export function beruehrung(k: Raumkonfig): Beruehrung {
  const b = k.buch;
  const leichtigkeit = 1 - klemme(b.gewicht);
  return {
    hub: b.hub * (0.4 + 0.6 * leichtigkeit),
    skala: 1 + (b.skala - 1) * (0.4 + 0.6 * leichtigkeit),
    schattenweg: b.hub * 1.6 * (0.4 + 0.6 * leichtigkeit),
  };
}

/* -------------------------------------------------------------- Öffnen ----- */

/**
 * Der Verlauf des Deckels – **nicht** linear und nicht die übliche Kurve.
 *
 * Ein echter Deckel tut drei Dinge nacheinander, und man erkennt ein
 * schlechtes Buchprogramm sofort daran, dass es nur eines davon tut:
 *
 *   1. Er wehrt sich. Am Anfang passiert wenig – der Einband ist steif und
 *      liegt mit seinem Gewicht auf dem Block.
 *   2. Er kippt. Jenseits der Senkrechten zieht die eigene Masse, und er
 *      fällt schneller, als man ihn bewegt.
 *   3. Er kommt an. Zum Schluss wird er wieder langsam, weil er auf den
 *      Tisch trifft und nicht ins Leere fällt.
 *
 * Umgesetzt als zwei verkettete Abschnitte um den Kipppunkt herum. Der
 * `widerstand` verschiebt, wie lange sich der erste Abschnitt hält: bei null
 * ist die Kurve fast gleichmäßig, bei eins bleibt der Deckel lange stehen und
 * fällt dann.
 *
 * Rückgabe: 0…1, wo 1 „ganz offen" heißt.
 */
export function deckelverlauf(t: number, widerstand: number): number {
  const x = klemme(t);
  const w = klemme(widerstand);
  /* Der Kipppunkt wandert mit dem Widerstand nach hinten. */
  const kipp = 0.32 + 0.28 * w;

  if (x <= kipp) {
    /* Vor dem Kippen: quadratisch bis kubisch – zäh, je nach Widerstand. */
    const n = x / kipp;
    const zaeh = 1.6 + 1.8 * w;
    return 0.5 * Math.pow(n, zaeh);
  }
  /* Nach dem Kippen: fällt schnell an und läuft weich aus. */
  const n = (x - kipp) / (1 - kipp);
  return 0.5 + 0.5 * (1 - Math.pow(1 - n, 2.3));
}

/**
 * Der Winkel des Deckels in Grad.
 *
 * Nicht ganz 180: Ein aufgeschlagenes Buch liegt nie vollkommen flach, der
 * Deckel bleibt ein paar Grad schräg auf dem Buchblock liegen. Diese wenigen
 * Grad sind der Unterschied zwischen „ein Rechteck ist umgeklappt" und „ein
 * Buch liegt offen".
 */
export function deckelwinkel(fortschritt: number, k: Raumkonfig): number {
  return -deckelverlauf(fortschritt, k.buch.deckelwiderstand) * k.buch.deckelWinkelGrad;
}

/**
 * Wie stark sich der Buchkörper beim Öffnen mitbewegt.
 *
 * Wenn aus dem Vorderdeckel die linke Seite wird, rückt das Buch nach rechts –
 * genau das tut ein echtes Buch. Der Wert ist der Anteil des Weges, der
 * bereits zurückgelegt ist, und läuft der Deckelbewegung leicht hinterher:
 * Der Körper reagiert auf den Deckel, nicht umgekehrt.
 */
export function koerperweg(fortschritt: number, k: Raumkonfig): number {
  const t = klemme(fortschritt);
  const traegheit = klemme(k.buch.koerpertraegheit);
  /* Nachlauf: Bei Trägheit 0 folgt der Körper sofort, bei 1 erst spät. */
  const versetzt = klemme((t - traegheit * 0.35) / Math.max(0.05, 1 - traegheit * 0.35));
  return 1 - Math.pow(1 - versetzt, 2);
}

/* ------------------------------------------------------------ Blättern ----- */

/**
 * Wie weit ist die Seite gezogen – 0…1.
 *
 * Gemessen wird nur in die Blätterrichtung. Wer zurückzieht, ist bei null,
 * nicht im Negativen: Die Seite soll zurückfallen und nicht auf der anderen
 * Seite herauskommen.
 *
 * Die Empfindlichkeit ist ein Regler, weil sie am Gerät ganz anders wirkt als
 * am Schreibtisch: Eine Daumenbewegung ist kurz, und ein Buch, das den vollen
 * Weg über die Seitenbreite verlangt, lässt sich einhändig nicht blättern.
 */
export function blattweg(dx: number, breite: number, k: Raumkonfig): number {
  const voll = Math.max(1, breite * k.seite.wegAnteil);
  return klemme(Math.abs(dx) / voll);
}

/** Zieht der Finger vorwärts oder zurück? */
export function blattrichtung(dx: number): Blattrichtung {
  return dx < 0 ? 'vor' : 'zurueck';
}

/**
 * Loslassen – fällt die Seite zurück oder legt sie sich um?
 *
 * Wie beim Richtungsbogen zwei Wege: der lange Zug und der kurze, schnelle
 * Wisch. Ein Buch, das nur den langen Zug kennt, ist nach zehn Seiten
 * anstrengend.
 */
export function blattEntscheidung(
  weg: number,
  tempoPxProMs: number,
  k: Raumkonfig,
): 'blaettern' | 'zurueck' {
  if (weg >= k.seite.schwelle) return 'blaettern';
  if (weg >= k.seite.schnellMindestweg && tempoPxProMs >= k.seite.schnellTempoPxProMs)
    return 'blaettern';
  return 'zurueck';
}

/**
 * Der Winkel des Blattes in Grad – 0 bis −180.
 *
 * Anders als der Deckel folgt das Blatt dem Finger **fast linear**, und das
 * ist Absicht: Eine Seite hat kaum Masse. Nur ganz zum Schluss zieht sie ein
 * wenig nach, weil sie sich auf den Stapel legt.
 */
export function blattwinkel(weg: number): number {
  const t = klemme(weg);
  return -(t * 0.88 + t * t * 0.12) * 180;
}

/**
 * Die Krümmungsillusion.
 *
 * Ein Blatt biegt sich am stärksten, wenn es hochkant steht, und liegt an
 * beiden Enden flach. Also eine Glocke über den Weg – null bei geschlossen,
 * null bei umgelegt, das Maximum in der Mitte.
 *
 * Das ist keine Papierphysik, sondern die eine Zahl, mit der ein
 * Farbverlauf so wandert, dass das Auge eine Wölbung sieht. Für Version 1
 * genügt das; ob es *wirklich* genügt, entscheidet der Daumen.
 */
export function kruemmung(weg: number, k: Raumkonfig): number {
  const t = klemme(weg);
  return Math.sin(t * Math.PI) * k.seite.kruemmung;
}

/**
 * Wie tief der Schatten des Blattes auf der darunterliegenden Seite liegt.
 *
 * Am stärksten kurz nach dem Anheben, danach schwächer: Ein Blatt, das
 * senkrecht steht, wirft einen schmalen harten Schatten; eines, das fast
 * umgelegt ist, deckt die Seite ohnehin ab.
 */
export function blattschatten(weg: number, k: Raumkonfig): number {
  const t = klemme(weg);
  return Math.sin(t * Math.PI * 0.85) * k.seite.schatten;
}

/**
 * Wo die Kante des gedrehten Blattes steht – 0…1 der Breite.
 *
 * Ein Blatt, das um den Falz gedreht ist, ist perspektivisch schmaler: Bei 60
 * Grad bedeckt es noch die Hälfte der Seite, bei 90 Grad steht es senkrecht
 * und bedeckt nichts. Genau `cos` des Winkels, und jenseits der Senkrechten
 * null, weil es dann auf der anderen Seite liegt.
 *
 * **Wozu die Zahl gebraucht wird.** Der Schatten des Blattes gehört nicht an
 * den Falz, sondern an *seine Kante* – dorthin, wo es sich vom Papier
 * darunter abhebt. Ohne diese Zahl lag der Schatten am linken Rand und damit
 * vollständig unter dem Blatt selbst: gerechnet, gezeichnet, und trotzdem nie
 * zu sehen. Aufgefallen ist es erst im Bild.
 */
export function blattkante(weg: number): number {
  const rad = (blattwinkel(weg) * Math.PI) / 180;
  return klemme(Math.cos(rad));
}

/* -------------------------------------------------------------- Die Feder -- */

/**
 * Eine gedämpfte Feder als Kurve über die Zeit – 0…1.
 *
 * Für das Zurückfallen und das Einrasten. Ausdrücklich als *Funktion* und
 * nicht als Simulation mit Zeitschritten: Eine Kurve lässt sich prüfen, eine
 * Simulation nur beobachten. Und sie lässt sich als CSS-Übergang ausdrücken,
 * womit sie auf dem Gerät im Compositor läuft statt in JavaScript.
 *
 * `haerte` steuert, wie schnell sie ankommt, `daempfung`, wie viel sie
 * überschwingt. Bei hoher Dämpfung gibt es kein Überschwingen mehr – dann ist
 * es keine Feder, sondern ein Nachgeben, und genau das will man bei einem
 * schweren Buch.
 */
export function federverlauf(t: number, haerte: number, daempfung: number): number {
  const x = klemme(t);
  const w = Math.max(0.5, haerte / 40);
  const d = klemme(daempfung / 60, 0.05, 1);
  if (d >= 0.98) return 1 - Math.pow(1 - x, 3);
  const abfall = Math.exp(-d * 9 * x);
  return 1 - abfall * Math.cos(w * x * Math.PI);
}

/**
 * Wie lange eine Bewegung dauert – aus Dauer und wahrgenommenem Gewicht.
 *
 * Ein schweres Buch ist nicht nur langsamer, es ist *gleichmäßig* langsamer:
 * Öffnen, Schließen und Einrasten strecken sich gemeinsam. Wer nur die
 * Öffnungsdauer erhöht, bekommt ein Buch, das langsam aufgeht und schnell
 * zufällt – und das fühlt sich nach nichts an.
 */
export function dauer(grundMs: number, k: Raumkonfig): number {
  return Math.round(grundMs * (0.75 + 0.5 * klemme(k.buch.gewicht)));
}
