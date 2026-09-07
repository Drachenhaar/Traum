/**
 * Was eine Karte zu einer gezeichneten Karte macht.
 *
 * Zwei Ableitungen, beide **nur** aus dem Umriss, den der Verfasser gezogen
 * hat. Sie erfinden keine Geografie – sie sagen dasselbe noch einmal, in der
 * Sprache, in der Karten seit vierhundert Jahren gezeichnet werden:
 *
 *   `saumlinien`  – die Küste, ein- bis zweimal ins Wasser hinein wiederholt.
 *   `hauptachse`  – die Richtung, in der eine Fläche lang ist, damit ihr Name
 *                   ihr folgen kann statt quer darüber zu liegen.
 *
 * ---
 *
 * **Warum das Raster und nicht der Versatz je Eckpunkt.**
 *
 * Der naheliegende Weg ist, jeden Punkt entlang seiner Normalen zu
 * verschieben. Er ist zehn Zeilen lang und er ist falsch: An jeder Stelle, wo
 * die Küste enger gekrümmt ist als der Abstand, überschlagen sich die
 * verschobenen Punkte, und statt einer Linie steht dort ein Knäuel. Eine
 * Küste ist nicht konvex; genau dafür gibt es sie.
 *
 * Im ersten Entwurf war das an der Innenseite sofort zu sehen und an den
 * spitzen Enden einer Landzunge auch aussen. Deshalb läuft beides über ein
 * **Abstandsfeld**: Für jede Rasterzelle wird der vorzeichenbehaftete Abstand
 * zur Küste bestimmt, und eine Saumlinie ist danach nichts weiter als die
 * Kontur bei einem bestimmten Wert. Das kann sich nicht überschlagen, weil es
 * gar keine Punkte verschiebt.
 *
 * **Ein Feld, beliebig viele Linien.** Das ist der zweite Grund: Der teure
 * Teil ist das Feld, nicht die einzelne Linie. Zwei Säume kosten deshalb kaum
 * mehr als einer.
 */

import { imPolygon, kasten, randabstand, type Punkt } from './modell';
import { glaette, konturenAus, vereinfache } from './kontur';

/**
 * Wie fein das Abstandsfeld ist.
 *
 * Sechs Einheiten – gröber als das Bearbeiten (`ZELLE_FEIN` = 4), feiner als
 * das Malen (`ZELLE` = 8). Das ist vertretbar, weil hier nichts entsteht, was
 * jemand später bearbeitet: Eine Saumlinie ist Anstrich und wird bei jeder
 * Änderung neu gezogen. Sie muss ruhig aussehen, nicht treu sein.
 */
const ZELLE_SAUM = 6;

interface Abstandsfeld {
  breite: number;
  hoehe: number;
  x0: number;
  y0: number;
  /** Vorzeichenbehaftet: innen positiv, aussen negativ. */
  werte: Float32Array;
}

/**
 * Für jede Zelle: Wie weit ist sie von der Küste entfernt, und auf welcher
 * Seite liegt sie?
 *
 * Das ist der einzige teure Schritt – Zellen mal Kanten. Er läuft einmal je
 * Fläche und trägt danach alle Linien, die man von ihr haben will.
 */
function abstandsfeld(polys: Punkt[][], weiteste: number): Abstandsfeld {
  const kaesten = polys.map(kasten);
  const rand = weiteste + ZELLE_SAUM * 3;
  const x0 = Math.min(...kaesten.map((k) => k.x0)) - rand;
  const y0 = Math.min(...kaesten.map((k) => k.y0)) - rand;
  const x1 = Math.max(...kaesten.map((k) => k.x1)) + rand;
  const y1 = Math.max(...kaesten.map((k) => k.y1)) + rand;
  const breite = Math.max(3, Math.ceil((x1 - x0) / ZELLE_SAUM));
  const hoehe = Math.max(3, Math.ceil((y1 - y0) / ZELLE_SAUM));
  const werte = new Float32Array(breite * hoehe);

  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const p: Punkt = [x0 + (x + 0.5) * ZELLE_SAUM, y0 + (y + 0.5) * ZELLE_SAUM];
      let naechste = Infinity;
      let drin = false;
      for (let i = 0; i < polys.length; i++) {
        /*
         * Flächen, die weit weg sind, gar nicht erst befragen.
         *
         * Ohne diese Schranke kostet das Feld Zellen mal *allen* Kanten der
         * Karte. Mit ihr kostet es ungefähr so viel wie ein Feld je Fläche –
         * und liefert trotzdem den gemeinsamen Saum.
         */
        const k = kaesten[i];
        if (
          p[0] < k.x0 - rand || p[0] > k.x1 + rand ||
          p[1] < k.y0 - rand || p[1] > k.y1 + rand
        ) {
          continue;
        }
        const d = randabstand(p, polys[i]);
        if (d < naechste) naechste = d;
        if (!drin && imPolygon(p, polys[i])) drin = true;
      }
      /* Nichts in Reichweite: weit draussen, und weiter als jeder Saum. */
      werte[y * breite + x] = naechste === Infinity ? -1e9 : drin ? naechste : -naechste;
    }
  }
  return { breite, hoehe, x0, y0, werte };
}

