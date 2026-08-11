/**
 * Die Atmosphäre.
 *
 * Ein Buch, das klingt – aber nur, wenn man es darum bittet.
 *
 * Das ist keine Höflichkeitsfloskel, sondern die Bauvorschrift dieser Datei.
 * Ton ist die einzige Ausgabe eines Programms, die man nicht wegsehen kann:
 * Ein unerwartetes Bild schließt man, ein unerwartetes Geräusch hat schon
 * gespielt. Deshalb liegen zwischen einer Klangdatei und einem Ohr **drei**
 * Bedingungen, und alle drei müssen zustimmen:
 *
 *   1. Die Atmosphäre ist am Gerät eingeschaltet (`settings.atmosphaereAn`),
 *      und sie ist es **nie von selbst**.
 *   2. Diese Seite trägt eine Atmosphäre, und deren `vonSelbst` steht.
 *   3. Der Browser lässt es zu – ohne vorherige Berührung des Fensters tut
 *      er das nicht, und das ist gut so. Wir umgehen es nicht.
 *
 * Und keine harten Schnitte. Beim Blättern verklingt die alte Seite, während
 * die neue anhebt. Ein Sprung von Wald zu Tempel in einem Bild wäre ein
 * Schnitt im Film; hier wird geblendet.
 *
 * Bewusst `HTMLAudioElement` und keine WebAudio-Kette: Ein Buch braucht
 * Lautstärke und Schleife, keinen Mischpult-Graphen. Die Blende ist ein
 * Zähler auf `volume` – zwölf Zeilen statt eines AudioContext, der auf
 * mobilen Geräten eigene Regeln hat.
 */

import { db } from '../db/db';

/** Wie fein geblendet wird. 50 ms sind unhörbar fein und billig. */
const SCHRITT_MS = 50;

/** Was gerade klingt – höchstens eines, plus das, was gerade verklingt. */
interface Stimme {
  klangId: string;
  audio: HTMLAudioElement;
  url: string;
  ziel: number;
  timer?: ReturnType<typeof setInterval>;
}

let laufend: Stimme | null = null;
/*
 * Die verklingenden Stimmen.
 *
 * Mehrzahl, weil jemand schnell blaettern kann: Wer drei Seiten in einer
 * Sekunde umschlaegt, hat drei Stimmen im Ausklang. Sie einzeln zu halten ist
 * ehrlicher, als die vorige hart abzubrechen – und sie raeumen sich selbst
 * weg, sobald sie bei null sind.
 */
const verklingend = new Set<Stimme>();

/**
 * Welcher Klang gerade *angehoben wird* – nicht welcher schon klingt.
 *
 * Der Unterschied hat mich einen Fehler gekostet, den man nur hoert und nie
 * sieht: `anheben` prueft, ob dieselbe Stimme schon laeuft, und diese Pruefung
 * steht vor dem `await` auf die Datei. Zwei Aufrufe kurz hintereinander –
 * beim Antippen etwa, wo der Klick anhebt *und* der dadurch eingeschaltete
 * Schalter den Effekt erneut ausloest – kamen deshalb beide durch und
 * erzeugten zwei Stimmen. Man hoerte denselben Wind zweimal, leicht
 * versetzt, und niemand haette je verstanden, warum.
 */
let inArbeit: string | null = null;

/** Blob-Adressen, die wir erzeugt haben. Ohne Freigabe bleibt der Speicher belegt. */
function freigeben(s: Stimme) {
  s.audio.pause();
  if (s.timer) clearInterval(s.timer);
  URL.revokeObjectURL(s.url);
}

/**
 * Eine Stimme auf einen Wert bringen.
 *
 * `danach` läuft, wenn sie angekommen ist. Ein laufender Übergang wird
 * abgelöst, nicht gestapelt: Zwei Blenden auf derselben Stimme kämpften sonst
 * gegeneinander, und man hörte es.
 */
function blende(s: Stimme, ziel: number, dauer: number, danach?: () => void) {
  if (s.timer) clearInterval(s.timer);
  s.ziel = ziel;
  const von = s.audio.volume;
  const schritte = Math.max(1, Math.round(dauer / SCHRITT_MS));
  let i = 0;
  s.timer = setInterval(() => {
    i++;
    const anteil = Math.min(1, i / schritte);
    /*
     * Weich an beiden Enden.
     *
     * Eine geradlinige Blende setzt hoerbar ein und bricht hoerbar ab – man
     * merkt den Anfang und das Ende. `3t² − 2t³` beginnt und endet mit
     * Steigung null; dazwischen ist es dieselbe Blende, nur ohne Kanten.
     */
    const weich = anteil * anteil * (3 - 2 * anteil);
    const wert = von + (ziel - von) * weich;
    s.audio.volume = Math.max(0, Math.min(1, wert));
    if (anteil >= 1) {
      if (s.timer) clearInterval(s.timer);
      s.timer = undefined;
      danach?.();
    }
  }, SCHRITT_MS);
}

export interface Anweisung {
  klangId: string;
  lautstaerke: number;
  schleife: boolean;
  einblenden: number;
  ausblenden: number;
}

/**
 * Diesen Klang anheben lassen – und alles andere verklingen.
 *
 * Gibt zurück, ob es geklappt hat. Ein `false` ist kein Fehler: Es heißt
 * meist, dass der Browser noch keine Berührung gesehen hat. Die Oberfläche
 * darf daraufhin *anbieten*, aber nicht klagen.
 */
