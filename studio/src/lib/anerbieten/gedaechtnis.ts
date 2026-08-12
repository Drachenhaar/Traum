/**
 * Was Dragoncore sich merkt.
 *
 * Nicht, was es weiß – das steht in der Welt. Sondern, was es schon einmal
 * gesagt hat und wie das aufgenommen wurde.
 *
 * Das ist der Teil des Systems, an dem sich entscheidet, ob es angenehm oder
 * lästig ist, und die Regel dahinter ist einfach: **Wer weghört, hat recht.**
 * Nicht „vielleicht war der Zeitpunkt schlecht", nicht „beim dritten Mal
 * versteht er es". Ein Weggewinkt ist eine Antwort, und die zweite Frage nach
 * derselben Sache ist keine Hilfe, sondern eine Behauptung darüber, wer hier
 * besser weiß, was interessant ist.
 *
 * Vier Antworten, und sie wiegen verschieden schwer:
 *
 *   `geoeffnet`  – Es war gut. Ähnliches darf wiederkommen.
 *   `spaeter`    – Nicht jetzt. Eine Weile Ruhe, dann wieder.
 *   `weg`        – Nicht dies. Diese eine Beobachtung ist erledigt.
 *   `nie`        – Nicht hierzu. Diese Art zu dieser Sache nie wieder.
 *
 * `nie` ist endgültig und wird nirgends aufgeweicht. Es gibt keinen Zähler,
 * der es nach drei Monaten vergisst, und keine „aber jetzt hat sich viel
 * geändert"-Ausnahme. Wer das abstellt, hat es abgestellt.
 */

export type Antwort = 'geoeffnet' | 'spaeter' | 'weg' | 'nie';

export interface Notiz {
  /** Welche Art von Beobachtung – nicht welche einzelne. */
  art: string;
  /** Worum es ging. Leer, wenn es die ganze Welt betraf. */
  betrifft?: string;
  /** Die genaue Beobachtung – damit dieselbe nicht zweimal kommt. */
  id: string;
  wann: number;
  antwort: Antwort;
}

/** Alles, was dieses Buch schon gesagt bekommen hat. */
export type Gedaechtnis = Notiz[];

/** Wie lange „später" dauert. Drei Tage – lang genug, um es zu vergessen. */
const SPAETER_MS = 3 * 24 * 60 * 60 * 1000;

/** Wie lange eine einzelne weggewinkte Beobachtung ruht. */
const WEG_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Wie viele Anerbieten in einem Zeitraum höchstens erscheinen dürfen.
 *
 * Eine harte Obergrenze über allem anderen, unabhängig davon, wie interessant
 * die Welt gerade ist. Ohne sie hätte ein Verfasser, der an einem Nachmittag
 * dreißig Seiten anlegt, dreißig gute Gründe für ein Anerbieten – und jeder
 * einzelne wäre berechtigt, während die Summe unerträglich ist.
 */
const HOECHSTENS = 2;
const ZEITRAUM_MS = 24 * 60 * 60 * 1000;

/**
 * Darf über diese Beobachtung gerade gesprochen werden?
 *
 * Rein lesend und ohne Zeitbegriff außer dem übergebenen – damit sie prüfbar
 * ist, ohne auf die Uhr zu warten.
 */
export function darfSprechen(
  g: Gedaechtnis,
  b: { id: string; art: string; betrifft?: string },
  jetzt: number,
): boolean {
  for (const n of g) {
    /* Endgültig – zu dieser Sache diese Art nie wieder. */
    if (n.antwort === 'nie' && n.art === b.art && n.betrifft === b.betrifft) return false;
    /* Dieselbe Beobachtung, weggewinkt: lange Ruhe. */
    if (n.antwort === 'weg' && n.id === b.id && jetzt - n.wann < WEG_MS) return false;
    /* „Später" gilt für die Art bei dieser Sache, nicht nur für den Wortlaut. */
    if (
      n.antwort === 'spaeter' &&
      n.art === b.art &&
      n.betrifft === b.betrifft &&
      jetzt - n.wann < SPAETER_MS
    ) {
      return false;
    }
    /*
     * Schon einmal gezeigt und geoeffnet – dieselbe Beobachtung kommt nicht
     * wieder. Wer sie noch einmal sehen will, findet sie, wo sie hingehoert.
     */
    if (n.antwort === 'geoeffnet' && n.id === b.id) return false;
  }
  return true;
}

/** Ist das Tagespensum erreicht? */
export function zuvielGesagt(g: Gedaechtnis, jetzt: number): boolean {
  return g.filter((n) => jetzt - n.wann < ZEITRAUM_MS).length >= HOECHSTENS;
}

/**
 * Wie sehr diese Art von Beobachtung bisher interessiert hat.
 *
 * Gibt einen Faktor zwischen 0.2 und 1.2. Wer dreimal dieselbe Art
 * weggewinkt hat, bekommt sie kaum noch zu sehen – ohne dass er das
 * ausdrücklich abstellen musste. Wer sie öffnet, bekommt sie eher.
 *
 * Das ist die einzige Stelle, an der Dragoncore aus dem Verhalten des
 * Verfassers lernt, und es lernt nur eines: wann es leiser sein soll.
 */
export function neigung(g: Gedaechtnis, art: string): number {
  let faktor = 1;
  for (const n of g) {
    if (n.art !== art) continue;
    if (n.antwort === 'geoeffnet') faktor += 0.1;
    else if (n.antwort === 'spaeter') faktor -= 0.12;
    else if (n.antwort === 'weg') faktor -= 0.25;
  }
  return Math.max(0.2, Math.min(1.2, faktor));
}

/**
 * Eine Antwort festhalten.
 *
 * Kürzt beim Anlegen: Das Gedächtnis wächst sonst unbegrenzt in einer Datei,
 * die jemand sichert und wieder einspielt. Ein `nie` bleibt dabei immer
 * stehen – es ist das einzige, was nie verfällt.
 */
export function merke(g: Gedaechtnis, n: Notiz, jetzt = Date.now()): Gedaechtnis {
  const ohneAltes = g.filter((x) => x.id !== n.id || x.antwort === 'nie');
  const neu = [...ohneAltes, n];
  const ewig = neu.filter((x) => x.antwort === 'nie');
  const rest = neu
    .filter((x) => x.antwort !== 'nie')
    .filter((x) => jetzt - x.wann < 180 * 24 * 60 * 60 * 1000)
    .slice(-200);
  return [...ewig, ...rest];
}

/** Ein gespeichertes Gedächtnis einlesen – auch wenn es beschädigt ist. */
export function heileGedaechtnis(roh: unknown): Gedaechtnis {
  if (!Array.isArray(roh)) return [];
  const gueltig: Antwort[] = ['geoeffnet', 'spaeter', 'weg', 'nie'];
  return roh
    .filter((n): n is Notiz => {
      if (!n || typeof n !== 'object') return false;
      const x = n as Record<string, unknown>;
      return (
        typeof x.id === 'string' &&
        typeof x.art === 'string' &&
        typeof x.wann === 'number' &&
        gueltig.includes(x.antwort as Antwort)
      );
    })
    .slice(-400);
}
