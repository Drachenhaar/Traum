/**
 * Blättern, das dem Finger folgt.
 *
 * Bis hierher war ein Wisch ein Schalter: siebzig Punkte waagerecht, und die
 * Seite war weg. Das ist keine Buchbewegung, das ist ein Knopf mit Umweg. Hier
 * hängt die Seite am Finger, und erst beim Loslassen entscheidet sich, ob sie
 * zurückfällt oder sich umlegt.
 *
 * ---
 *
 * **Wem gehört der Finger?** Dieselbe Frage wie in `Raumschicht.tsx`, und die
 * Reihenfolge der Antworten ist genauso wichtig:
 *
 *   1. Läuft schon eine Raumgeste oder stehen wir in der Tiefe? → nichts tun.
 *   2. Beginnt der Zug in einem Randstreifen? → das ist Living Depth.
 *   3. Liegt unter dem Finger etwas Eigenes (Eingabe, Karte, Regler)? → dorthin.
 *   4. Ist die Bewegung überhaupt waagerecht? → sonst wird gescrollt.
 *
 * Punkt 2 ist der heikelste und der Grund, warum diese Datei `randRichtung`
 * aus der Raumschicht benutzt statt eigene Zahlen zu führen: Es gibt genau
 * *eine* Wahrheit darüber, wo die Randstreifen liegen. Zwei Bauteile mit
 * eigenen Vorstellungen davon wären ein Fehler, der erst am Gerät auffällt –
 * und dann als „manchmal blättert es, manchmal nicht".
 *
 * ---
 *
 * **Warum nichts hiervon durch React läuft.** Wie beim Richtungsbogen: Der
 * laufende Zustand liegt in einem Ref, und was sichtbar wird, sind vier Zahlen
 * direkt im DOM. React erfährt von einem Blattwechsel zweimal – wenn er
 * beginnt und wenn er endet.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { konfig } from '../../lib/raum/konfig';
import { randRichtung } from '../../lib/raum/geste';
import { gesteLaeuft } from '../../lib/raum/useRaum';
import { haptik } from '../../lib/raum/haptik';
import {
  blattEntscheidung,
  blattrichtung,
  blattschatten,
  blattschub,
  blattweg,
  blattwinkel,
  blattwinkelZurueck,
  kruemmung,
  type Blattrichtung,
} from '../../lib/buch/koerper';

interface Lauf {
  id: number;
  x0: number;
  y0: number;
  richtung: Blattrichtung | null;
  weg: number;
  letzteX: number;
  letzteZeit: number;
  tempo: number;
  verworfen: boolean;
}

/** Gehört der Finger einem Bedienelement oder einer eigenen Arbeitsfläche? */
function lokalBesetzt(ziel: EventTarget | null): boolean {
  const el = ziel as HTMLElement | null;
  if (!el?.closest) return false;
  return !!el.closest(
    'input, textarea, select, [contenteditable="true"], canvas, [data-raum="aus"], [role="slider"], [data-blaettern="aus"]',
  );
}

export interface Blaettern {
  /** Welche Richtung gerade läuft – `null`, wenn das Buch ruhig liegt. */
  richtung: Blattrichtung | null;
  /** An diesen Knoten hängen die Zeigerereignisse. */
  griffe: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
  };
}

