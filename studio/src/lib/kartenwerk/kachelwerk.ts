/**
 * Das Kachelwerk – der Grund, warum Qualität bezahlbar wird.
 *
 * ---
 *
 * **Das Problem, das es löst.**
 *
 * Der bisherige Weg hängt sein Zeichnen an die Sicht: Beim Schieben entsteht
 * sechzigmal in der Sekunde jeder Baum neu. Darum *mussten* die Bäume billig
 * sein – nicht weil Canvas nicht mehr könnte.
 *
 * Hier wird in Kacheln fester Größe im **Kartenraum** gezeichnet. Eine Kachel
 * entsteht einmal und wird danach nur noch kopiert. Schieben und Zoomen
 * zeichnen nichts neu. Die Zeit je Bild hängt damit **nicht mehr von der Zahl
 * der Staffage ab** – zehntausend Bäume kosten beim Schieben so viel wie
 * tausend.
 *
 * ---
 *
 * **Die Stufen.**
 *
 * Eine Kachel der Stufe `z` deckt `FELD / 2^z` Karteneinheiten ab und wird
 * immer in derselben Zahl Bildpunkte gezeichnet. Das ist die Bauart einer
 * Schiebekarte, und sie löst drei Dinge auf einmal: Beim Herauszoomen wird
 * gröber gebacken, beim Heranzoomen feiner, und die Zahl der sichtbaren
 * Kacheln bleibt beschränkt, egal wie weit man geht.
 *
 * Die Gerätedichte (`dpr`) bestimmt nur die **Auflösung** einer Kachel, nicht
 * ihre Stufe – sonst bekäme ein Telefon mit dreifacher Dichte eine andere
 * Landschaft als ein Rechner mit einfacher.
 *
 * ---
 *
 * **Der Überstand.**
 *
 * Ein Baum, dessen Fuß knapp außerhalb einer Kachel steht, ragt mit seiner
 * Krone hinein. Eine Kachel zeichnet deshalb auch Staffage von außerhalb,
 * solange ihr Bild sie berührt. Ohne das hätte **jede Kachelgrenze eine
 * Schnittkante**, und man sähe das Raster – der auffälligste Fehler, den eine
 * gekachelte Karte haben kann.
 *
 * ---
 *
 * **Warten lassen gilt nicht.**
 *
 * Wer eine Fläche ändert, darf nicht auf das Neubacken warten. Drei Dinge
 * greifen ineinander:
 *
 *   1. Die alte Kachel wird **nicht weggeworfen**, sondern zur Seite gelegt.
 *      Bis die neue fertig ist, wird sie weiter gezeigt.
 *   2. Fehlt auch die, wird die **gröbere Stufe darüber** ausschnittweise
 *      vergrößert. Unscharf, aber sofort – und das ist die Vorschau.
 *   3. Gebacken wird unter einem **Zeitbudget je Bild**, das Nächstliegende
 *      zuerst.
 *
 * ---
 *
 * **Der Speicher.**
 *
 * Eine Kachel von 256 Punkten bei doppelter Dichte sind 1 MB. Ohne Deckel
 * wächst der Zwischenspeicher, bis Safari die Seite beendet. Es gilt deshalb
 * ein Byte-Budget, und das Älteste fällt zuerst heraus.
 */

import { FELD } from '../karte/modell';

/** Kantenlänge einer Kachel in Bildpunkten, vor der Gerätedichte. */
export const KACHEL_PX = 256;

/**
 * Wie fein es höchstens wird.
 *
 * Stufe 5 heißt: eine Kachel deckt 31 Karteneinheiten ab. Die engste Sicht
 * der Karte ist ein Achtel des Feldes (125 Einheiten), also reicht das mit
 * Abstand – und mehr Stufen hießen nur mehr Kacheln im Speicher.
 */
export const HOECHSTE_STUFE = 5;

/** Wie viel Kartenmaß eine Kachel dieser Stufe abdeckt. */
export function kachelmass(stufe: number): number {
  return FELD / 2 ** stufe;
}

