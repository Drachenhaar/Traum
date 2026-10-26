/**
 * Die Leinwand der Karte – das Kartenwerk an React angeschlossen.
 *
 * ---
 *
 * **Was hier ersetzt wird.**
 *
 * Genau ein `useEffect` aus `Weltkarte.tsx`: der, der an `sicht` hing und
 * deshalb beim Schieben jeden Baum neu zeichnete. Die Flächen, die Küste, die
 * Säume, die Namen, die Auswahl, die Fingergesten – alles bleibt, wo es war.
 *
 * Es gibt **keine zweite Kartenimplementierung**. Es gibt denselben Renderer
 * mit einem Zwischenspeicher dazwischen.
 *
 * ---
 *
 * **Die zwei Lagen.**
 *
 * `staffage.ts` kennt `grund` und `bewuchs`, und das Kachelwerk ist je Lage
 * eines. Lange lief nur `bewuchs`; hier stand an dieser Stelle der Satz, ein
 * zweites Kachelwerk für `grund` anzulegen sei „eine Ergänzung, keine
 * Änderung". Das Gebirge hat ihn eingelöst – es ist genau das geworden: ein
 * zweiter Zwischenspeicher mit einem zweiten Pinsel, und keine Zeile des
 * ersten hat sich dafür geändert.
 *
 * Die Flächen des Geländes liegen weiterhin in SVG, und das bleibt so. Dort
 * sitzen die **Fangbereiche**: Wer auf eine Waldfläche tippt, trifft einen
 * Pfad im Dokument, und daran hängen Auswahl, Bedeutung und Seitenzuordnung.
 *
 * ```
 * SVG        Land, Wasser, Wald als Flächen – und alle Fangbereiche
 * grund      das Gebirgsrelief                      (Leinwand, gekachelt)
 * bewuchs    Bäume, Unterholz, Kronendach           (Leinwand, gekachelt)
 * SVG        Namen, Siedlungszeichen, Auswahl
 * ```
 *
 * ---
 *
 * **Die Messung.**
 *
 * `window.__kartenwerk` trägt die laufenden Zahlen – Kacheln, Speicher,
 * gebackene Zeit, veraltete Bilder. Sie steht auch im Fertigbau, weil ein
 * Vergleich, den man nur im Entwicklungsmodus messen kann, nichts über das
 * aussagt, was der Verfasser benutzt. Sie ist nur lesbar und enthält nichts
 * über die Welt, nur über die Maschine.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Kartendokument, Kartenfeature } from '../../lib/karte/modell';
import { kasten } from '../../lib/karte/modell';
import type { Kartenstil } from '../../lib/karte/stil';
import { stilbuchFuer } from '../../lib/kartenwerk/stilbuch';
import { ladeAtlas, type Atlas } from '../../lib/kartenwerk/atlas';
import { staffageAus } from '../../lib/kartenwerk/streuwerk';
import { Staffageraster } from '../../lib/kartenwerk/raster';
import { Kachelwerk, WERKPLAN, stufeFuer, type Kasten } from '../../lib/kartenwerk/kachelwerk';
import { maleLage, type Sichtfeld } from '../../lib/kartenwerk/maler';
import { maleStaffage } from '../../lib/kartenwerk/waldwerk';
import { maleGebirge } from '../../lib/kartenwerk/gebirgswerk';
import { gebirgskasten } from '../../lib/karte/gebirge';
import type { Gebirgskamm } from '../../lib/karte/modell';

export interface Messung {
  /** Wie viele Stücke Staffage die Karte trägt. */
  staffage: number;
  /** Wie lange das Streuen zuletzt gedauert hat. */
  msStreuen: number;
  /** Kacheln im Zwischenspeicher. */
  kacheln: number;
  /** Belegter Leinwandspeicher in Bytes. */
  bytes: number;
  /** Insgesamt gebackene Kacheln, seit die Seite offen ist. */
  gebacken: number;
  /** Gesamte Backzeit in Millisekunden. */
  msGebacken: number;
  /** Wegen Speichermangels verdrängte Kacheln. */
  verdraengt: number;
  /** Kacheln, die gerade noch ihr veraltetes Bild zeigen. */
  veraltet: number;
  /** Beim letzten Bild aus der gröberen Stufe geborgte Kacheln. */
  vorschau: number;
  /** Zuletzt benutzte Stufe. */
  stufe: number;
  /** Dauer des letzten Malvorgangs. */
  msLetztesBild: number;
  /** Wie viele Malvorgänge es gab. */
  bilder: number;
  /** Kacheln im Reliefspeicher. */
  grundkacheln: number;
  /** Gesamte Backzeit des Reliefs. */
  msGrund: number;
  /** Insgesamt gebackene Reliefkacheln. */
  grundGebacken: number;
  /**
   * Wie viele Kacheln noch im Ofen warten – Bewuchs und Grund.
   *
   * ---
   *
   * **Die Zahl, die „ist das Bild fertig?" überhaupt beantwortbar macht.**
   *
   * Sie fehlte, und die Lücke war still: Eine Kachel, die noch gar nicht
   * gebacken ist, zählt weder als `vorschau` noch als `veraltet` – gibt es
   * auch in der gröberen Stufe nichts, zeichnet der Maler an ihrer Stelle
   * **nichts** und erhöht keinen der beiden Zähler. Von aussen sah ein Bild
   * mit einem Loch genauso aus wie ein fertiges.
   *
   * Aufgefallen ist es der Bildprüfung: In einem von mehreren Läufen fehlte
   * im Osten genau ein Kachelrechteck, und der Vergleich schlug an. Die
   * Prüfung hatte recht gegen ihre eigene Wartebedingung.
   */
  wartend: number;
  grundWartend: number;
}

