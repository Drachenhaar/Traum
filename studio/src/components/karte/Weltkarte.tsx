/**
 * Die Weltkarte.
 *
 * Ein Finger malt grobe Bedeutung, Dragoncore macht daraus eine Fläche. Das
 * ist der ganze Vorgang, und alles Übrige in dieser Datei dient dazu, dass er
 * sich nicht wie Software anfühlt.
 *
 * ---
 *
 * **Zwei Ebenen, aus zwei verschiedenen Gründen.**
 *
 *   SVG    – die Umrisse. Wenige, groß, und man muss sie treffen können.
 *   Canvas – die Bäume. Viele, klein, und niemand tippt einen einzelnen an.
 *
 * Beides liegt deckungsgleich übereinander und teilt dieselbe Sicht. Das
 * kostet die Mühe, die Ansicht zweimal zu rechnen – einmal als `viewBox`,
 * einmal als Matrix –, und spart den Ruck, den zweitausend SVG-Knoten auf
 * einem Telefon machen.
 *
 * ---
 *
 * **Ein Finger malt, zwei Finger bewegen.**
 *
 * Der wichtigste Satz für das Gefühl, und die eine Regel, die keine Ausnahme
 * hat: *Sobald ein zweiter Finger aufsetzt, wird der begonnene Strich
 * verworfen.* Nicht beendet – verworfen. Wer die Karte verschieben will,
 * setzt zwei Finger auf, und dabei berührt einer den Bildschirm einen
 * Sekundenbruchteil früher. Ohne diese Regel entsteht bei jedem Verschieben
 * ein kleiner Fleck, den niemand malen wollte, und die Karte wird zu einem
 * Ort, an dem man vorsichtig sein muss.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { Undo2 } from 'lucide-react';
import {
  BEDEUTUNGEN,
  FELD,
  alsPfad,
  neueMarke,
  neuesFeature,
  type Bedeutung,
  type Kartendokument,
  type Kartenfeature,
  type Punkt,
} from '../../lib/karte/modell';
import { flaecheAus, flussAus } from '../../lib/karte/kontur';
import { SIEDLUNGEN, alsSiedlungspfad, istSiedlung, type Siedlung } from '../../lib/karte/siedlung';
import { buchtZiehen } from '../../lib/karte/bucht';
import { landzungeZiehen } from '../../lib/karte/landzunge';
import { kuestensaum, namenslage } from '../../lib/karte/kartografie';
import { neuerSeed } from '../../lib/karte/zufall';
import { EBENEN, stilImBand } from '../../lib/karte/stil';
import { federzug } from '../../lib/karte/feder';
import { useBand } from '../../lib/raum/band';
import { useKartenleinwand } from './useKartenleinwand';
import { cx } from '../../lib/utils';

/**
 * Was der Finger gerade tut.
 *
 * `waehlen` schiebt und tippt an, eine Bedeutung malt – und `bucht` nimmt weg.
 *
 * ---
 *
 * **Warum das Wegnehmen ein eigenes Wort ist und keine Bedeutung.**
 *
 * Die naheliegende Lösung wäre ein Radiergummi gewesen: ein Werkzeug, das
 * löscht, was es berührt. Ein Radiergummi kennt aber nur „weg" – er weiss
 * nicht, ob gerade eine Küste entsteht oder ein Fehler verschwindet, und was
 * er hinterlässt, ist ein Loch.
 *
 * Eine Bucht ist etwas anderes: Sie ist eine **Form**, die jemand zieht, und
 * sie hinterlässt eine Küste. Die Landzunge ist ihr Spiegelbild: dieselbe Form,
 * dieselben fünf Schritte, nur wächst sie an, statt wegzunehmen. Deshalb läuft sie durch dieselben fünf Schritte
 * wie das Malen und kommt als geschlossener Umriss zurück. Der Verfasser
 * bekommt kein mächtigeres Werkzeug, sondern ein Wort mehr.
 */
export type Werkzeug = Bedeutung | 'waehlen' | 'bucht' | 'landzunge' | 'fluss' | Siedlung;

interface Sicht {
  x: number;
  y: number;
  /** Wie breit der sichtbare Ausschnitt im Kartenmaß ist. Die Karte ist quadratisch. */
  w: number;
}

const GANZ: Sicht = { x: 0, y: 0, w: FELD };
/** Näher heran als ein Achtel geht nicht – darunter malt man Pixel, nicht Welt. */
const ENGSTE = FELD / 8;
const WEITESTE = FELD * 1.3;

/**
 * Die Pinselbreite.
 *
 * An die Sicht gekoppelt und nicht fest: Der Finger ist immer gleich dick, und
 * ein Pinsel, der im Kartenmaß fest wäre, malte herausgezoomt Fäden und
 * herangezoomt Balken. So malt man immer „ungefähr fingerbreit" – ein
 * Maßstab, den der Verfasser kennt, ohne ihn zu lernen.
 */
function pinsel(sicht: Sicht): number {
  return sicht.w * 0.028;
}

/*
 * Hier stand `mitte()` – die Mitte des umschliessenden Kastens, für den Namen
 * einer Fläche. Sie ist weg, weil `namenslage` den **Schwerpunkt** liefert,
 * und der ist für einen Namen der bessere Ort: Bei einer Sichel liegt die
 * Kastenmitte im Leeren, der Schwerpunkt auf dem Land.
 */