/**
 * Welche Stufe zu dieser Sicht passt.
 *
 * Aufgerundet, nie abgerundet: Eine Kachel darf feiner sein als nötig – das
 * kostet nur Speicher. Ist sie gröber, sieht man es sofort als Unschärfe.
 */
export function stufeFuer(breitePx: number, sichtBreite: number, vorige?: number): number {
  if (breitePx <= 0 || sichtBreite <= 0) return 0;
  const roh = Math.log2((breitePx * FELD) / (sichtBreite * KACHEL_PX));
  const ideal = Math.max(0, Math.min(HOECHSTE_STUFE, Math.ceil(roh)));

  /*
   * **Hysterese: die Stufe wechselt nicht bei jedem Schritt.**
   *
   * Ein Zusammenziehen mit zwei Fingern läuft durch den ganzen Bereich. Ohne
   * Hysterese wechselt die Stufe dabei fünfmal, und jedes Mal muss ein
   * kompletter Satz Kacheln neu entstehen. Gemessen war der gekachelte Weg
   * beim Zoomen deshalb **doppelt so teuer** wie der alte – mitten in der
   * Geste, also genau dort, wo es am meisten stört.
   *
   * Eine vorhandene Stufe wird deshalb behalten, solange sie zwischen halber
   * und doppelter Auflösung liegt. Innerhalb dieses Bandes ist der
   * Unterschied eine Spur Unschärfe; ausserhalb sieht man ihn.
   */
  if (vorige === undefined) return ideal;
  const verhaeltnis = 2 ** (vorige - roh);
  if (verhaeltnis >= 0.72 && verhaeltnis <= 2.1) return vorige;
  return ideal;
}

export interface Kasten {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Kachel {
  leinwand: HTMLCanvasElement | OffscreenCanvas;
  /** Kartenraum, den diese Kachel abdeckt. */
  x0: number;
  y0: number;
  mass: number;
  stufe: number;
  /** Nur zum Messen. */
  bytes: number;
}

/** Was eine Kachel füllt. Bekommt einen Kontext im Kartenmaß. */
export type Kachelmaler = (
  ctx: CanvasRenderingContext2D,
  kasten: Kasten,
  massstab: number,
) => void;

export interface Werkplan {
  /** Wie viel Speicher der Zwischenspeicher höchstens hält. */
  budgetBytes: number;
  /** Wie lange je Bild gebacken werden darf. */
  budgetMs: number;
  /** Wie weit Staffage über ihre Kachel hinausragen darf, im Kartenmaß. */
  ueberstand: number;
  /** Gerätedichte, gedeckelt. */
  dichte: number;
}

export const WERKPLAN: Werkplan = {
  /*
   * 48 MB.
   *
   * Bei doppelter Dichte ist eine Kachel 1 MB, das sind 48 Kacheln. Sichtbar
   * sind höchstens sechzehn, also hält der Speicher gut drei Bildschirme
   * Vorrat – genug, dass Hin- und Herschieben nichts neu backt, und wenig
   * genug, dass ein Telefon es trägt.
   */
  budgetBytes: 48 * 1024 * 1024,
  /*
   * Acht Millisekunden.
   *
   * Ein Bild bei sechzig Hertz hat sechzehn. Die Hälfte fürs Backen zu
   * nehmen heißt: Es ruckelt nie, es dauert nur manchmal zwei Bilder länger,
   * bis alles scharf ist.
   */
  budgetMs: 8,
  ueberstand: 60,
  dichte: 1,
};

/**
 * Ein Zwischenspeicher für eine Lage.
 *
 * Jede Lage hat ihr eigenes Werk: Das Gelände ändert sich selten und ist
 * teuer, der Bewuchs ändert sich oft. Zusammen in einem Speicher müsste eine
 * geänderte Waldfläche auch die Küste darunter neu backen.
 */
export class Kachelwerk {
  private frisch = new Map<string, Kachel>();
  /** Was gerade ersetzt wird – wird weiter gezeigt, bis das Neue da ist. */
  private alt = new Map<string, Kachel>();
  private warteschlange: { s: string; i: number; j: number; stufe: number }[] = [];

