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
 * **Die zwei Lagen, und warum heute nur eine läuft.**
 *
 * `staffage.ts` kennt `grund` und `bewuchs`, und das Kachelwerk ist je Lage
 * eines. Angeschlossen ist vorerst nur `bewuchs` – das Gelände liegt weiter
 * in SVG.
 *
 * Das ist kein Versäumnis, sondern eine Abwägung: In der SVG-Lage sitzen die
 * **Fangbereiche**. Wer auf eine Waldfläche tippt, trifft einen Pfad im
 * Dokument, und daran hängen Auswahl, Bedeutung und Seitenzuordnung. Das
 * Gelände auf eine Leinwand zu verlegen hieße, die Treffererkennung von Hand
 * nachzubauen – eine eigene Etappe mit eigenem Risiko, und sie gehört nicht
 * in dieselbe wie der Umbau der Zeichenmaschine.
 *
 * Die Naht ist da und sie ist geprüft: Ein zweites Kachelwerk für `grund`
 * anzulegen und seinen Maler zu schreiben ist eine Ergänzung, keine Änderung.
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
import { artbookStilbuch } from '../../lib/kartenwerk/stilbuch';
import { ladeAtlas, type Atlas } from '../../lib/kartenwerk/atlas';
import { staffageAus } from '../../lib/kartenwerk/streuwerk';
import { Staffageraster } from '../../lib/kartenwerk/raster';
import { Kachelwerk, WERKPLAN, stufeFuer, type Kasten } from '../../lib/kartenwerk/kachelwerk';
import { maleLage, type Sichtfeld } from '../../lib/kartenwerk/maler';

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
}

export const messung: Messung = {
  staffage: 0, msStreuen: 0, kacheln: 0, bytes: 0, gebacken: 0, msGebacken: 0,
  verdraengt: 0, veraltet: 0, vorschau: 0, stufe: 0, msLetztesBild: 0, bilder: 0,
};

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
    void ladeAtlas('artbook', import.meta.env.BASE_URL).then((a) => {
      if (lebt && a) setAtlas(a);
    });
    return () => { lebt = false; };
  }, []);

  const stilbuch = useMemo(() => artbookStilbuch(stil, atlas), [stil, atlas]);

  /*
   * Die Staffage, einmal je Flächenzustand.
   *
   * Nicht je Bild – das war der alte Fehler, nur eine Stufe höher. Das
   * Streuen selbst ist billig; es hier zu wiederholen wäre trotzdem Arbeit
   * ohne Wirkung, denn dieselben Flächen geben dieselbe Liste.
   */
  const staffage = useMemo(() => {
    const t0 = performance.now();
    const liste = staffageAus(karte.features, stilbuch);
    messung.msStreuen = performance.now() - t0;
    messung.staffage = liste.length;
    return liste;
  }, [karte.features, stilbuch]);

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

  const werkRef = useRef<Kachelwerk | null>(null);
  const stufeRef = useRef<number | undefined>(undefined);
  const vorigeFeatures = useRef<Kartenfeature[] | null>(null);
  const vorigesBuch = useRef<ReturnType<typeof artbookStilbuch> | null>(null);

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
        for (const s of liste) {
          const e = buch.eintrag(s.art);
          if (e) e.zeichne(ctx, s, massstab);
        }
      },
      { ...WERKPLAN, dichte },
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
      const bericht = maleLage(ctx, werk, sichtJetzt, breite * dichte, stufe);

      /* Noch etwas im Ofen? Dann backen und gleich wiederkommen. */
      const offen = werk.backeBudgetiert();
      if (offen || bericht.vorschau > 0 || bericht.veraltet > 0) anfordern();

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
  }, [sicht, raster, stilbuch]);

  useEffect(() => {
    (window as unknown as { __kartenwerk?: Messung }).__kartenwerk = messung;
  }, []);
}