export async function anheben(a: Anweisung): Promise<boolean> {
  /* Schon dieselbe Stimme? Dann nur die Lautstaerke nachziehen. */
  if (laufend?.klangId === a.klangId) {
    blende(laufend, a.lautstaerke, a.einblenden);
    return true;
  }
  /* Oder gerade dabei, es zu werden? Dann ist der andere Aufruf zustaendig. */
  if (inArbeit === a.klangId) return true;
  inArbeit = a.klangId;

  const eintrag = await db.klangBlobs.get(a.klangId);
  if (!eintrag) {
    inArbeit = null;
    return false;
  }

  verklingenLassen(a.ausblenden);

  const url = URL.createObjectURL(eintrag.datei);
  const audio = new Audio(url);
  audio.loop = a.schleife;
  audio.volume = 0;
  const stimme: Stimme = { klangId: a.klangId, audio, url, ziel: a.lautstaerke };

  try {
    await audio.play();
  } catch {
    /*
     * Der Browser hat abgelehnt – fast immer, weil das Fenster noch nicht
     * beruehrt wurde. Wir raeumen auf und sagen nein. Kein zweiter Versuch,
     * kein stiller Trick: Wer sich um diese Regel herumbaut, macht genau das
     * Geraeusch, das niemand bestellt hat.
     */
    URL.revokeObjectURL(url);
    inArbeit = null;
    return false;
  }

  inArbeit = null;
  laufend = stimme;
  blende(stimme, a.lautstaerke, a.einblenden);
  return true;
}

/** Alles verklingen lassen. Ohne Dauer: sofort still. */
export function verklingenLassen(dauer = 600): void {
  /* Auch das, was gerade angehoben wird, ist damit abbestellt. */
  inArbeit = null;
  const alt = laufend;
  laufend = null;
  if (!alt) return;
  if (dauer <= 0) {
    freigeben(alt);
    return;
  }
  verklingend.add(alt);
  blende(alt, 0, dauer, () => {
    freigeben(alt);
    verklingend.delete(alt);
  });
}

/** Was gerade klingt – für das stille Zeichen am Seitenrand. */
export function klingtGerade(): string | undefined {
  return laufend?.klangId;
}

/**
 * Wie laut es gerade ist.
 *
 * Das Audio-Element haengt bewusst nicht im Dokument – es ist kein Bedienteil,
 * sondern ein Klang. Damit ist es von aussen unsichtbar, und diese Zeile ist
 * die einzige Moeglichkeit, von aussen nachzusehen, ob eine Blende wirklich
 * geblendet hat.
 */
export function lautstaerkeGerade(): number | undefined {
  return laufend?.audio.volume;
}

/**
 * Alles anhalten und aufräumen.
 *
 * Beim Buchwechsel und beim Verlassen. Ohne das spielte der Wald des einen
 * Bandes weiter, während man im anderen liest.
 */
export function alleStill(): void {
  verklingenLassen(0);
  for (const s of verklingend) freigeben(s);
  verklingend.clear();
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', alleStill);

  /*
   * Ein Fenster zum Nachsehen – ausschliesslich lesend.
   *
   * Das Audio-Element haengt bewusst nicht im Dokument; es ist ein Klang und
   * kein Bedienteil. Damit laesst sich von aussen aber auch nicht pruefen, ob
   * eine Blende wirklich geblendet hat statt hart einzusetzen – und genau das
   * ist die eine Eigenschaft dieser Datei, die man nicht sehen, sondern nur
   * hoeren kann.
   *
   * Zwei Funktionen, beide ohne Wirkung. Wer hierueber etwas *aendern* will,
   * findet nichts.
   */
  (window as unknown as Record<string, unknown>).__atmosphaere = {
    klingt: klingtGerade,
    laut: lautstaerkeGerade,
  };
}

/* --------------------------------------------------------- Klänge legen ---- */

/** Wie lang der Klang ist – der Browser weiß es erst, wenn er ihn kennt. */
export function dauerVon(datei: Blob): Promise<number | undefined> {
  return new Promise((res) => {
    const url = URL.createObjectURL(datei);
    const a = new Audio(url);
    const fertig = (wert?: number) => {
      URL.revokeObjectURL(url);
      res(wert);
    };
    a.addEventListener('loadedmetadata', () =>
      fertig(Number.isFinite(a.duration) ? a.duration : undefined),
    );
    a.addEventListener('error', () => fertig(undefined));
    /* Nicht ewig warten – eine fehlende Laenge ist kein Grund zu haengen. */
    setTimeout(() => fertig(undefined), 4000);
  });
}

/** Die Vorgabe für eine frisch eingelegte Atmosphäre. */
export const ATMOSPHAERE_VORGABE = {
  lautstaerke: 0.45,
  schleife: true,
  einblenden: 1800,
  ausblenden: 900,
  /*
   * `vonSelbst` steht auf true – aber das entscheidet nichts allein: Ohne den
   * Schalter am Geraet bleibt es still, und der steht standardmaessig aus.
   * Wer die Atmosphaere einschaltet, hat sie bestellt; dann soll sie beim
   * Umblaettern auch von selbst kommen, statt auf jeder Seite erneut zu
   * fragen.
   */
  vonSelbst: true,
} as const;

/** Wie lang ein Klang sein darf. Darüber wird es ein Hörbuch, kein Raum. */
export const MAX_KLANG_BYTES = 12 * 1024 * 1024;