/**
 * Der Umriss, um `abstand` versetzt.
 *
 * Positiv heisst nach aussen, negativ nach innen. Zurück kommen **alle**
 * Schleifen: Ein Versatz nach innen kann eine schmale Landzunge in zwei Teile
 * zerlegen, und beide gehören dazu.
 *
 * Die Liste ist leer, wenn bei diesem Abstand nichts mehr übrig ist – bei
 * einem Versatz nach innen, der tiefer geht als die Fläche dick ist. Das ist
 * kein Fehler, sondern die Auskunft, dass die Fläche dort zu Ende ist.
 */
export function versetzt(poly: Punkt[], abstand: number): Punkt[][] {
  if (poly.length < 3) return [];
  const feld = abstandsfeld([poly], Math.max(0, abstand));
  return schnitt(feld, abstand);
}

/**
 * Die Säume einer Küste – mehrere Abstände aus **einem** Feld.
 *
 * Genau dafür ist das Feld da: Der teure Teil läuft einmal, und jeder weitere
 * Saum kostet nur noch eine Konturverfolgung.
 */
export function saumlinien(poly: Punkt[], abstaende: number[]): Punkt[][][] {
  if (poly.length < 3 || !abstaende.length) return [];
  const feld = abstandsfeld([poly], Math.max(...abstaende.map(Math.abs)));
  return abstaende.map((d) => schnitt(feld, d));
}

/**
 * Der Saum **der Küste**, nicht der einer Insel.
 *
 * Das ist der Unterschied, den man erst im Bild sieht. Je Fläche gerechnet
 * bekommt jede Insel ihren eigenen Ring – und wo zwei Inseln einander nahe
 * kommen, laufen zwei Ringe durcheinander hindurch. Auf dem Telefon sah das
 * aus wie ein Fehler im Papier, und es *ist* einer: Zwischen zwei Küsten
 * liegt eine Meerenge, und eine Meerenge hat einen Saum, nicht zwei
 * gekreuzte.
 *
 * Über **ein** Feld für alles Land gerechnet, löst sich das von selbst. Der
 * Abstand einer Stelle zur Küste ist der Abstand zur nächsten Küste – egal,
 * zu welcher Insel sie gehört. Zwei Inseln nebeneinander bekommen dann eine
 * gemeinsame Linie, die um beide herumläuft, genau wie ein Kartograf sie
 * zöge.
 *
 * Und es ist zugleich der billigere Weg: ein Feld statt eines je Fläche.
 */
export function kuestensaum(polys: Punkt[][], abstaende: number[]): Punkt[][][] {
  const flaechen = polys.filter((p) => p.length >= 3);
  if (!flaechen.length || !abstaende.length) return [];
  const feld = abstandsfeld(flaechen, Math.max(...abstaende.map(Math.abs)));
  return abstaende.map((d) => schnitt(feld, d));
}

/** Die Kontur des Feldes bei einem Wert – der eigentliche Schnitt. */
function schnitt(feld: Abstandsfeld, abstand: number): Punkt[][] {
  const { breite, hoehe, x0, y0, werte } = feld;
  const zellen = new Uint8Array(breite * hoehe);
  /*
   * „Innen" heisst hier: mindestens so weit von der Küste entfernt wie der
   * gesuchte Abstand. Bei einem Saum nach aussen (`abstand` positiv) ist die
   * Schwelle negativ – die Zelle darf also ein Stück ausserhalb liegen.
   */
  const schwelle = -abstand;
  for (let i = 0; i < werte.length; i++) if (werte[i] >= schwelle) zellen[i] = 1;

  return konturenAus({ breite, hoehe, x0, y0, zelle: ZELLE_SAUM, zellen })
    .filter((k) => k.length >= 8)
    .map((k) => glaette(vereinfache(k, ZELLE_SAUM * 0.9)))
    .filter((k) => k.length >= 3);
}

