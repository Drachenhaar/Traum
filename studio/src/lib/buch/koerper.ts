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

/**
 * Wie weit die Seite unter dem Finger zur Seite wandert – in Punkten.
 *
 * **Eins zu eins, und das ist der ganze Punkt.** `blattweg` ist eine
 * Verhältniszahl für die *Entscheidung* beim Loslassen; sie darf empfindlich
 * sein, damit man nicht über den halben Bildschirm ziehen muss. Was man
 * *sieht*, darf aber nicht empfindlich sein: Ein Blatt, das sich doppelt so
 * schnell bewegt wie der Daumen, klebt nicht am Daumen, sondern flieht vor
 * ihm. Deshalb hier die rohe Strecke, nur begrenzt auf die Seitenbreite.
 *
 * Zwei Zahlen für zwei Fragen – „wie weit ist es" und „reicht das schon" –
 * statt einer, die beides halb beantwortet.
 */
export function blattschub(dx: number, breite: number): number {
  return klemme(Math.abs(dx), 0, Math.max(0, breite));
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
 * Der Winkel des Blattes in Grad – 0 bis knapp über die Senkrechte.
 *
 * Anders als der Deckel folgt das Blatt dem Finger **fast linear**, und das
 * ist Absicht: Eine Seite hat kaum Masse. Nur ganz zum Schluss zieht sie ein
 * wenig nach, weil sie sich auf den Stapel legt.
 *
 * ---
 *
 * **Warum nicht hundertachtzig Grad.**
 *
 * Zuerst standen hier volle hundertachtzig – die Seite sollte sich ganz
 * umlegen, wie in einem aufgeschlagenen Buch. In einem aufgeschlagenen Buch
 * liegt der Falz aber in der *Mitte*, und die Seite fällt auf die andere
 * Hälfte. Auf einem Telefon ist nur eine Seite zu sehen; der Falz liegt am
 * linken Bildschirmrand. Jenseits der Senkrechten schwingt die Seite damit
 * nach links aus dem Bild – und die zweite Hälfte jeder Bewegung fand
 * außerhalb des Bildschirms statt. Man zog, und nach der Mitte war einfach
 * nichts mehr da.
 *
 * In Zahlen war davon nichts zu sehen: Winkel, Weg, Schatten, alles stimmte.
 * Sichtbar wurde es erst auf einem Streifen aus sechs Einzelbildern, auf dem
 * zwei davon leer waren.
 *
 * **Und dann ging der Winkel fast ganz weg.** Erst zweiundneunzig Grad, dann
 * zweiundachtzig – und am Gerät lautete das Urteil trotzdem: sieht
 * unnatürlich aus. Zu Recht, und der Fehler saß eine Ebene tiefer als jede
 * Zahl.
 *
 * Eine Seite, die sich dreht, braucht etwas, worauf sie fällt. In einem
 * aufgeschlagenen Buch ist das die andere Hälfte. Auf einem Telefon gibt es
 * die nicht – dort dreht sich ein Rechteck ins Nichts, und das erkennt jedes
 * Auge sofort als Effekt. Was eine einzelne Seite hergibt, ist die andere
 * Bewegung: Sie wandert unter dem Finger zur Seite und gibt das Papier
 * darunter frei. Wie ein Blatt, das man von einem Stapel schiebt.
 *
 * Vierzehn Grad sind deshalb keine Drehung mehr, sondern das, was von ihr
 * übrig bleibt: eine Neigung, die dem Blatt Dicke gibt. Der Regler steht
 * weiterhin bis 180 offen – auf einem iPad mit echter Doppelseite ist die
 * Drehung wieder die richtige Bewegung, weil es dort etwas gibt, worauf die
 * Seite fällt.
 */
export function blattwinkel(weg: number, k: Raumkonfig): number {
  const t = klemme(weg);
  return -(t * 0.88 + t * t * 0.12) * k.seite.maxWinkelGrad;
}

/**
 * Der Winkel des Blattes, das beim Zurückblättern hereinfällt.
 *
 * Spiegelbildlich zum Vorwärtsblättern: Es kommt hochkant herein und legt
 * sich flach hin. Deshalb derselbe Verlauf, nur rückwärts gelesen – und
 * nicht, wie zuerst, „minus hundertachtzig minus der andere Winkel". Diese
 * Rechnung stimmte nur, solange eine Seite volle hundertachtzig Grad drehte;
 * mit dem Deckel bei zweiundneunzig hätte sie das Blatt hochkant stehen
 * lassen, statt es hinzulegen.
 */
export function blattwinkelZurueck(weg: number, k: Raumkonfig): number {
  return blattwinkel(1 - klemme(weg), k);
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

/*
 * Hier stand `blattkante` – „wo die Kante des gedrehten Blattes steht",
 * gerechnet als Kosinus des Winkels. Sie war die Antwort auf die Frage, wo
 * der Schatten hingehört, solange sich die Seite drehte.
 *
 * Mit dem Schub gibt es die Frage nicht mehr: Die Kante der Seite steht dort,
 * wohin der Finger sie geschoben hat, und das weiß das Stylesheet ohnehin –
 * `--dc-seite-schub` ist dieselbe Zahl. Eine zweite Rechnung daneben wäre ein
 * zweiter Ort für eine Wahrheit, die schon eindeutig ist.
 */

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