export const messung: Messung = {
  staffage: 0, msStreuen: 0, kacheln: 0, bytes: 0, gebacken: 0, msGebacken: 0,
  verdraengt: 0, veraltet: 0, vorschau: 0, stufe: 0, msLetztesBild: 0, bilder: 0,
  grundkacheln: 0, msGrund: 0, grundGebacken: 0, wartend: 0, grundWartend: 0,
};

/** Damit „keine Gebirge" nicht bei jedem Bild eine neue leere Liste ist. */
const LEER: Gebirgskamm[] = [];

/** Der Kasten, den eine Fläche samt Bewuchs einnimmt. */
function flaechenkasten(f: Kartenfeature): Kasten {
  return kasten(f.punkte);
}

export function useKartenleinwand({
  leinwand,
  huelle,
  karte,
  stil,
  sicht,
}: {
  leinwand: React.RefObject<HTMLCanvasElement | null>;
  huelle: React.RefObject<HTMLDivElement | null>;
  karte: Kartendokument;
  stil: Kartenstil;
  sicht: Sichtfeld;
}) {
  /*
   * Der Bildersatz, einmal je Sitzung.
   *
   * Er wird **nicht** erwartet: Bis er da ist, zeichnet der Pinsel. Kommt er
   * an, entsteht ein neues Stilbuch, der Kachelspeicher wird geleert und die
   * Karte zieht sich nach. Das dauert ein paar Bilder und sieht aus wie ein
   * Nachschärfen – nicht wie ein Umbau.
   */
  const [atlas, setAtlas] = useState<Atlas | undefined>(undefined);
  useEffect(() => {
    let lebt = true;
    const satz = stil.bildsatz;
    if (!satz) return undefined;
    void ladeAtlas(satz, import.meta.env.BASE_URL).then((a) => {
      if (lebt && a) setAtlas(a);
    });
    return () => { lebt = false; };
    /*
     * Am **Bildersatz**, nicht am Stil: Der dunkle Band ist ein eigener Stil
     * und benutzt dieselben Bäume. Zwei Sätze derselben Grafiken wären
     * zweimal derselbe Speicher.
     */
  }, [stil.bildsatz]);

  const stilbuch = useMemo(() => stilbuchFuer(stil, atlas), [stil, atlas]);

  /*
   * Die Gebirgszüge, auch sie über ein Ref.
   *
   * Aus demselben Grund wie die Staffage: Ein neues Kachelwerk je Änderung
   * würfe den ganzen Zwischenspeicher weg – auch für die Kacheln, die gar
   * kein Gebirge tragen.
   */
  const kaemme = karte.kaemme ?? LEER;
  const kaemmeRef = useRef(kaemme);
  kaemmeRef.current = kaemme;

  /*
   * Die Staffage, einmal je Flächenzustand.
   *
   * Nicht je Bild – das war der alte Fehler, nur eine Stufe höher. Das
   * Streuen selbst ist billig; es hier zu wiederholen wäre trotzdem Arbeit
   * ohne Wirkung, denn dieselben Flächen geben dieselbe Liste.
   */
  const staffage = useMemo(() => {
    const t0 = performance.now();
    /*
     * **Die Gebirge gehen mit ein.** Oberhalb der Baumgrenze steht kein
     * Baum mehr; wo er steht, entscheidet also auch die Höhe. Hinge die
     * Liste nicht an den Kämmen, bliebe nach einer Kammänderung der alte
     * Wald auf dem neuen Berg stehen – und zwar still, denn die Kacheln
     * sähen vollständig aus.
     */
    const liste = staffageAus(karte.features, stilbuch, kaemme);
    messung.msStreuen = performance.now() - t0;
    messung.staffage = liste.length;
    return liste;
  }, [karte.features, stilbuch, kaemme]);

  /*
   * Der Maler liest die Staffage aus einem Ref und nicht aus dem Abschluss.
   *
   * Sonst müsste bei jeder Änderung ein neues Kachelwerk entstehen – und mit
   * ihm fiele der ganze Zwischenspeicher weg, auch für die Kacheln, die sich
   * gar nicht geändert haben. Das wäre genau das Gegenteil der Absicht.
   */
  const raster = useMemo(() => new Staffageraster(staffage), [staffage]);
  const rasterRef = useRef(raster);
  rasterRef.current = raster;
  const stilbuchRef = useRef(stilbuch);
  stilbuchRef.current = stilbuch;
  /* Die Lagen des Waldwerks mischen ihre Töne aus dem Stil. */
  const stilRef = useRef(stil);
  stilRef.current = stil;

  const werkRef = useRef<Kachelwerk | null>(null);
  const grundRef = useRef<Kachelwerk | null>(null);
  const vorigeKaemme = useRef<Gebirgskamm[] | null>(null);
  const stufeRef = useRef<number | undefined>(undefined);
  const vorigeFeatures = useRef<Kartenfeature[] | null>(null);
  const vorigesBuch = useRef<ReturnType<typeof stilbuchFuer> | null>(null);
  const vorigerStil = useRef<Kartenstil | null>(null);

  if (!werkRef.current) {
    const dichte = Math.min(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
    werkRef.current = new Kachelwerk(
      'bewuchs',
      (ctx, kach, massstab) => {
        const buch = stilbuchRef.current;
        const rand = WERKPLAN.ueberstand;
        /*
         * **Nur die Zellen, die diese Kachel berührt.**
         *
         * Der Überstand ist mitgerechnet: Was mit dem Fuß daneben steht, kann
         * mit der Krone hineinragen. Ohne ihn hätte jede Kachelgrenze eine
         * Schnittkante quer durch die Bäume.
         *
         * Dass hier das Raster steht und nicht die ganze Liste, ist kein
         * Feinschliff – siehe `raster.ts`, die Messung steht dort.
         */
        const liste = rasterRef.current.imKasten(
          kach.x0 - rand, kach.y0 - rand, kach.x1 + rand, kach.y1 + rand,
        );
        /*
         * **Nicht mehr Stück für Stück, sondern komponiert.**
         *
         * Arten, die eine Masse bilden – heute der Wald –, laufen durch die
         * sechs Lagen des Waldwerks: Boden, Schatten, Unterholz,
         * Kronendach, Kronen, Licht. Alles andere wird gezeichnet wie
         * bisher.
         *
         * Dass das hier steht und nicht im Maler, ist Absicht: Der Maler
         * kopiert Kacheln und weiss nichts von Wäldern.
         */
        maleStaffage(ctx, kach, massstab, liste, buch, stilRef.current, {
          rand,
          dichte,
        });
      },
      { ...WERKPLAN, dichte },
    );
    /*
     * **Die Grundlage: das Gebirgsrelief.**
     *
     * Ein eigenes Werk, weil es sich anders verhält. Ein Gebirge ändert
     * sich selten und kostet beim Backen mehr als ein Wald; es gehört
     * deshalb in einen Speicher, den eine Waldänderung nicht anfasst.
     *
     * Der Überstand ist null: Das Relief ragt nicht über seine Kachel
     * hinaus, denn es wird Ort für Ort gerechnet und nicht gestempelt.
     */
    grundRef.current = new Kachelwerk(
      'grund',
      (ctx, kach, massstab) => {
        maleGebirge(ctx, kach, massstab, kaemmeRef.current, stilRef.current, { dichte });
      },
      { ...WERKPLAN, ueberstand: 0, dichte },
    );
  }

  /*
   * Gezielt entwerten.
   *
   * Verglichen wird Fläche für Fläche über die Kennung. Was neu ist, was
   * verschwunden ist und was sich geändert hat, entwertet seinen eigenen
   * Kasten – und nur den. Eine geänderte Waldfläche im Norden lässt die
   * Kacheln im Süden stehen.
   */
  useEffect(() => {
    const werk = werkRef.current;
    if (!werk) return;

    if (vorigesBuch.current && vorigesBuch.current !== stilbuch) {
      /*
       * Ein anderes Stilbuch ist ein anderes Bild – da hilft kein Entwerten
       * nach Kasten. Das gilt für einen Stilwechsel genauso wie für den
       * Augenblick, in dem die gemalten Grafiken eintreffen.
       */
      werk.leere();
    }
    vorigesBuch.current = stilbuch;

    const vorher = vorigeFeatures.current;
    if (vorher === null) {
      vorigeFeatures.current = karte.features;
      return;
    }
    if (vorher === karte.features) return;

    const alt = new Map(vorher.map((f) => [f.id, f]));
    const neu = new Map(karte.features.map((f) => [f.id, f]));

    for (const [id, f] of neu) {
      const a = alt.get(id);
      if (a === f) continue;
      werk.entwerte(flaechenkasten(f));
      if (a) werk.entwerte(flaechenkasten(a));
    }
    for (const [id, f] of alt) {
      if (!neu.has(id)) werk.entwerte(flaechenkasten(f));
    }

    vorigeFeatures.current = karte.features;
  }, [karte.features, stilbuch]);

  /*
   * Dasselbe für die Gebirge – getrennt, weil sie ein eigenes Werk haben.
   *
   * **Beide Kästen entwerten, den alten und den neuen.** Wer einen Kamm
   * verschiebt, macht an seinem alten Platz etwas frei und an seinem neuen
   * etwas voll; nur den neuen zu entwerten liesse ein Gespenst stehen.
   */
  useEffect(() => {
    const werk = grundRef.current;
    const bewuchs = werkRef.current;
    if (!werk) return;

    if (vorigerStil.current && vorigerStil.current !== stil) werk.leere();
    vorigerStil.current = stil;

    const vorher = vorigeKaemme.current;
    if (vorher === null) {
      vorigeKaemme.current = kaemme;
      return;
    }
    if (vorher === kaemme) return;

    /*
     * **Beide Werke, nicht nur das Relief.**
     *
     * Hier stand nur `werk` – und das war still falsch, seit es eine
     * Baumgrenze gibt: Ein verschobener Kamm ändert auch, welche Bäume
     * oben noch stehen. Die Bewuchskacheln blieben mit ihrem alten Wald
     * liegen, und weil sie vollständig aussahen, forderte sie niemand neu
     * an. Ein Wald, der auf einem Berg steht, den es dort nicht mehr gibt.
     */
    const beide = (kasten: ReturnType<typeof gebirgskasten>) => {
      werk.entwerte(kasten);
      bewuchs?.entwerte(kasten);
    };

    const alt = new Map(vorher.map((k) => [k.id, k]));
    const neu = new Map(kaemme.map((k) => [k.id, k]));
    for (const [id, k] of neu) {
      const a = alt.get(id);
      if (a === k) continue;
      beide(gebirgskasten(k));
      if (a) beide(gebirgskasten(a));
    }
    for (const [id, k] of alt) {
      if (!neu.has(id)) beide(gebirgskasten(k));
    }
    vorigeKaemme.current = kaemme;
  }, [kaemme, stil]);

  /*
   * Das Malen – **eine Schleife, die stehen bleibt.**
   *
   * ---
   *
   * **Der Fehler, der hier vorher stand, und den die alte Fassung noch hat.**
   *
   * Der Zeichen-Effekt hing an `sicht`. Bei jeder Sichtänderung räumte React
   * ihn ab, und das Aufräumen rief `cancelAnimationFrame` – auf genau das
   * Bild, das gerade angefordert war. Beim Schieben kommt die nächste
   * Änderung aber schneller als das nächste Bild.
   *
   * Gemessen über eine Schiebegeste von 88 Bildern: Die Leinwand malte
   * **dreimal**. Nicht achtundachtzigmal – dreimal. Die Bäume hinken beim
   * Schieben also sichtbar hinter der Karte her und holen erst auf, wenn der
   * Finger stehen bleibt. Das ist kein neuer Fehler; er steckt in der
   * heutigen Fassung genauso und wurde nur nie gemessen.
   *
   * Deshalb läuft die Schleife jetzt **ausserhalb** der Abhängigkeiten. Sie
   * liest Sicht, Raster und Stil aus Refs; wer etwas ändert, meldet ein Bild
   * an. Nichts bricht mehr ein Bild ab, das schon angefordert war.
   */
  const sichtRef = useRef(sicht);
  sichtRef.current = sicht;
  const anfordernRef = useRef<() => void>(() => {});

  useEffect(() => {
    const c = leinwand.current;
    const box = huelle.current;
    const werk = werkRef.current;
    if (!c || !box || !werk) return;

    let angefordert = 0;
    let lebt = true;

    const male = () => {
      angefordert = 0;
      if (!lebt) return;
      const breite = box.clientWidth;
      const hoehe = box.clientHeight;
      if (!breite || !hoehe) return;

      const dichte = Math.min(2, window.devicePixelRatio || 1);
      if (c.width !== Math.round(breite * dichte)) c.width = Math.round(breite * dichte);
      if (c.height !== Math.round(hoehe * dichte)) c.height = Math.round(hoehe * dichte);

      const ctx = c.getContext('2d');
      if (!ctx) return;

      const t0 = performance.now();
      const sichtJetzt = sichtRef.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);

      /*
       * **Die Stufe hängt nicht an der Gerätedichte.**
       *
       * Sie kommt aus Elementbreite und Sichtbreite. Die Dichte bestimmt nur,
       * wie viele Bildpunkte eine Kachel bekommt – sonst sähe ein Telefon mit
       * dreifacher Dichte eine andere Landschaft als ein Rechner mit
       * einfacher.
       */
      const stufe = stufeFuer(breite, sichtJetzt.w, stufeRef.current);
      stufeRef.current = stufe;
      /*
       * **Erst der Grund, dann der Bewuchs.** Die Reihenfolge ist die
       * Landschaft: Bäume stehen auf Bergen, nicht darunter.
       */
      const grund = grundRef.current;
      const grundbericht = grund
        ? maleLage(ctx, grund, sichtJetzt, breite * dichte, stufe)
        : undefined;
      const bericht = maleLage(ctx, werk, sichtJetzt, breite * dichte, stufe);

      /*
       * Noch etwas im Ofen? Dann backen und gleich wiederkommen.
       *
       * **Der Grund zuerst.** Sein Budget ist dasselbe; wer es sich mit dem
       * Bewuchs teilt, bekommt in jedem Bild ein bisschen von beidem, und
       * das Gebirge erscheint zuletzt. Da es *unter* dem Wald liegt, sähe
       * man dann Bäume auf dem leeren Land schweben.
       */
      const offenGrund = grund ? grund.backeBudgetiert() : false;
      const offen = werk.backeBudgetiert();
      if (
        offen || offenGrund || bericht.vorschau > 0 || bericht.veraltet > 0 ||
        (grundbericht && (grundbericht.vorschau > 0 || grundbericht.veraltet > 0))
      ) anfordern();

      messung.kacheln = werk.anzahl();
      messung.bytes = werk.bytes();
      messung.gebacken = werk.gebacken;
      messung.msGebacken = werk.msGebacken;
      messung.verdraengt = werk.verdraengt;
      /* Was gerade zu sehen und veraltet ist – nicht, was irgendwo liegt. */
      messung.veraltet = bericht.veraltet;
      messung.vorschau = bericht.vorschau;
      messung.stufe = bericht.stufe;
      messung.msLetztesBild = performance.now() - t0;
      messung.bilder++;
      messung.wartend = werk.wartend();
      if (grund) {
        messung.grundWartend = grund.wartend();
        messung.grundkacheln = grund.anzahl();
        messung.msGrund = grund.msGebacken;
        messung.grundGebacken = grund.gebacken;
      }
    };

    const anfordern = () => {
      if (!angefordert && lebt) angefordert = requestAnimationFrame(male);
    };
    anfordernRef.current = anfordern;

    anfordern();
    window.addEventListener('resize', anfordern);
    return () => {
      lebt = false;
      window.removeEventListener('resize', anfordern);
      if (angefordert) cancelAnimationFrame(angefordert);
    };
  }, [leinwand, huelle]);

  /* Wer etwas ändert, meldet ein Bild an – und bricht keines ab. */
  useEffect(() => {
    anfordernRef.current();
  }, [sicht, raster, stilbuch, kaemme]);

  useEffect(() => {
    (window as unknown as { __kartenwerk?: Messung }).__kartenwerk = messung;
  }, []);
}