  /**
   * Welche Stufe gerade gebraucht wird.
   *
   * Setzt der Maler. Das Verdrängen sieht darauf: Eine Kachel einer anderen
   * Stufe ist entbehrlicher als eine der aktuellen, auch wenn sie jünger
   * ist. Ohne diese Unterscheidung warf der Speicher genau das weg, was im
   * nächsten Bild wieder gebraucht wurde.
   */
  aktuelleStufe = 0;

  /* Zum Messen. */
  gebacken = 0;
  msGebacken = 0;
  verdraengt = 0;

  constructor(
    public readonly name: string,
    private maler: Kachelmaler,
    private plan: Werkplan = WERKPLAN,
  ) {}

  private schluessel(i: number, j: number, stufe: number) {
    return `${stufe}/${i}/${j}`;
  }

  /** Wie viele Bytes die Kacheln belegen. */
  bytes(): number {
    let b = 0;
    for (const k of this.frisch.values()) b += k.bytes;
    for (const k of this.alt.values()) b += k.bytes;
    return b;
  }

  anzahl(): number {
    return this.frisch.size;
  }

  wartend(): number {
    return this.warteschlange.length;
  }

  /**
   * Eine Kachel holen, ohne zu backen.
   *
   * Gibt zurück, was da ist – frisch, sonst veraltet, sonst nichts. Der Maler
   * entscheidet dann, ob er die gröbere Stufe als Vorschau nimmt.
   */
  nachsehen(i: number, j: number, stufe: number): { kachel: Kachel; frisch: boolean } | undefined {
    const s = this.schluessel(i, j, stufe);
    const f = this.frisch.get(s);
    if (f) {
      /* Nach hinten schieben: Eine Map gibt ihre Einträge in Einfügereihenfolge
         zurück, und genau das macht das Verdrängen „ältestes zuerst". */
      this.frisch.delete(s);
      this.frisch.set(s, f);
      return { kachel: f, frisch: true };
    }
    const a = this.alt.get(s);
    if (a) return { kachel: a, frisch: false };
    return undefined;
  }

  /** Eine fehlende Kachel vormerken. Nächstliegende zuerst. */
  anfordern(i: number, j: number, stufe: number, naeheZu: { x: number; y: number }) {
    const s = this.schluessel(i, j, stufe);
    if (this.frisch.has(s)) return;
    if (this.warteschlange.some((w) => w.s === s)) return;
    this.warteschlange.push({ s, i, j, stufe });
    const mass = kachelmass(stufe);
    this.warteschlange.sort((a, b) => {
      const da = Math.hypot((a.i + 0.5) * kachelmass(a.stufe) - naeheZu.x,
        (a.j + 0.5) * kachelmass(a.stufe) - naeheZu.y);
      const db = Math.hypot((b.i + 0.5) * mass - naeheZu.x, (b.j + 0.5) * mass - naeheZu.y);
      return da - db;
    });
  }

  /**
   * Backen, bis das Budget aufgebraucht ist.
   *
   * Gibt zurück, ob noch etwas aussteht – dann muss der Aufrufer im nächsten
   * Bild wiederkommen.
   */
  backeBudgetiert(): boolean {
    const bis = performance.now() + this.plan.budgetMs;
    while (this.warteschlange.length && performance.now() < bis) {
      const w = this.warteschlange.shift()!;
      this.backe(w.i, w.j, w.stufe);
    }
    return this.warteschlange.length > 0;
  }

  private backe(i: number, j: number, stufe: number) {
    const t0 = performance.now();
    const mass = kachelmass(stufe);
    const px = Math.round(KACHEL_PX * this.plan.dichte);
    const leinwand = neueLeinwand(px, px);
    const ctx = leinwand.getContext('2d') as CanvasRenderingContext2D | null;
    if (!ctx) return;

    const massstab = px / mass;
    const x0 = i * mass;
    const y0 = j * mass;
    ctx.setTransform(massstab, 0, 0, massstab, -x0 * massstab, -y0 * massstab);
    this.maler(ctx, { x0, y0, x1: x0 + mass, y1: y0 + mass }, massstab);

    const s = this.schluessel(i, j, stufe);
    this.frisch.set(s, { leinwand, x0, y0, mass, stufe, bytes: px * px * 4 });
    this.alt.delete(s);
    this.gebacken++;
    this.msGebacken += performance.now() - t0;
    this.verdraengeUeberschuss();
  }