/* ------------------------------------------------------- Die Hauptachse -- */

export interface Achse {
  /** Der Schwerpunkt der Punkte – dort steht der Name. */
  mx: number;
  my: number;
  /** Die Richtung der langen Achse, in Grad. */
  grad: number;
  /**
   * Wie deutlich diese Richtung überhaupt ist – das Verhältnis der beiden
   * Hauptträgheitsachsen. 1 heisst kreisrund, 3 heisst dreimal so lang wie
   * breit.
   */
  streckung: number;
}

/**
 * Ab wann eine Fläche eine Richtung hat.
 *
 * Unter diesem Wert ist sie rundlich, und dann gibt es keine lange Achse –
 * die gemessene Richtung ist dann das Rauschen der Küste, nicht die Gestalt
 * des Landes. Im ersten Entwurf fehlte diese Schranke, und der Name stand
 * senkrecht quer über einer runden Insel, weil ein paar Buchten zufällig auf
 * einer Linie lagen.
 *
 * 1,35 heisst: gut ein Drittel länger als breit. Darunter setzt man
 * waagerecht, und das ist keine Notlösung, sondern richtig – auf einer Karte
 * steht der Name eines runden Landes waagerecht.
 */
export const DEUTLICH = 1.35;

/**
 * Die lange Achse einer Fläche.
 *
 * Hauptkomponenten über die Umrisspunkte: die Richtung, in der die Punkte am
 * weitesten streuen. Für einen Namen ist das genau die richtige Frage – er
 * soll dort liegen, wo die Fläche Platz hat.
 */
export function hauptachse(poly: Punkt[]): Achse {
  let sx = 0;
  let sy = 0;
  for (const [x, y] of poly) {
    sx += x;
    sy += y;
  }
  const mx = sx / poly.length;
  const my = sy / poly.length;

  let xx = 0;
  let yy = 0;
  let xy = 0;
  for (const [x, y] of poly) {
    const a = x - mx;
    const b = y - my;
    xx += a * a;
    yy += b * b;
    xy += a * b;
  }
  const winkel = 0.5 * Math.atan2(2 * xy, xx - yy);
  const wurzel = Math.sqrt((xx - yy) ** 2 + 4 * xy * xy);
  const e1 = (xx + yy + wurzel) / 2;
  const e2 = (xx + yy - wurzel) / 2;

  return {
    mx,
    my,
    grad: (winkel * 180) / Math.PI,
    streckung: e2 > 1e-9 ? Math.sqrt(e1 / e2) : 99,
  };
}

/**
 * Wie ein Name auf dieser Fläche zu stehen hat.
 *
 * Gedreht nur, wenn die Fläche wirklich eine Richtung hat – und dann gesperrt,
 * weil ein Name, der einer Küste folgt, auch die Länge dieser Küste zeigen
 * soll. Ein enggesetzter Name auf einer langen Insel sieht aus, als hätte ihn
 * jemand dort abgelegt; ein gesperrter sieht aus, als gehörte er dorthin.
 *
 * ---
 *
 * **Kein Name steht kopf, und dafür braucht es nichts.**
 *
 * Hier stand eine Normierung auf −90…90, damit kein Name auf dem Kopf landet.
 * Die Gegenprobe – sie herausnehmen – blieb grün, und der Grund ist eine
 * Rechnung: `atan2` liefert (−180°, 180°], die Hälfte davon ist (−90°, 90°].
 * Der Winkel **kann** nicht ausserhalb liegen.
 *
 * Die Schleife war also unerreichbar: eine Vorsichtsmassnahme, die nie lief
 * und trotzdem behauptete, etwas zu verhindern. Was bleibt, ist die
 * Zusicherung im Test – sie prüft die Eigenschaft weiterhin, nur eben an der
 * Stelle, an der sie herkommt.
 */
export function namenslage(poly: Punkt[]): {
  mx: number;
  my: number;
  grad: number;
  sperrung: number;
} {
  const { mx, my, grad, streckung } = hauptachse(poly);
  if (streckung < DEUTLICH) return { mx, my, grad: 0, sperrung: 0 };
  return { mx, my, grad, sperrung: 0.28 };
}