export interface WeltkarteProps {
  karte: Kartendokument;
  /** Jede *bedeutungstragende* Änderung. Verschieben und Zoomen gehören nicht dazu. */
  onChange: (karte: Kartendokument) => void;
  werkzeug: Werkzeug;
  gewaehlt?: string;
  onWaehle: (id: string | undefined) => void;
  /** Titel der Einträge, auf die Flächen zeigen. Die Karte hält keine Namen. */
  namen: Map<string, string>;
  /**
   * Das Rückgängig – hier und nicht in der Werkzeugleiste.
   *
   * Es stand dort, solange die Leiste in eine Zeile passte. Mit der Landzunge
   * brach sie in eine dritte um, und das war der Anlass, die Frage einmal
   * richtig zu stellen: „Zurücknehmen" ist **kein Werkzeug**. Die Leiste
   * beantwortet „welches Wort spreche ich gerade"; das Rückgängig beantwortet
   * gar keine Frage, es macht etwas mit dem, was schon dasteht.
   *
   * Deshalb steht es jetzt an der Karte selbst, neben „Ganze Karte" – beides
   * Handlungen an dem, was man sieht, und beide dort, wo sie wirken.
   */
  kannZurueck: boolean;
  onZurueck: () => void;
}

export function Weltkarte({
  karte,
  onChange,
  werkzeug,
  gewaehlt,
  onWaehle,
  namen,
  kannZurueck,
  onZurueck,
}: WeltkarteProps) {
  /* Die Karte traegt den Band, in dem das Buch gerade gebunden ist. */
  const dunkel = useBand();
  const stil = stilImBand(karte.styleId, dunkel);
  const huelle = useRef<HTMLDivElement>(null);
  const leinwand = useRef<HTMLCanvasElement>(null);
  const [sicht, setSicht] = useState<Sicht>(GANZ);
  const [spur, setSpur] = useState<Punkt[] | null>(null);

  /*
   * Die Finger.
   *
   * In einem Ref und nicht im Zustand: Sie ändern sich sechzigmal in der
   * Sekunde, und jede dieser Änderungen ein Neuzeichnen der ganzen Seite
   * auszulösen wäre der sicherste Weg zu einer hakeligen Karte.
   */
  const finger = useRef(new Map<number, { x: number; y: number }>());
  const geste = useRef<{ abstand: number; mitte: Punkt; sicht: Sicht } | null>(null);
  const bewegt = useRef(false);
  /**
   * Ob dieser Tipp schon etwas getan hat.
   *
   * ---
   *
   * **Der Fehler, den es verhindert, war im Bild zu sehen und im Quelltext
   * nicht.**
   *
   * Eine Fläche wird ausgewählt, wenn man auf sie tippt – das steht unten als
   * `onClick` am Füllpfad, und es fragt bisher nur: „war der Finger in
   * Bewegung?". Beim Malen stimmt das: Ein Strich bewegt sich, also wird
   * nichts ausgewählt.
   *
   * Eine Siedlung zu setzen ist aber ein *Tipp*. Der Finger bewegt sich
   * nicht – und nach dem Loslassen schickt der Browser über demselben Punkt
   * noch einen Klick. Der traf die Landfläche darunter, deren `onClick` die
   * eben gesetzte Marke aus der Auswahl warf. Gemessen: Nach dem Setzen
   * eines Dorfs stand „Diese **Fläche**" da, mit der Küste darin.
   *
   * Der Fangkreis der Marke half nicht – ihn gibt es in dem Augenblick noch
   * nicht, denn die Marke entsteht erst beim Loslassen.
   *
   * Hier steht deshalb: Dieser Tipp ist verbraucht. Jeder neue Fingerdruck
   * setzt es zurück.
   */
  const verbraucht = useRef(false);

  /* ------------------------------------------------------ Bildschirm ↔ Karte */

  const zuKarte = useCallback(
    (cx0: number, cy0: number): Punkt => {
      const r = huelle.current?.getBoundingClientRect();
      if (!r || !r.width) return [0, 0];
      return [
        sicht.x + ((cx0 - r.left) / r.width) * sicht.w,
        sicht.y + ((cy0 - r.top) / r.height) * sicht.w,
      ];
    },
    [sicht],
  );

  /*
   * Hier stand der `waelder`-Memo – die Bäume je Fläche, einmal gerechnet.
   *
   * Er ist weg, nicht weil er falsch war, sondern weil er jetzt eine Stufe
   * tiefer sitzt: Das Streuwerk ruft `baeume()` selbst auf und macht daraus
   * Staffage. Zwei Stellen, die dieselben Bäume rechnen, wären zwei
   * Wahrheiten über denselben Wald (Gesetz 5) – und die zweite wäre still
   * falsch geworden, sobald eine von beiden sich ändert.
   */

  /**
   * Der Küstensaum.
   *
   * Ein bis zwei Linien, die die Küste ins Wasser hinein wiederholen. Sie sind
   * die Geste, an der man eine gezeichnete Karte erkennt – und sie erfinden
   * nichts: Es ist derselbe Umriss, zweimal versetzt.
   *
   * **Nur Land bekommt ihn.** Ein Saum markiert die Grenze zwischen festem
   * Grund und Wasser, und auf dieser Karte ist das Papier das Meer. Ein Wald
   * liegt auf Land, nicht am Wasser; ein See ist selbst Wasser. Beide bekämen
   * eine Linie, die nichts bedeutet.
   *
   * **Und alles Land zusammen, nicht jede Insel für sich.** Je Fläche
   * gerechnet bekam jede Insel ihren eigenen Ring, und wo zwei einander nahe
   * kamen, liefen zwei Ringe durcheinander hindurch – im Bild ein Fehler im
   * Papier. Zwischen zwei Küsten liegt eine Meerenge, und die hat einen Saum.
   *
   * Gerechnet wie die Bäume: einmal je Flächenzustand, nicht je Bild. Der
   * teure Teil ist das Abstandsfeld, und das ändert sich nur, wenn jemand die
   * Küste anfasst – beim Verschieben und Zoomen also nie.
   */
  const saeume = useMemo(
    () =>
      /*
       * Zwei Abstände, deutlich auseinander. Der erste Anlauf nahm drei mit
       * neun und elf Punkten – sie drängelten sich an der Küste und
       * verschwammen zu einem Schleier. Zwei mit Abstand lesen sich als
       * Absicht.
       */
      kuestensaum(
        karte.features.filter((f) => f.art === 'land').map((f) => f.punkte),
        [16, 42],
      ),
    [karte.features],
  );

  /* --------------------------------------------------------- Das Zeichnen -- */

  /*
   * Der Bewuchs geht jetzt durchs Kartenwerk.
   *
   * **Was sich geändert hat, ist eine Abhängigkeit.** Hier stand ein
   * `useEffect`, der an `sicht` hing – und deshalb beim Schieben sechzigmal
   * in der Sekunde jeden Baum neu zeichnete. Gemessen am Entwurf kostete
   * derselbe Inhalt so 26,3 ms je Bild statt 1,05.
   *
   * Das war der Grund, warum die Bäume billig sein *mussten*. Nicht eine
   * Grenze von Canvas, sondern eine Zeile.
   *
   * Jetzt wird in Kacheln im Kartenraum gebacken und beim Schieben nur noch
   * kopiert. Die Zeit je Bild hängt damit nicht mehr an der Zahl der Bäume –
   * und das ist die Tür, durch die später Berge, Fels und gemalte Grafiken
   * passen.
   *
   * **Das Aussehen ist Absicht unverändert.** Gezeichnet wird weiter mit
   * `zeichneBaum`, Baum für Baum, mit denselben Zahlen; das Stilbuch reicht
   * sie nur durch. Diese Etappe überführt die Maschine, nicht die Gestaltung.
   */
  useKartenleinwand({ leinwand, huelle, karte, stil, sicht });

  /* ------------------------------------------------------------- Finger ---- */

  const abstandUndMitte = (): { abstand: number; mitte: Punkt } => {
    const [a, b] = [...finger.current.values()];
    return {
      abstand: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      mitte: [(a.x + b.x) / 2, (a.y + b.y) / 2],
    };
  };

  const runter = (e: React.PointerEvent) => {
    finger.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    bewegt.current = false;
    verbraucht.current = false;

    if (finger.current.size >= 2) {
      /*
       * Der zweite Finger verwirft den Strich.
       *
       * Siehe oben: Wer verschieben will, setzt nie beide Finger im selben
       * Augenblick auf. Ohne diese Zeile hinterlässt jede Verschiebung einen
       * Fleck.
       */
      setSpur(null);
      const { abstand, mitte: m } = abstandUndMitte();
      geste.current = { abstand, mitte: m, sicht };
      return;
    }

    geste.current = null;
    if (werkzeug !== 'waehlen') setSpur([zuKarte(e.clientX, e.clientY)]);
  };

  const bewegen = (e: React.PointerEvent) => {
    if (!finger.current.has(e.pointerId)) return;
    const vorher = finger.current.get(e.pointerId)!;
    finger.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = huelle.current?.getBoundingClientRect();
    if (!r || !r.width) return;
    if (Math.hypot(e.clientX - vorher.x, e.clientY - vorher.y) > 1) bewegt.current = true;

    if (finger.current.size >= 2 && geste.current) {
      /*
       * Verschieben und Zoomen in einem.
       *
       * Gerechnet wird nicht schrittweise, sondern immer vom Beginn der Geste
       * aus. Schrittweise summierte sich jede Rundung auf, und die Karte
       * driftete unter den Fingern weg – ein Fehler, den man nicht sieht,
       * sondern spürt.
       */
      const { abstand, mitte: m } = abstandUndMitte();
      const start = geste.current;
      const w = Math.max(ENGSTE, Math.min(WEITESTE, (start.sicht.w * start.abstand) / abstand));
      const punktX = start.sicht.x + ((start.mitte[0] - r.left) / r.width) * start.sicht.w;
      const punktY = start.sicht.y + ((start.mitte[1] - r.top) / r.height) * start.sicht.w;
      setSicht({
        x: punktX - ((m[0] - r.left) / r.width) * w,
        y: punktY - ((m[1] - r.top) / r.height) * w,
        w,
      });
      return;
    }

    if (werkzeug === 'waehlen') {
      const dx = ((e.clientX - vorher.x) / r.width) * sicht.w;
      const dy = ((e.clientY - vorher.y) / r.height) * sicht.w;
      setSicht((s) => ({ ...s, x: s.x - dx, y: s.y - dy }));
      return;
    }

    setSpur((s) => (s ? [...s, zuKarte(e.clientX, e.clientY)] : s));
  };

  const hoch = (e: React.PointerEvent) => {
    finger.current.delete(e.pointerId);
    if (finger.current.size >= 1) return;
    geste.current = null;
    if (!spur) return;
    setSpur(null);
    if (werkzeug === 'waehlen') return;
    if (werkzeug === 'bucht') return formen(buchtZiehen, spur);
    if (werkzeug === 'landzunge') return formen(landzungeZiehen, spur);

    /*
     * Eine Siedlung ist ein Tippen, kein Strich.
     *
     * Deshalb steht sie vor den Flächen: Was hier gesetzt wird, braucht
     * keinen Umriss und keine Form – nur einen Ort. Und sie steht genau da,
     * wo der Finger war; nichts verteilt sie (Gesetz 4).
     *
     * **Der Mittelwert des Zuges und nicht sein Anfang.** Wer tippt, rutscht
     * ein paar Punkte weit. Der Anfang wäre die Stelle, an der der Finger
     * aufsetzte, der Mittelwert die, die er meinte.
     *
     * Und anders als eine Bucht wird eine Siedlung auch aus einem einzigen
     * Punkt etwas. Ein Tippen ist für eine Fläche zu wenig – für einen Ort
     * ist es genau richtig.
     */
    if (istSiedlung(werkzeug)) {
      const mitte: Punkt = [
        spur.reduce((a, p) => a + p[0], 0) / spur.length,
        spur.reduce((a, p) => a + p[1], 0) / spur.length,
      ];
      const marke = neueMarke(werkzeug, mitte);
      onChange({ ...karte, marken: [...(karte.marken ?? []), marke] });
      /*
       * Dieselbe Wahl wie beim Malen einer Fläche: Was eben entstand, liegt
       * danach unter dem Bedienfeld. Wer ein Dorf setzt, will ihm als
       * Nächstes einen Namen geben – und der Name steht im Buch.
       */
      onWaehle(marke.id);
      /* Und der Klick, der gleich noch kommt, darf sie nicht wieder abwählen. */
      verbraucht.current = true;
      return;
    }

    /*
     * Der Fluss ist Wasser, nur anders geformt.
     *
     * Deshalb steht er hier und nicht bei den Bedeutungen: Er entsteht aus
     * einer eigenen Form – schmal an der Quelle, breit an der Mündung –, und
     * kommt als ganz gewöhnliche Wasserfläche zurück. Welches Ende die
     * Mündung ist, entscheidet die Richtung des Striches.
     */
    if (werkzeug === 'fluss') {
      const saat = neuerSeed();
      const lauf = flussAus(spur, pinsel(sicht), saat);
      if (!lauf) return;
      const w: Kartenfeature = { ...neuesFeature('wasser', lauf), seed: saat };
      onChange({ ...karte, features: [...karte.features, w] });
      return;
    }

    /*
     * Der Startwert wird *vor* dem Verfeinern gezogen und dann behalten.
     *
     * Sonst hätte die Fläche eine Küste, die mit einer anderen Zahl gerechnet
     * wurde als der, die gespeichert wird – und beim nächsten Öffnen sähe sie
     * anders aus als in dem Augenblick, in dem sie entstand.
     */
    const seed = neuerSeed();
    const punkte = flaecheAus(spur, pinsel(sicht), seed);
    /* Ein Tippen ist kein Fleck. Es entsteht nichts, und das ist richtig. */
    if (!punkte) return;
    const f: Kartenfeature = { ...neuesFeature(werkzeug, punkte), seed };
    onChange({ ...karte, features: [...karte.features, f] });
    onWaehle(f.id);
  };

  /**
   * Eine Form ziehen – Bucht oder Landzunge.
   *
   * Beide beantworten dieselben drei Fragen und beantworten sie verschieden;
   * die Antworten stehen in `lib/karte/bucht.ts` und `lib/karte/landzunge.ts`.
   * Hier bleibt nur, was dieses Bauteil angeht: die Pinselbreite aus der
   * Sicht, und der eine Satz, der nichts durchreicht, wenn der Strich
   * danebenging.
   *
   * Ohne Wirkung kein Schritt: Jeder Aufruf von `onChange` legt oben einen
   * Eintrag im Rückgängig ab. Sonst müsste man dreimal „Zurücknehmen"
   * drücken, um einen Strich zurückzunehmen, und niemand fände heraus, warum.
   *
   * Und nichts wird ausgewählt. Beim Malen zeigt die Auswahl auf das eben
   * Entstandene – hier wurde etwas *verändert*, und ein Bedienfeld, das
   * danach auf irgendeine Fläche zeigt, sagt nur aus, welche das Verfahren
   * zufällig zuerst gefunden hat.
   */
  const formen = (
    wort: (f: Kartenfeature[], spur: Punkt[], radius: number) => Kartenfeature[] | undefined,
    gezogen: Punkt[],
  ) => {
    const features = wort(karte.features, gezogen, pinsel(sicht));
    if (features) onChange({ ...karte, features });
  };

  const zurueckSetzen = () => setSicht(GANZ);

  /* ------------------------------------------------------------ Zeichnen --- */

  const geordnet = useMemo(
    () =>
      [...karte.features].sort((a, b) => EBENEN.indexOf(a.art) - EBENEN.indexOf(b.art)),
    [karte.features],
  );

  const farben = (art: Bedeutung) =>
    art === 'wasser' ? stil.wasser : art === 'wald' ? stil.wald : stil.land;

  /**
   * Die Höhe eines Siedlungszeichens – **einmal**, für drei Stellen.
   *
   * Fangbereich, Auswahlring und Zeichen müssen übereinanderliegen; stünde
   * die Zahl dreimal da, wäre der Ring beim nächsten Nachjustieren neben dem
   * Dorf und der Fangbereich daneben (Gesetz 5).
   *
   * `0.03` von der Sichtbreite: knapp drei Hundertstel der Karte. Gemessen
   * an der ganzen Karte sind das 30 Einheiten – ein Zeichen, das man erkennt,
   * ohne dass es die Küste verdeckt, an der es liegt.
   */
  const zeichenGr = sicht.w * 0.03;

  return (
    <div className="relative w-full">
      <div
        ref={huelle}
        className="relative aspect-square w-full overflow-hidden rounded-2xl border border-line"
        /*
         * Diese Flaeche gehoert dem Finger allein.
         *
         * Die Raumschicht fragt vor jeder Geste, ob unter dem Finger etwas
         * liegt, das ihn selbst braucht – `data-raum="aus"` ist die Antwort.
         * Ohne sie wuerde ein Strich, der am rechten Kartenrand beginnt, den
         * Wesensraum andeuten, waehrend jemand eine Kueste malt. Zwei Gesten,
         * die sich um denselben Finger streiten, ergeben keine Bedienung.
         */
        data-raum="aus"
        style={{ background: stil.papier, touchAction: 'none' }}
        onPointerDown={runter}
        onPointerMove={bewegen}
        onPointerUp={hoch}
        onPointerCancel={hoch}
        onPointerLeave={hoch}
      >
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`${sicht.x} ${sicht.y} ${sicht.w} ${sicht.w}`}
          aria-label="Weltkarte"
        >
          {/* Der Rand des Feldes – damit man weiß, wo die Welt aufhört. */}
          <rect
            x={0}
            y={0}
            width={FELD}
            height={FELD}
            fill="none"
            stroke={stil.koernung}
            strokeWidth={stil.strich}
          />
          {/*
            Der Saum liegt **unter** allen Flächen.

            Er gehört ins Wasser, und Wasser ist hier das Papier. Läge er über
            den Flächen, zöge er eine Linie quer durch jede Insel, die einer
            anderen nahe kommt – und über den Wald, der auf ihr steht.
          */}
          <g aria-hidden>
            {saeume.map((linien, i) =>
              linien.map((linie, k) => (
                <path
                  key={`s${i}_${k}`}
                  d={alsPfad(linie)}
                  fill="none"
                  stroke={stil.wasser.linie}
                  /*
                   * **Eine Haarlinie, kein mitwachsender Strich.**
                   *
                   * `stil.strich` ist im Kartenmass angegeben und wächst mit
                   * dem Zoom – für eine Küstenlinie richtig, denn sie gehört
                   * zur Fläche. Für den Saum ist es falsch: Gemessen ergaben
                   * 1,76 Kartenpunkte bei voller Ansicht **0,57 CSS-Pixel**.
                   * Der Browser glättet eine Linie unter einem Pixel auf halbe
                   * Deckung herunter, und genau deshalb war der Saum blass,
                   * obwohl die Farbe stimmte.
                   *
                   * `non-scaling-stroke` gibt ihm eine feste Breite in
                   * Bildpunkten. Das ist zugleich das ehrlichere Modell: Auf
                   * einer gezeichneten Karte hat die Feder eine Breite, und
                   * die ändert sich nicht, wenn man näher herangeht.
                   */
                  vectorEffect="non-scaling-stroke"
                  strokeWidth={i === 0 ? 1.15 : 0.9}
                  strokeOpacity={i === 0 ? 0.75 : 0.45}
                  strokeLinejoin="round"
                />
              )),
            )}
          </g>

          {geordnet.map((f) => {
            const c = farben(f.art);
            const d = alsPfad(f.punkte);
            return (
              <g key={f.id}>
                {f.art === 'wasser' && (
                  /* Der Saum: ein heller, breiter Strich unter der Kante. Zwei
                     Zeilen, und das Wasser liegt plötzlich *in* der Karte. */
                  <path d={d} fill="none" stroke={stil.wasser.saum} strokeWidth={stil.strich * 5} />
                )}
                {/*
                  * Die Fläche trägt keine Linie mehr – die kommt gleich als
                  * eigener Zug. Der Fangbereich bleibt hier: Wer auf das Land
                  * tippt, meint das Land, nicht seine Kante.
                  */}
                {/*
                  * **Ein Wald hat keine Kante.**
                  *
                  * Jede andere Fläche bekommt hier ihre Füllung und gleich
                  * darunter ihren Federzug. Der Wald nicht mehr: Seit das
                  * Waldwerk seinen Boden aus den Bäumen baut – weiche
                  * Scheiben unter den Stämmen, zusammen verwischt – liefe
                  * ein gezogener Umriss quer durch das, was auslaufen soll.
                  * Zwei Ränder, einer hart und einer weich, und der harte
                  * gewinnt.
                  *
                  * Der Pfad bleibt trotzdem stehen: An ihm hängt der
                  * **Fangbereich**. `fill="transparent"` nimmt Finger an,
                  * `fill="none"` nicht – der Unterschied ist genau diese
                  * eine Zeile, und ohne sie liesse sich ein Wald nicht mehr
                  * antippen.
                  */}
                <path
                  d={d}
                  fill={f.art === 'wald' ? 'transparent' : c.flaeche}
                  onClick={() => {
                    if (!bewegt.current && !verbraucht.current) onWaehle(f.id);
                  }}
                />
                {/*
                  * Der Federzug statt `strokeWidth`.
                  *
                  * Eine gestrichene Linie ist überall gleich dick; eine Feder
                  * wird in der Kurve dicker und im Schwung dünner. Das ist der
                  * ganze Unterschied zwischen gezeichnet und gerechnet – und
                  * es ist der einzige, den diese Änderung macht: keine
                  * Windrose, kein Pergament, siehe `stil.ts`.
                  *
                  * `f.seed` sorgt dafür, dass dieselbe Küste jedes Mal
                  * dieselbe Feder bekommt. Ohne ihn flimmerte sie beim
                  * Verschieben.
                  *
                  * `pointerEvents="none"`, weil der Fangbereich oben schon
                  * sitzt – sonst läge er zweimal übereinander und das Tippen
                  * träfe mal die Fläche, mal den Strich.
                  */}
                {f.art !== 'wald' && (
                  <path
                    d={federzug(f.punkte, stil.strich, f.seed ?? 1)}
                    fill={c.linie}
                    pointerEvents="none"
                  />
                )}
              </g>
            );
          })}

          {/*
            * Die Fangflächen der Siedlungen – hier, das Zeichen selbst oben.
            *
            * **Warum getrennt.** Das Zeichen gehört über die Bäume, und die
            * Bäume liegen auf der Leinwand *über* diesem Bild; es steht
            * deshalb in der dritten Lage, zusammen mit den Namen. Die dritte
            * Lage nimmt aber keine Finger an (`pointer-events-none`) – also
            * liegt der Fangbereich hier, genau wie bei den Flächen, deren
            * Auswahlmarkierung auch oben und deren Fangbereich auch hier
            * liegt.
            *
            * **Und warum ein Kreis.** Ein Strich von 1,4 Bildpunkten trifft
            * kein Finger. Der Kreis sitzt um die Mitte des Zeichens – also
            * ein halbes Zeichen über dem Fusspunkt, denn der Nullpunkt eines
            * Siedlungszeichens liegt auf der Grundlinie (siehe
            * `siedlung.ts`).
            *
            * Er liegt **nach** den Flächen, damit er sie überdeckt: Wer ein
            * Dorf antippt, meint das Dorf und nicht das Land darunter. Das
            * kleinere, bestimmtere Ziel gewinnt.
            */}
          <g aria-hidden>
            {(karte.marken ?? []).map((m) => (
              <circle
                key={`fang_${m.id}`}
                cx={m.bei[0]}
                cy={m.bei[1] - zeichenGr * 0.5}
                r={zeichenGr * 0.8}
                fill="transparent"
                onClick={() => {
                  if (!bewegt.current) onWaehle(m.id);
                }}
              />
            ))}
          </g>

          {/*
            Was gerade unter dem Finger entsteht.

            Die Bucht in Wasserton und nicht in Entwurfsgold – sie ist der
            einzige Strich, der etwas *wegnimmt*, und der Unterschied muss
            schon während des Ziehens sichtbar sein. Wer erst beim Loslassen
            merkt, dass er im falschen Werkzeug war, hat seine Küste verloren
            und muss sie über „Zurücknehmen" suchen.

            **Und die Landzunge bleibt beim Entwurfsgold.** Der Gedanke lag
            nahe, ihr die Landfarbe zu geben – dieselbe Spiegelung wie sonst
            überall. Er ist falsch: Land ist auf dieser Karte fast das Papier
            selbst („Land ist kein Ding, sondern das, was übrig bleibt"), und
            eine Vorschau in Papierfarbe auf Papier sieht man nicht. Die Regel
            ist einfacher als die Spiegelung: **Gold heisst, hier entsteht
            etwas; Wasser heisst, hier weicht etwas.** Danach steht die
            Landzunge bei Land, Wasser und Wald – und die Bucht allein.

            **Aber die Wasserlinie, nicht die Wasserfläche.** Der erste Anlauf
            nahm `wasser.flaeche` – und das ist ein Ton, der auf einer halben
            Seite ruhig sein soll. Über Land gerechnet blieben davon 13, 1, 12
            Farbstufen Unterschied übrig; die Entwurfsfarbe bringt 32, 44, 67.
            Der Strich war da und man sah ihn kaum. Bedeutung gegen Lesbarkeit
            zu tauschen ist ein schlechter Tausch, wenn beides zu haben ist:
            `wasser.linie` ist derselbe kühle Ton, nur kräftig genug.
          */}
          {spur && spur.length > 1 && (
            <polyline
              points={spur.map(([x, y]) => `${x},${y}`).join(' ')}
              fill="none"
              stroke={werkzeug === 'bucht' ? stil.wasser.linie : stil.entwurf}
              strokeOpacity={werkzeug === 'bucht' ? 0.75 : 0.45}
              strokeWidth={pinsel(sicht) * 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>

        <canvas
          ref={leinwand}
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden
        />

        {/*
          Die dritte Lage: Namen und Auswahl – über den Bäumen.

          Sie standen zuerst in der unteren Ebene, und im ersten gerenderten
          Bild verschwand „Der Mooswald" halb hinter seinem eigenen Wald. Ein
          Name, den die Karte verdeckt, ist kein Name. Die Reihenfolge ist
          damit: Flächen, Bäume, Beschriftung – dieselbe, in der ein Zeichner
          es täte.
        */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`${sicht.x} ${sicht.y} ${sicht.w} ${sicht.w}`}
          aria-hidden
        >
          {geordnet.map((f) => {
            if (gewaehlt !== f.id) return null;
            return (
              <path
                key={`w_${f.id}`}
                d={alsPfad(f.punkte)}
                fill="none"
                stroke={stil.wahl}
                strokeWidth={stil.strich * 2}
                strokeDasharray={`${sicht.w * 0.014} ${sicht.w * 0.01}`}
              />
            );
          })}

          {/*
            * Die Siedlungszeichen – über den Bäumen, neben den Namen.
            *
            * **Feste Breite in Bildpunkten.** Dieselbe Begründung wie beim
            * Küstensaum weiter oben: Eine Küste gehört zur Fläche und wächst
            * mit ihr; ein Siedlungszeichen ist ein *Zeichen* und hat die
            * Breite, die eine Feder ihm gibt. Beim Heranzoomen würde ein
            * mitwachsendes Dorf zum Gebäude, und die Karte verlöre ihren
            * Massstab.
            *
            * Die **Grösse** des Zeichens wächst dagegen mit – `zeichenGr`
            * hängt an `sicht.w`, also bleibt ein Dorf auf seinem Fleck
            * Landes gleich gross, egal wie weit man heranzoomt. Das ist der
            * Unterschied zwischen Strichbreite und Mass: Die Feder bleibt,
            * die Welt wächst.
            */}
          {(karte.marken ?? []).map((m) => (
            <g key={`m_${m.id}`}>
              {gewaehlt === m.id && (
                /* Dieselbe gestrichelte Wahl wie bei einer Fläche, nur rund. */
                <circle
                  cx={m.bei[0]}
                  cy={m.bei[1] - zeichenGr * 0.5}
                  r={zeichenGr * 0.95}
                  fill="none"
                  stroke={stil.wahl}
                  strokeWidth={stil.strich * 2}
                  strokeDasharray={`${sicht.w * 0.014} ${sicht.w * 0.01}`}
                />
              )}
              {/*
                * Derselbe Zug zweimal: erst hell und breit, dann dunkel.
                *
                * `paint-order` hilft hier nicht – es ordnet Füllung und
                * Strich *eines* Pfades, und dieser Pfad hat keine Füllung.
                * Ein Saum braucht deshalb einen zweiten Zug darunter,
                * genauso wie die Namen einen bekommen. Ohne ihn verschwindet
                * ein Dorf, das im Wald steht, zwischen den Baumkronen – und
                * genau dort stehen Dörfer.
                */}
              <path
                d={alsSiedlungspfad(m.art, m.bei, zeichenGr)}
                fill="none"
                stroke={stil.papier}
                strokeWidth={4.2}
                strokeOpacity={0.85}
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <path
                d={alsSiedlungspfad(m.art, m.bei, zeichenGr)}
                fill="none"
                /*
                 * **Die Markenfarbe, nicht die Küstenlinie.**
                 *
                 * Der erste Anlauf nahm `stil.land.linie` – die Farbe, in der
                 * eine Küste gezeichnet wird. Im gerenderten Bild war davon
                 * fast nichts zu sehen, und gemessen ist klar warum: auf Land
                 * **1,29 : 1**, auf Wald 1,23 : 1. Das ist keine Zeichnung,
                 * das ist ein Gerücht.
                 *
                 * Eine Küstenlinie liegt zwischen zwei Flächen und muss leise
                 * sein; ein Siedlungszeichen liegt *auf* einer Fläche und muss
                 * gelesen werden. `stil.marke` bringt 3,92 : 1 hell und
                 * 7,08 : 1 dunkel – und es ist dieselbe Tinte, in der der
                 * Name daneben steht. Das ist auch inhaltlich die Wahrheit:
                 * Zeichen und Name sind **eine** Marke.
                 */
                stroke={stil.marke}
                strokeWidth={1.4}
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {m.entryId && namen.get(m.entryId) && (
                <text
                  x={m.bei[0]}
                  /*
                   * Unterhalb des Auswahlrings, nicht hinein.
                   *
                   * Der Ring endet bei 0,45 Zeichenhöhen unter dem Fusspunkt;
                   * die Oberkante dieser Schrift liegt rund 0,49 Höhen über
                   * ihrer Grundlinie. Bei 0,52 schnitt der Ring durch den
                   * Namen – im Bild gesehen, nicht gerechnet. Eine ganze
                   * Zeichenhöhe lässt beide nebeneinander stehen.
                   */
                  y={m.bei[1] + zeichenGr}
                  textAnchor="middle"
                  fill={stil.marke}
                  fontSize={sicht.w * 0.021}
                  stroke={stil.papier}
                  strokeWidth={sicht.w * 0.005}
                  paintOrder="stroke"
                >
                  {namen.get(m.entryId)}
                </text>
              )}
            </g>
          ))}
          {geordnet.map((f) => {
            const name = f.entryId ? namen.get(f.entryId) : undefined;
            if (!name) return null;
            /*
             * Der Name folgt der Fläche, wenn sie eine Richtung hat.
             *
             * Vorher stand er waagerecht in der Mitte des Kastens – auf einer
             * langen Landzunge las sich das wie ein Etikett, das jemand darauf
             * gelegt hat. Auf einer Karte folgt ein Gebietsname der Gestalt
             * des Gebiets und ist dabei gesperrt, weil er dessen Länge zeigen
             * soll.
             *
             * Bei einer rundlichen Fläche bleibt er waagerecht – dort gibt es
             * keine lange Achse, und die gemessene Richtung wäre das Rauschen
             * der Küste. Siehe `namenslage`.
             */
            const lage = namenslage(f.punkte);
            return (
              <text
                key={`n_${f.id}`}
                x={lage.mx}
                y={lage.my}
                textAnchor="middle"
                fill={stil.marke}
                fontSize={sicht.w * 0.026}
                letterSpacing={lage.sperrung ? sicht.w * 0.026 * lage.sperrung : undefined}
                transform={lage.grad ? `rotate(${lage.grad.toFixed(1)} ${lage.mx.toFixed(1)} ${lage.my.toFixed(1)})` : undefined}
                /* Ein heller Saum, damit der Name auch über dichtem Laub steht. */
                stroke={stil.papier}
                strokeWidth={sicht.w * 0.006}
                paintOrder="stroke"
              >
                {name}
              </text>
            );
          })}
        </svg>

        {/*
          * Leer heisst leer – auch ohne Flächen.
          *
          * Hier stand `karte.features.length === 0`. Mit den Siedlungen wäre
          * das still falsch geworden: Eine Karte mit drei Dörfern und ohne
          * Küste hätte weiter „Mal einen Fleck" unter den Dörfern stehen –
          * ein Hinweis, der etwas über das Bild behauptet, was man im Bild
          * widerlegt sieht.
          */}
        {karte.features.length === 0 && (karte.marken ?? []).length === 0 && !spur && (
          <p className="pointer-events-none absolute inset-x-6 bottom-6 text-center text-sm text-ink-muted">
            {/*
              Auf der leeren Karte hat die Bucht nichts, worin sie liegen
              könnte. Das gehört gesagt: Ein Werkzeug, das auf einen Strich
              schweigt, sieht kaputt aus.
            */}
            {werkzeug === 'bucht'
              ? 'Eine Bucht braucht eine Küste. Male zuerst Land.'
              : 'Mal einen Fleck. Zwei Finger verschieben.'}
          </p>
        )}
      </div>

      {/*
        Die zwei Handlungen an der Karte, oben rechts und beide nur dann da,
        wenn sie etwas zu tun haben. Ein Knopf, der nichts kann, ist eine
        Behauptung über das Bild darunter.
      */}
      <div className="pointer-events-none absolute right-3 top-3 flex gap-2">
        {kannZurueck && (
          <button
            type="button"
            onClick={onZurueck}
            /*
             * **Hier nur das Zeichen, kein Wort – und das ist die Ausnahme.**
             *
             * Dieses Buch schreibt Wörter aus; eine Falte, die verschweigt,
             * was sie verbirgt, ist eine Wundertüte. Hier liegt der Fall
             * anders: Der Knopf sitzt **auf** der Karte. Mit Beschriftung ist
             * er 147 Punkte breit und deckt bei 322 Punkten Kartenbreite fast
             * die halbe obere Kante – und er erscheint genau dann, wenn dort
             * etwas steht, das man gerade gezeichnet hat.
             *
             * Der Rückpfeil ist das eine Zeichen, das jeder kennt, und er
             * steht neben dem, was er zurücknimmt. Der Name bleibt trotzdem
             * da, für alles, was nicht sieht: `aria-label`.
             */
            aria-label="Zurücknehmen"
            title="Zurücknehmen"
            className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-line bg-cream-50 text-ink-muted shadow-card no-tap-highlight"
          >
            <Undo2 size={17} aria-hidden />
          </button>
        )}
        {sicht.w !== FELD && (
          <button
            type="button"
            onClick={zurueckSetzen}
            className="pointer-events-auto touch-target rounded-full border border-line bg-cream-50 px-3 text-sm text-ink-muted shadow-card"
          >
            Ganze Karte
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Die Leiste darunter.
 *
 * Jede Erweiterung dieser Leiste ist der Anfang eines Kartenprogramms, und
 * Dragoncore baut kein Kartenprogramm. Was dazukommt, muss deshalb eine
 * *Bedeutung* dazubringen und nicht eine Einstellung.
 *
 * ---
 *
 * **Drei Reihen, und die Trennung ist die Reihe selbst.**
 *
 *   oben   ansehen und malen   – Ansehen, Land, Wasser, Wald
 *   mitte  umformen            – Bucht, Landzunge, Fluss
 *   unten  setzen              – Hütte, Dorf, Burg
 *
 * Die dritte Reihe kam mit den Siedlungen, und sie ist eine eigene, weil sie
 * eine eigene Geste hat: Die obere malt eine Fläche, die mittlere formt eine
 * vorhandene um, die untere **setzt einen Punkt**. Wer „Dorf" für ein
 * Malwerkzeug hält und eine Küste zieht, bekommt ein Dorf in der Mitte seines
 * Striches – einmal, und danach weiss er es.
 *
 * Ein Knopf, der neben seinen Nachbarn steht und etwas grundsätzlich anderes
 * tut, wird genau einmal aus Versehen gedrückt – auf einem Telefon liegen sie
 * acht Punkte auseinander. Und die Bucht ist genau so ein Knopf: Sie sieht aus
 * wie „Wald", verhält sich aber wie „Zurücknehmen".
 *
 * Der erste Versuch setzte einen senkrechten Strich dazwischen und liess die
 * Leiste weiter umbrechen, wie sie wollte. Auf 390 Punkten Breite brach sie
 * mitten in der ersten Gruppe um: „Ansehen Land Wasser" / „Wald │ Bucht
 * Zurücknehmen". Der Strich stand da und trennte nichts – „Wald" war von
 * seinen eigenen Nachbarn abgeschnitten, und die Trennung, die er anzeigte,
 * lief quer zur Trennung, die man sah. Gesehen hat das erst der Blick auf das
 * gerenderte Bild; im Quelltext stand der Strich an der richtigen Stelle.
 *
 * Jetzt sind es zwei erklärte Reihen. Der Umbruch ist keine Folge der
 * Bildschirmbreite mehr, sondern die Aussage selbst.
 *
 * **Und deshalb `px-3.5` statt `px-4`.** Gemessen: Die vier Knöpfe der oberen
 * Reihe sind bei `px-4` zusammen 324 Punkte breit, der Platz beträgt 322. Zwei
 * Punkte, und die Reihe bräche wieder mitten hinein – die Trennung wäre so
 * unlesbar wie vorher. Zwei Punkte weniger Polsterung je Seite lösen das mit
 * vierzehn Punkten Luft.
 */
export function Werkzeugleiste({
  werkzeug,
  onWerkzeug,
}: {
  werkzeug: Werkzeug;
  onWerkzeug: (w: Werkzeug) => void;
}) {
  const knopf = (id: Werkzeug, name: string) => (
    <button
      key={id}
      type="button"
      onClick={() => onWerkzeug(id)}
      aria-pressed={werkzeug === id}
      className={cx(
        'touch-target rounded-full border px-3.5 text-sm',
        werkzeug === id
          ? 'border-brass-500 bg-brass-500 text-paper-50'
          : 'border-line bg-cream-50 text-ink-muted',
      )}
    >
      {name}
    </button>
  );

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {knopf('waehlen', 'Ansehen')}
        {BEDEUTUNGEN.map((b) => knopf(b.id, b.name))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {knopf('bucht', 'Bucht')}
        {knopf('landzunge', 'Landzunge')}
        {knopf('fluss', 'Fluss')}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {SIEDLUNGEN.map((o) => knopf(o.id, o.name))}
      </div>
    </div>
  );
}