export function useBlaettern({
  huelle,
  kannVor,
  kannZurueck,
  onBlaettern,
  feld,
}: {
  huelle: React.RefObject<HTMLElement>;
  kannVor: boolean;
  kannZurueck: boolean;
  onBlaettern: (richtung: Blattrichtung) => void;
  /** Das Feld für die Randstreifen – dasselbe, das die Raumschicht benutzt. */
  feld: () => { breite: number; hoehe: number; oben?: number; unten?: number };
}): Blaettern {
  const lauf = useRef<Lauf | null>(null);
  const uhr = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [richtung, setRichtung] = useState<Blattrichtung | null>(null);

  const schreibe = useCallback(
    (weg: number, r: Blattrichtung, tempo = 0, schubPx = 0, breite = 390) => {
      const el = huelle.current;
      if (!el) return;
      const k = konfig();
      /*
       * Das Tempo wird gezeichnet – nicht, weil es etwas färbt, sondern damit
       * das Stimmzimmer es ablesen kann. Wer die Schwelle für den Schnellwisch
       * einstellen soll, muss sehen, welche Werte sein Daumen überhaupt
       * erzeugt; ohne diese Zahl rät man an einem Regler herum.
       */
      el.style.setProperty('--dc-blatt-tempo', tempo.toFixed(3));
      const winkel = blattwinkel(weg, k);
      el.style.setProperty('--dc-blatt', String(weg));
      /*
       * Zwei Winkel, nicht einer.
       *
       * Vorwärts dreht sich die *lebende Seite* weg und gibt Papier frei;
       * rückwärts fällt ein leeres Blatt von links darauf. Beide Male dieselbe
       * Bewegung, aber an verschiedenen Knoten – ein gemeinsamer Wert würde
       * eines von beiden spiegelverkehrt machen.
       */
      el.style.setProperty('--dc-seite-winkel', r === 'vor' ? `${winkel}deg` : '0deg');
      /*
       * Der Schub – in Punkten, nicht in Anteilen.
       *
       * Vorwärts wandert die lebende Seite unter dem Finger nach links;
       * rückwärts steht sie still und das hereinfallende Blatt kommt von
       * links auf sie zu. Beide Male dieselbe Strecke, an verschiedenen
       * Knoten.
       */
      el.style.setProperty('--dc-seite-schub', r === 'vor' ? `${schubPx}px` : '0px');
      el.style.setProperty('--dc-blatt-schub', r === 'zurueck' ? `${schubPx - breite}px` : '0px');
      el.style.setProperty(
        '--dc-blatt-winkel',
        r === 'zurueck' ? `${blattwinkelZurueck(weg, k)}deg` : '0deg',
      );
      el.style.setProperty('--dc-blatt-woelb', String(kruemmung(weg, k)));
      el.style.setProperty('--dc-blatt-schatt', String(blattschatten(weg, k)));
    },
    [huelle],
  );

  const raeumeAuf = useCallback(() => {
    const el = huelle.current;
    if (!el) return;
    el.style.setProperty('--dc-blatt', '0');
    el.style.setProperty('--dc-seite-winkel', '0deg');
    el.style.setProperty('--dc-seite-schub', '0px');
    el.style.setProperty(
      '--dc-blatt-schub',
      `${-(huelle.current?.clientWidth || 390)}px`,
    );
    el.style.setProperty('--dc-blatt-winkel', `${blattwinkelZurueck(0, konfig())}deg`);
    el.style.setProperty('--dc-blatt-woelb', '0');
    el.style.setProperty('--dc-blatt-schatt', '0');
    el.style.setProperty('--dc-blatt-tempo', '0');
  }, [huelle]);

  useEffect(() => () => void (uhr.current && clearTimeout(uhr.current)), []);

  const runter = (e: React.PointerEvent) => {
    if (lauf.current) return;
    /* 1. Der Raum hat Vorrang – er entscheidet zuerst und wir stören nicht. */
    if (gesteLaeuft()) return;
    /* 2. In den Randstreifen wohnt Living Depth. Eine Wahrheit, ein Aufruf. */
    if (randRichtung(e.clientX, e.clientY, feld(), konfig())) return;
    /* 3. Eingaben, Karten, Regler gehören sich selbst. */
    if (lokalBesetzt(e.target)) return;

    lauf.current = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      richtung: null,
      weg: 0,
      letzteX: e.clientX,
      letzteZeit: performance.now(),
      tempo: 0,
      verworfen: false,
    };
  };

  const bewegen = (e: React.PointerEvent) => {
    const g = lauf.current;
    if (!g || g.id !== e.pointerId || g.verworfen) return;
    const el = huelle.current;
    if (!el) return;

    const dx = e.clientX - g.x0;
    const dy = e.clientY - g.y0;
    const k = konfig();

    if (!g.richtung) {
      if (Math.abs(dx) < k.seite.totzonePx) return;
      /*
       * 4. Waagerecht oder senkrecht?
       *
       * Ein Buch, das bei jedem schrägen Scrollen zu blättern anfängt, kann
       * man nicht lesen. Die Schwelle ist bewusst deutlich: Erst wenn die
       * waagerechte Bewegung die senkrechte klar überwiegt, gehört der Finger
       * dem Blatt.
       */
      if (Math.abs(dx) < Math.abs(dy) * 1.5) {
        g.verworfen = true;
        return;
      }
      const r = blattrichtung(dx);
      if ((r === 'vor' && !kannVor) || (r === 'zurueck' && !kannZurueck)) {
        g.verworfen = true;
        return;
      }
      g.richtung = r;
      setRichtung(r);
      el.removeAttribute('data-blatt-federt');
      el.removeAttribute('data-blatt-legt');
    }

    const jetzt = performance.now();
    const dt = Math.max(1, jetzt - g.letzteZeit);
    g.tempo = Math.abs(e.clientX - g.letzteX) / dt;
    g.letzteX = e.clientX;
    g.letzteZeit = jetzt;

    /* Zieht der Finger wieder zurück, geht der Weg auf null – kein Negativ. */
    const gerichtet = g.richtung === 'vor' ? Math.min(0, dx) : Math.max(0, dx);
    const breite = el.clientWidth || 390;
    g.weg = blattweg(gerichtet, breite, k);
    schreibe(g.weg, g.richtung, g.tempo, blattschub(gerichtet, breite), breite);
  };

  /**
   * Loslassen – und Abbrechen.
   *
   * Beides endet die Geste, aber nicht auf dieselbe Weise. Ein `pointerup`
   * ist eine Entscheidung: Der Finger geht hoch, und der Weg sagt, ob die
   * Seite fällt oder sich legt. Ein `pointercancel` ist *keine* Entscheidung –
   * da hat der Browser die Geste an sich genommen, während der Finger noch
   * auf dem Glas liegt. Wer dort blättern ließe, blätterte ohne Auftrag.
   *
   * Der Unterschied ist keine Feinheit: Genau dieses `pointercancel` kam beim
   * ersten Gerätelauf bei *jedem* Zug, weil ein Scrollbehälter dazwischen die
   * waagerechte Bewegung noch für sich beanspruchen durfte. Der Grund dafür
   * steht jetzt im Stylesheet; die Unterscheidung hier bleibt trotzdem, weil
   * es andere Wege gibt, wie ein System eine Geste an sich zieht – ein Anruf,
   * ein Bildschirmwechsel, eine zweite Hand.
   */
  const hoch = (e: React.PointerEvent, abgebrochen = false) => {
    const g = lauf.current;
    lauf.current = null;
    if (!g || g.id !== e.pointerId || !g.richtung || g.verworfen) return;

    const el = huelle.current;
    const k = konfig();
    const entschieden = abgebrochen ? 'zurueck' : blattEntscheidung(g.weg, g.tempo, k);

    /* Ab hier darf eine Dauer mitreden – während des Ziehens nie. */
    el?.setAttribute('data-blatt-federt', 'ja');

    if (entschieden === 'blaettern') {
      /*
       * Umlegen und Zurückfedern sind zwei Bewegungen mit zwei Dauern und
       * zwei Kurven. Welche gilt, steht als Marke im DOM – das Stylesheet
       * entscheidet, nicht diese Datei.
       */
      el?.setAttribute('data-blatt-legt', 'ja');
      /* Beim Umlegen wandert die Seite ganz hinaus, nicht nur bis zum Finger. */
      const voll = el?.clientWidth || 390;
      schreibe(1, g.richtung, g.tempo, voll, voll);
      haptik.blattFest();
      if (uhr.current) clearTimeout(uhr.current);
      uhr.current = setTimeout(() => {
        onBlaettern(g.richtung!);
        /*
         * Erst navigieren, dann zurücksetzen – und zwar ohne Übergang, sonst
         * flöge das frisch gelegte Blatt sichtbar in die Ausgangslage zurück.
         */
        el?.removeAttribute('data-blatt-federt');
        el?.removeAttribute('data-blatt-legt');
        raeumeAuf();
        setRichtung(null);
        haptik.blattRuht();
      }, k.seite.legenMs);
    } else {
      schreibe(0, g.richtung, g.tempo, 0, el?.clientWidth || 390);
      if (uhr.current) clearTimeout(uhr.current);
      uhr.current = setTimeout(() => {
        el?.removeAttribute('data-blatt-federt');
        raeumeAuf();
        setRichtung(null);
      }, k.seite.zurueckMs);
    }
  };

  return {
    richtung,
    griffe: {
      onPointerDown: runter,
      onPointerMove: bewegen,
      onPointerUp: (e) => hoch(e),
      onPointerCancel: (e) => hoch(e, true),
    },
  };
}
