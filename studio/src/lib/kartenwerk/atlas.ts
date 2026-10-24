/**
 * Der Atlas – gemalte Grafiken im Kartenwerk.
 *
 * ---
 *
 * **Die zweite Hälfte des Hybriden.**
 *
 * `stilbuch.ts` sagt: Ein Stileintrag kann zeichnen, und wie, geht niemanden
 * etwas an. Bisher gab es nur eine Antwort – einen Pinsel aus Code. Hier
 * kommt die zweite: ein Ausschnitt aus einem Bild.
 *
 * Der Maler merkt den Unterschied nicht. Das ist der ganze Punkt.
 *
 * ---
 *
 * **Warum ein Atlas und nicht einzelne Dateien.**
 *
 * Ein Wald sind schnell zweitausend Bäume. Zweitausend `drawImage` aus
 * zweitausend verschiedenen Quellen zwingen den Browser zu zweitausend
 * Texturwechseln. Aus einem Atlas sind es zweitausend Ausschnitte
 * **derselben** Quelle – und ein Ladevorgang statt vierundzwanzig.
 *
 * ---
 *
 * **Warum Mipstufen.**
 *
 * Ein Baumbild von 190 Punkten, auf zwölf heruntergerechnet, flimmert beim
 * Schieben: Der Browser trifft bei jedem Bild andere Quellpunkte. Aus einer
 * passenden Stufe geholt, steht es still. Das ist die Antwort auf „Zoomen
 * darf nicht zu unbrauchbaren Grafiken führen" – in beide Richtungen.
 *
 * ---
 *
 * **Und was passiert, wenn der Atlas fehlt.**
 *
 * Nichts. `ladeAtlas` gibt dann `undefined` zurück, das Stilbuch nimmt
 * seinen Pinsel, und die Karte sieht aus wie vorher. Eine Karte, die ohne
 * ihre Bilder weiß bleibt, wäre ein schlechter Tausch – zumal genau das
 * beim ersten Öffnen ohne Netz passieren kann.
 */

import type { Stileintrag } from './stilbuch';
import type { Lage, Staffage } from './staffage';

/** Ein Ausschnitt: x, y, Breite, Höhe im Atlasbild. */
export type Ausschnitt = [number, number, number, number];

export interface Atlasart {
  varianten: number;
  breiteZuHoehe: number;
  /** Wie hoch dieses Ding auf der Karte steht, im Kartenmass. */
  karteHoehe?: number;
  /** Der Ankerpunkt, als Anteil der Bildmaße. */
  ankerX: number;
  ankerY: number;
  /** Die Mipfaktoren, absteigend: [1, 0.5, 0.25]. */
  stufen: number[];
  /** Je Variante die Ausschnitte, von fein nach grob. */
  felder: Ausschnitt[][];
}

export interface Atlasverzeichnis {
  stil: string;
  breite: number;
  hoehe: number;
  arten: Record<string, Atlasart>;
}

export interface Atlas {
  bild: CanvasImageSource;
  verzeichnis: Atlasverzeichnis;
}

/**
 * Einen Bildersatz laden.
 *
 * Scheitert nie laut: Fehlt die Datei, ist sie kaputt oder das Gerät offline
 * und der Vorrat leer, kommt `undefined` zurück und die Karte zeichnet
 * weiter mit dem Pinsel.
 */
export async function ladeAtlas(stil: string, basis: string): Promise<Atlas | undefined> {
  try {
    const ordner = `${basis}karte/${stil}/`;
    const antwort = await fetch(`${ordner}atlas.json`);
    if (!antwort.ok) return undefined;
    const verzeichnis = (await antwort.json()) as Atlasverzeichnis;
    if (!verzeichnis?.arten) return undefined;

    const bild = await new Promise<HTMLImageElement | undefined>((fertig) => {
      const i = new Image();
      i.onload = () => fertig(i);
      i.onerror = () => fertig(undefined);
      i.src = `${ordner}atlas.png`;
    });
    if (!bild) return undefined;
    return { bild, verzeichnis };
  } catch {
    return undefined;
  }
}

/**
 * Ein Stileintrag, der aus dem Atlas zeichnet.
 *
 * Gibt `undefined` zurück, wenn dieser Atlas die Art nicht kennt – dann
 * entscheidet das Stilbuch, ob es einen Pinsel dafür hat.
 */
export function bildEintrag(
  atlas: Atlas,
  art: string,
  lage: Lage,
  ebene: number,
): Stileintrag | undefined {
  const a = atlas.verzeichnis.arten[art];
  if (!a || !a.felder?.length) return undefined;

  return {
    varianten: a.varianten,
    /*
     * Eine gezeichnete Illustration will grösser sein als eine Feder aus
     * drei Strichen – sonst sieht man weder Rinde noch Blatt, und die
     * Kronen berühren sich nicht. Siehe `Stileintrag.hoehe`.
     */
    hoehe: a.karteHoehe ?? 15,
    lage,
    ebene,
    breiteZuHoehe: a.breiteZuHoehe,
    zeichne(ctx, s: Staffage, massstab: number) {
      const stufen = a.felder[s.variante % a.felder.length];
      if (!stufen?.length) return;

      /*
       * **Die Stufe nach der gezeichneten Größe, nicht nach dem Zoom.**
       *
       * Ein kleiner Baum bei starker Vergrößerung braucht dieselbe Stufe wie
       * ein großer bei schwacher. Was zählt, ist, wie viele Bildpunkte
       * dieses eine Bild am Ende bedeckt.
       */
      const zielPx = s.h * massstab;
      let gewaehlt = 0;
      for (let i = stufen.length - 1; i >= 0; i--) {
        if (stufen[i][3] >= zielPx * 0.85) { gewaehlt = i; break; }
      }
      const [qx, qy, qw, qh] = stufen[gewaehlt];

      const hoehe = s.h;
      const breite = hoehe * a.breiteZuHoehe;

      ctx.save();
      ctx.translate(s.x, s.y);
      if (s.dreh) ctx.rotate(s.dreh);
      if (s.spiegel) ctx.scale(-1, 1);
      ctx.drawImage(
        atlas.bild,
        qx, qy, qw, qh,
        -breite * a.ankerX,
        -hoehe * a.ankerY,
        breite,
        hoehe,
      );
      ctx.restore();
    },
  };
}