  /**
   * Hinaus, bis das Budget wieder stimmt – in drei Durchgängen.
   *
   * ---
   *
   * **Warum nicht einfach das Älteste.**
   *
   * Der erste Anlauf tat genau das, und die Sonde zeigte, was dabei
   * herauskommt: **74 Verdrängungen bei 122 gebackenen Kacheln.** Nach jedem
   * Zoomschritt liegen Kacheln mehrerer Stufen im Speicher; das Älteste war
   * regelmäßig eine Kachel der gerade benutzten Stufe, und sie wurde im
   * nächsten Bild sofort wieder gebraucht. Der Speicher arbeitete gegen sich
   * selbst.
   *
   * Die Reihenfolge ist deshalb: erst das Veraltete (ohnehin nur Notbehelf),
   * dann fremde Stufen (die braucht gerade niemand), und erst zuletzt das
   * Älteste der aktuellen Stufe.
   */
  private verdraengeUeberschuss() {
    let b = this.bytes();
    if (b <= this.plan.budgetBytes) return;

    for (const [s, k] of this.alt) {
      if (b <= this.plan.budgetBytes) break;
      this.alt.delete(s);
      b -= k.bytes;
      this.verdraengt++;
    }
    for (const durchgang of [0, 1]) {
      for (const [s, k] of this.frisch) {
        if (b <= this.plan.budgetBytes) break;
        if (durchgang === 0 && k.stufe === this.aktuelleStufe) continue;
        this.frisch.delete(s);
        b -= k.bytes;
        this.verdraengt++;
      }
      if (b <= this.plan.budgetBytes) break;
    }
  }

  /**
   * Was dieser Kasten berührt, ist nicht mehr gültig – **und nur das**.
   *
   * Die alten Bilder wandern zur Seite, statt zu verschwinden: Bis die neuen
   * fertig sind, wird weiter das Alte gezeigt. Ein kurz veraltetes Stück
   * Landschaft ist besser als ein Loch, und ungleich besser als ein Ruckeln.
   */
  entwerte(kasten: Kasten): number {
    const rand = this.plan.ueberstand;
    let weg = 0;
    for (const [s, k] of [...this.frisch]) {
      if (k.x0 + k.mass < kasten.x0 - rand || k.x0 > kasten.x1 + rand) continue;
      if (k.y0 + k.mass < kasten.y0 - rand || k.y0 > kasten.y1 + rand) continue;
      this.frisch.delete(s);
      this.alt.set(s, k);
      weg++;
    }
    /* Vorgemerkte Kacheln in diesem Bereich sind auch hinfällig. */
    this.warteschlange = this.warteschlange.filter((w) => {
      const m = kachelmass(w.stufe);
      const x0 = w.i * m, y0 = w.j * m;
      return x0 + m < kasten.x0 - rand || x0 > kasten.x1 + rand
        || y0 + m < kasten.y0 - rand || y0 > kasten.y1 + rand;
    });
    return weg;
  }

  /** Alles vergessen – nach einem Stilwechsel. */
  leere() {
    this.frisch.clear();
    this.alt.clear();
    this.warteschlange = [];
  }

  /** Nur zum Messen: wie viele veraltete Bilder noch gezeigt würden. */
  veraltete(): number {
    return this.alt.size;
  }
}

/**
 * Eine Zeichenfläche ohne Anzeige.
 *
 * `OffscreenCanvas` gibt es erst ab Safari 16.4. Ein gewöhnliches `<canvas>`,
 * das nie im Dokument hängt, tut dasselbe und kostet etwas mehr – der
 * Rückfallweg ist deshalb kein Notbehelf, sondern einfach der ältere Weg.
 */
function neueLeinwand(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
