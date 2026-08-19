/**
 * Die Interaktionsschicht.
 *
 * Hier läuft die Geste zusammen: Zeigerereignisse hinein, drei CSS-Variablen
 * hinaus. Die Entscheidungen selbst trifft `lib/raum/geste.ts` – diese Datei
 * kennt keine einzige Schwelle.
 *
 * ---
 *
 * **Warum die Geste nicht durch React läuft.**
 *
 * Ein Finger bewegt sich sechzigmal in der Sekunde. Liefe jeder dieser Schritte
 * durch `setState`, würde bei jedem Schritt die ganze Hülle neu bewertet – mit
 * Buchblock, Seiteninhalt, Anerbieten und allem, was darin hängt. Auf einem
 * Telefon ist das der Unterschied zwischen „ich ziehe" und „ich warte, bis es
 * nachkommt", und man kann ihn nicht wegoptimieren, wenn er einmal in der
 * Architektur steckt.
 *
 * Deshalb: Der laufende Zustand liegt in einem Ref, und der sichtbare Zustand
 * sind drei Zahlen, die direkt ins DOM geschrieben werden. React erfährt von
 * einer Geste genau zweimal – wenn sie beginnt und wenn sie endet.
 *
 * ---
 *
 * **Wem gehört der Finger?**
 *
 * Die schwierigste Frage dieser Datei, und sie wird in dieser Reihenfolge
 * beantwortet:
 *
 *   0. Führt diese Richtung auf *dieser Seite* überhaupt irgendwohin? → sonst
 *      passiert gar nichts. Siehe `tiefenkarte.ts`: Nicht jede Seite hat vier
 *      Richtungen, und eine leere Richtung wird nicht mit Erfundenem gefüllt.
 *   1. Hat der Finger in einem Randstreifen aufgesetzt? → sonst keine Raumgeste.
 *   2. Steht dort ein *Bedienelement* – Eingabe, Regler? → dann gehört er dorthin.
 *   3. Steht dort eine *Arbeitsfläche* – Karte, Zeichenfläche? → nur außerhalb
 *      der Randstreifen. Am Rand gewinnt der Raum.
 *   4. Könnte an dieser Stelle noch gescrollt werden? → dann scrollen.
 *   5. Zeigt die Bewegung wirklich nach innen? → sonst loslassen.
 *
 * **Punkt 1 stand einmal an dritter Stelle**, und Punkt 2 und 3 waren eine
 * einzige Frage. Beides zusammen ergab einen Fehler, den man erst am Gerät
 * sieht: Auf der Weltkarte war *jeder* Weg nach außen zu, weil die Karte auf
 * einem Telefon so breit ist wie der Bildschirm und damit auch die
 * Randstreifen beansprucht. Ausgerechnet im Weltraum, wo das Erkunden
 * hingehört.
 *
 * Die Regel dahinter ist es wert, sie sich zu merken: **Ein Bauteil darf
 * seine Mitte beanspruchen. Der Rand gehört dem Raum.**
 */

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Home } from 'lucide-react';
import {
  entscheide,
  fortschritt,
  istDoppeltipp,
  passtRichtung,
  phaseVon,
  randRichtung,
  EINWAERTS,
  type Richtung,
} from '../../lib/raum/geste';
import { beiKonfig, konfig } from '../../lib/raum/konfig';
import { haptik } from '../../lib/raum/haptik';
import { karteJetzt, useRaum } from '../../lib/raum/useRaum';
import { gesteErlaubt } from '../../lib/raum/tiefenkarte';
import { Fokuspunkt, Richtungsbogen, Richtungszeichen } from './Richtungsbogen';

interface Lauf {
  id: number;
  x0: number;
  y0: number;
  t0: number;
  richtung: Richtung;
  gesperrt: boolean;
  verworfen: boolean;
  weg: number;
  letzteX: number;
  letzteY: number;
  letzteZeit: number;
  tempo: number;
  sagteAndeutung: boolean;
  sagteVerpflichtung: boolean;
}

const mische = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));

/**
 * Die sichere Fläche des Geräts – gemessen, nicht geraten.
 *
 * `env(safe-area-inset-*)` lässt sich nicht zuverlässig aus einer
 * CSS-Variablen zurücklesen, und ein fest eingetragener Wert wäre auf dem
 * nächsten Gerät falsch. Also ein Klotz, der genau so hoch ist wie der Einzug,
 * einmal ausgemessen und dann weggeräumt. Zehn Zeilen, die nicht lügen können.
 *
 * Der Wert ändert sich beim Drehen des Geräts, deshalb wird er nicht
 * zwischengespeichert, sondern bei jedem Aufsetzen neu geholt – das kostet
 * einmal je Geste einen Layoutdurchgang und nie während des Ziehens.
 */
function sichereFlaeche(): { oben: number; unten: number } {
  const klotz = document.createElement('div');
  klotz.style.cssText =
    'position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none;' +
    'padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)';
  document.body.appendChild(klotz);
  const s = getComputedStyle(klotz);
  const oben = parseFloat(s.paddingTop) || 0;
  const unten = parseFloat(s.paddingBottom) || 0;
  klotz.remove();
  return { oben, unten };
}

/**
 * Das Feld, in dem gemessen wird: der Bildschirm – abzüglich dessen, was dem
 * Gerät gehört.
 *
 * Siehe `geste.ts`, `Feld`: Oben liegt die Mitteilungszentrale, unten die
 * Geste zum Startbildschirm. Beide Zonen gewinnt keine Anwendung, also fängt
 * unser Streifen erst dahinter an.
 */
export const fenster = () => {
  const k = konfig().geste;
  const sicher = sichereFlaeche();
  return {
    breite: window.innerWidth,
    hoehe: window.innerHeight,
    oben: sicher.oben + k.systemEinzugObenPx,
    unten: sicher.unten + k.systemEinzugUntenPx,
  };
};

/**
 * Der nächste Behälter, in dem noch gescrollt werden kann.
 *
 * Ohne diese Suche würde jeder Wisch vom oberen Rand nach unten den
 * Wissensraum andeuten – auch mitten in einem langen Text, den jemand
 * schlicht weiterlesen wollte.
 */
function scrolltNoch(ziel: EventTarget | null, richtung: Richtung): boolean {
  if (richtung !== 'oben' && richtung !== 'unten') return false;
  let el = ziel as HTMLElement | null;
  while (el && el !== document.body) {
    const stil = getComputedStyle(el);
    const laeuft = /(auto|scroll)/.test(stil.overflowY);
    if (laeuft && el.scrollHeight > el.clientHeight + 1) {
      /* „oben" heißt: der Finger wandert nach unten, also scrollt es hinauf. */
      if (richtung === 'oben') return el.scrollTop > 1;
      return el.scrollTop < el.scrollHeight - el.clientHeight - 1;
    }
    el = el.parentElement;
  }
  return false;
}

/**
 * Bedienelemente – sie behalten den Finger **überall**, auch am Rand.
 *
 * Alles hier ist klein und liegt dort, wo jemand es hingelegt hat. Ein
 * Schieberegler, der zufällig am Bildschirmrand endet, muss trotzdem
 * schiebbar bleiben: Ein Regler, den man nicht bewegen kann, ist kaputt, und
 * kein Erkunden der Welt wiegt das auf.
 */
const BEDIENELEMENTE = 'input, textarea, select, [contenteditable="true"], [role="slider"]';

/**
 * Arbeitsflächen – sie behalten den Finger nur **abseits der Randstreifen**.
 *
 * Der Unterschied zu den Bedienelementen ist die Größe, und er ist der ganze
 * Punkt. Die Weltkarte beansprucht ihre Fläche zu Recht: Dort malt jemand
 * eine Küste, und eine halb gezogene Küste, die stattdessen einen Raum
 * öffnet, wäre unbrauchbar. Auf einem Telefon ist diese Fläche aber so breit
 * wie der Bildschirm – sie verschluckt damit auch die vierunddreißig Punkte
 * am Rand, und im Weltraum wäre jeder Weg nach außen zu. Ausgerechnet dort,
 * wo das Erkunden der Welt hingehört.
 *
 * Die Regel lautet deshalb: **Die Mitte gehört der Arbeitsfläche, der Rand
 * gehört dem Raum.** Das kostet die Karte einen schmalen Streifen an zwei
 * Seiten und gibt ihr dafür überhaupt eine Tiefe.
 */
const ARBEITSFLAECHEN = 'canvas, [data-raum="aus"]';

/**
 * Gehört der Finger jemand anderem?
 *
 * `amRand` sagt, ob die Berührung in einem Randstreifen begonnen hat. Nur
 * dann tritt eine Arbeitsfläche zurück – ein Bedienelement niemals.
 */
function lokalBesetzt(ziel: EventTarget | null, amRand = false): boolean {
  const el = ziel as HTMLElement | null;
  if (!el?.closest) return false;
  if (el.closest(BEDIENELEMENTE)) return true;
  return amRand ? false : !!el.closest(ARBEITSFLAECHEN);
}

export function Raumschicht({ children }: { children: ReactNode }) {
  const huelle = useRef<HTMLDivElement>(null);
  const lauf = useRef<Lauf | null>(null);
  const letzterTipp = useRef<{ x: number; y: number; t: number } | null>(null);
  const uhr = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ort = useRaum((s) => s.ort);
  const tiefe = useRaum((s) => s.tiefe);
  const phase = useRaum((s) => s.phase);
  const gestenrichtung = useRaum((s) => s.gestenrichtung);

  /* ---------------------------------------------------- Die drei Variablen */

  const schreibe = useCallback((weg: number, richtung: Richtung | null) => {
    const el = huelle.current;
    if (!el) return;
    const k = konfig();
    const b = k.bogen;

    /*
     * Die Grundkurve erreicht bei Faktor 1 die halbe Breite. `maxEinzugAnteil`
     * sagt, wie weit sie *soll* – daher der Ausgleich. Stünde hier einfach
     * `weg`, wäre der Regler wirkungslos und niemand wüsste, warum.
     */
    el.style.setProperty('--dc-bogen', String((weg * b.maxEinzugAnteil) / 0.5));

    const deck =
      weg < k.geste.andeutung
        ? mische(b.grundDeckkraft, b.andeutungDeckkraft, weg / Math.max(0.0001, k.geste.andeutung))
        : mische(
            b.andeutungDeckkraft,
            b.vollDeckkraft,
            (weg - k.geste.andeutung) / Math.max(0.0001, 1 - k.geste.andeutung),
          );
    el.style.setProperty('--dc-bogen-deck', String(Math.min(1, deck * b.staerke)));
    el.style.setProperty('--dc-bogen-strich', String(mische(b.minBreitePx, b.maxBreitePx, weg)));
    el.style.setProperty(
      '--dc-bogen-weich',
      String(mische(b.weichzeichnenMinPx, b.weichzeichnenMaxPx, weg)),
    );

    /*
     * Das Richtungszeichen.
     *
     * Es wandert mit dem Bogen herein (`--dc-zeichen-weg` ist derselbe
     * Fortschritt) und wird erst *ab der Andeutungsschwelle* sichtbar – dort
     * steht im Entwurf „ab ca. 15 % wird die Richtung deutlich".
     *
     * Die Einblendung braucht danach noch ein Stück Weg, sonst erschiene das
     * Zeichen schlagartig und man hätte einen Sprung statt eines Erkennens.
     * Ein Drittel des verbleibenden Weges hat sich als das gezeigt, was
     * „deutlich werden" bedeutet – und es ist über `andeutung` mit dem Regler
     * verbunden statt eine eigene feste Zahl zu sein.
     */
    el.style.setProperty('--dc-zeichen-weg', String(weg));
    const einblenden = Math.max(0.05, (1 - k.geste.andeutung) / 3);
    el.style.setProperty(
      '--dc-zeichen-deck',
      String(Math.min(1, Math.max(0, (weg - k.geste.andeutung) / einblenden))),
    );

    /* Die Mitte antwortet – kaum merklich, siehe das erste Gesetz. */
    const m = k.bewegung;
    el.style.setProperty('--dc-mitte-skala', String(mische(1, m.mitteSkalaMin, weg)));
    if (richtung) {
      const [ex, ey] = EINWAERTS[richtung];
      el.style.setProperty('--dc-mitte-x', `${ex * m.mitteVersatzMaxPx * weg}px`);
      el.style.setProperty('--dc-mitte-y', `${ey * m.mitteVersatzMaxPx * weg}px`);
    }
  }, []);

  const raeumeAuf = useCallback(() => {
    schreibe(0, null);
    const el = huelle.current;
    if (el) {
      el.style.setProperty('--dc-mitte-x', '0px');
      el.style.setProperty('--dc-mitte-y', '0px');
      el.style.setProperty('--dc-mitte-skala', '1');
    }
  }, [schreibe]);

  /* -------------------------------------------------------- Die Dauern ins DOM */

  useEffect(() => {
    const setze = () => {
      const g = konfig();
      const k = g.bewegung;
      const w = document.documentElement.style;
      w.setProperty('--dc-dauer-oeffnen', `${k.verpflichtenMs}ms`);
      w.setProperty('--dc-dauer-abbruch', `${k.abbrechenMs}ms`);
      w.setProperty('--dc-dauer-heim', `${k.heimkehrMs}ms`);
      /*
       * Die Dauern des Buches wohnen an derselben Stelle.
       *
       * Nicht, weil sie zur Raumschicht gehören – sondern weil es genau *eine*
       * Stelle geben soll, an der aus einer Konfiguration eine CSS-Variable
       * wird. Zwei solche Stellen hießen: zwei Gelegenheiten, das Nachziehen
       * beim Ändern im Labor zu vergessen.
       */
      w.setProperty('--dc-seite-zurueck', `${g.seite.zurueckMs}ms`);
      w.setProperty('--dc-seite-legen', `${g.seite.legenMs}ms`);
      w.setProperty('--dc-falz', String(g.seite.falzstaerke));
    };
    setze();
    /* Das Labor darf die Dauern im Betrieb ändern. */
    return beiKonfig(setze);
  }, []);

  /* ------------------------------------------------------------- Die Geste */

  const beende = useCallback(
    (nachDauerMs: number) => {
      if (uhr.current) clearTimeout(uhr.current);
      uhr.current = setTimeout(() => {
        useRaum.getState().ruhe();
        huelle.current?.removeAttribute('data-abbruch');
      }, nachDauerMs);
    },
    [],
  );

  const runter = (e: PointerEvent) => {
    /* Während einer laufenden Bewegung nimmt Dragoncore keine neue an. */
    if (useRaum.getState().imUebergang) return;
    if (lauf.current) return;

    /*
     * Gemessen wird am **Bildschirm**, nicht am Buchkasten.
     *
     * Hier stand zuerst der Kasten dieser Komponente – und der beginnt unter
     * der Kopfzeile. Der obere Randstreifen lag damit nicht am oberen
     * Bildschirmrand, sondern irgendwo im Buch, und ein Zug vom echten Rand
     * kam nie an. Der Raum ist der Raum um das Buch; seine Ränder sind die des
     * Geräts.
     */
    const richtung = randRichtung(e.clientX, e.clientY, fenster(), konfig());
    if (!richtung) return;

    /*
     * Führt diese Richtung *hier* überhaupt irgendwohin?
     *
     * Wenn nicht, passiert gar nichts: kein Bogen, kein Zeichen, kein
     * Impuls. Das ist die Regel „nichts erfinden" an der einzigen Stelle,
     * an der sie zählt – am Anfang. Ein Bogen, der wächst und dann ins Leere
     * führt, wäre ein Versprechen, das die Seite nicht halten kann; ein
     * Raum, der nur existiert, damit die Geste nicht ins Leere geht, zeigt
     * zwangsläufig irgendetwas Naheliegendes statt etwas Zugehörigem.
     *
     * Der Finger bleibt dabei frei: Was hier nicht beansprucht wird, kann
     * scrollen oder blättern. Eine stille Richtung ist keine tote Fläche.
     *
     * Die Frage stellt die Karte, nicht diese Datei. Das Gestenwerk erkennt
     * Bewegungen und darf über Bedeutung nichts wissen – sonst hat man die
     * beiden Verantwortlichkeiten wieder vermischt, und die Bedeutung sitzt
     * doch wieder im Programm.
     */
    const s = useRaum.getState();
    if (!gesteErlaubt(karteJetzt(), { ort: s.ort, tiefe: s.tiefe }, richtung)) return;

    /*
     * Der Randstreifen kommt **vor** der Frage, wem der Finger sonst gehört.
     *
     * Diese Reihenfolge stand zuerst andersherum, und das war ein Fehler mit
     * Ansage: Die Weltkarte beansprucht ihre Fläche mit `data-raum="aus"` –
     * zu Recht, dort malt jemand eine Küste. Auf einem Telefon füllt diese
     * Fläche aber die ganze Breite, also **auch den Randstreifen**. Damit war
     * im Weltraum jeder Weg nach außen zu, und zwar genau dort, wo das
     * Erkunden der Welt hingehört.
     *
     * Ein Bauteil darf seine *Mitte* beanspruchen. Die vierunddreißig Punkte
     * am Bildschirmrand gehören ihm nicht – die gehören dem Raum, überall und
     * ohne Ausnahme. Genau so hält es das Blättern schon: `randRichtung`
     * zuerst, `lokalBesetzt` danach. Zwei Bauteile mit zwei Reihenfolgen für
     * dieselbe Frage wären ein Widerspruch, der sich als „auf der Karte geht
     * es nicht" zeigt und den niemand sucht, weil überall sonst alles geht.
     */
    if (lokalBesetzt(e.target, true)) return;
    if (scrolltNoch(e.target, richtung)) return;

    lauf.current = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      t0: performance.now(),
      richtung,
      gesperrt: false,
      verworfen: false,
      weg: 0,
      letzteX: e.clientX,
      letzteY: e.clientY,
      letzteZeit: performance.now(),
      tempo: 0,
      sagteAndeutung: false,
      sagteVerpflichtung: false,
    };
  };

  const bewegen = (e: PointerEvent) => {
    const g = lauf.current;
    if (!g || g.id !== e.pointerId || g.verworfen) return;

    const dx = e.clientX - g.x0;
    const dy = e.clientY - g.y0;
    const k = konfig();

    if (!g.gesperrt) {
      if (Math.hypot(dx, dy) < Math.max(k.geste.totzonePx, k.geste.richtungssperrePx)) return;
      if (!passtRichtung(dx, dy, g.richtung, k)) {
        /*
         * Die Bewegung zeigt woandershin. Der Finger gehört jemand anderem –
         * und zwar ohne dass hier je etwas sichtbar geworden wäre.
         */
        g.verworfen = true;
        return;
      }
      g.gesperrt = true;
      useRaum.getState().beginneGeste(g.richtung);
    }

    const weg = fortschritt([g.x0, g.y0], [e.clientX, e.clientY], g.richtung, fenster(), k);

    /* Tempo aus dem letzten Schritt – geglättet genug für eine Entscheidung. */
    const jetzt = performance.now();
    const dt = Math.max(1, jetzt - g.letzteZeit);
    g.tempo = Math.hypot(e.clientX - g.letzteX, e.clientY - g.letzteY) / dt;
    g.letzteX = e.clientX;
    g.letzteY = e.clientY;
    g.letzteZeit = jetzt;
    g.weg = weg;

    schreibe(weg, g.richtung);

    /*
     * Die zwei Töne.
     *
     * Beide nur einmal je Geste, und beide nur aufwärts: Wer über der Schwelle
     * zittert, soll nicht in einer Vibrationsschleife landen.
     */
    if (!g.sagteAndeutung && weg >= k.geste.andeutung) {
      g.sagteAndeutung = true;
      haptik.andeutung();
    }
    if (!g.sagteVerpflichtung && weg >= k.geste.verpflichtung) {
      g.sagteVerpflichtung = true;
      haptik.verpflichtung();
    }

    const p = phaseVon(weg, k);
    if (p !== useRaum.getState().phase) useRaum.getState().ziehe(weg, g.tempo, p);
  };

  const hoch = (e: PointerEvent) => {
    const g = lauf.current;
    if (g && g.id === e.pointerId && g.gesperrt && !g.verworfen) {
      lauf.current = null;
      const k = konfig();
      if (entscheide(g.weg, g.tempo, k) === 'oeffnen') {
        useRaum.getState().oeffne();
        haptik.einrasten();
        raeumeAuf();
        beende(k.bewegung.verpflichtenMs);
      } else {
        /* Zurückfedern: jetzt darf eine Dauer mitreden, vorher nicht. */
        huelle.current?.setAttribute('data-abbruch', 'ja');
        raeumeAuf();
        useRaum.getState().brichAb();
        beende(k.bewegung.abbrechenMs);
      }
      letzterTipp.current = null;
      return;
    }

    const warLauf = !!g;
    lauf.current = null;
    if (warLauf && g?.gesperrt) return;

    /* ------------------------------------------------------- Der Doppeltipp */

    if (lokalBesetzt(e.target)) return;
    const el = e.target as HTMLElement | null;
    if (el?.closest?.('button, a, [role="button"]')) return;

    const k = konfig();
    const tipp = { x: e.clientX, y: e.clientY, t: performance.now() };
    if (istDoppeltipp(letzterTipp.current, tipp, k)) {
      letzterTipp.current = null;
      const s = useRaum.getState();
      /* Steht der Blick schon beim Werk, gibt es nichts heimzukehren. */
      if (s.tiefe === 0 && s.ort === 'mitte') return;
      s.heim();
      haptik.heimkehr();
      beende(k.bewegung.heimkehrMs);
      return;
    }
    letzterTipp.current = tipp;
  };

  /* -------------------------------------------------- Der Weg ohne Finger */

  /*
   * Gesten dürfen die bevorzugte Bedienung sein, aber nicht die einzige.
   *
   *   Escape        Heimkehr
   *   Alt + Pfeil   in die jeweilige Richtung
   *
   * Dazu unten ein Knopf, der nur bei Tastaturfokus sichtbar wird. Er
   * dominiert die Oberfläche nicht und ist trotzdem da, wenn jemand ihn
   * braucht.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const s = useRaum.getState();
      if (e.key === 'Escape' && (s.tiefe > 0 || s.ort !== 'mitte')) {
        e.preventDefault();
        s.heim();
        beende(konfig().bewegung.heimkehrMs);
        return;
      }
      if (!e.altKey) return;
      const karte: Record<string, Richtung> = {
        ArrowLeft: 'links',
        ArrowRight: 'rechts',
        ArrowUp: 'oben',
        ArrowDown: 'unten',
      };
      const richtung = karte[e.key];
      if (!richtung) return;
      e.preventDefault();
      s.beginneGeste(richtung);
      s.oeffne();
      beende(konfig().bewegung.verpflichtenMs);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [beende]);

  /*
   * Die Zeigerereignisse hängen am Fenster, nicht an diesem Knoten.
   *
   * Zwei Gründe, und beide sind praktisch. Erstens liegt der obere
   * Randstreifen über der Kopfzeile, also außerhalb dieses Kastens – an ihm
   * angeschlagen käme dort nie ein Ereignis an. Zweitens endet eine Geste oft
   * außerhalb: Wer schnell zieht und loslässt, hat den Finger schon woanders.
   *
   * Die Handler liegen in einem Ref, damit die Anmeldung *einmal* passiert und
   * nicht bei jedem Zeichnen abgemeldet und neu angemeldet wird.
   */
  const griffe = useRef({ runter, bewegen, hoch });
  griffe.current = { runter, bewegen, hoch };

  useEffect(() => {
    const ab = (e: PointerEvent) => griffe.current.runter(e);
    const zu = (e: PointerEvent) => griffe.current.bewegen(e);
    const auf = (e: PointerEvent) => griffe.current.hoch(e);
    window.addEventListener('pointerdown', ab, { passive: true });
    window.addEventListener('pointermove', zu, { passive: true });
    window.addEventListener('pointerup', auf, { passive: true });
    window.addEventListener('pointercancel', auf, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', ab);
      window.removeEventListener('pointermove', zu);
      window.removeEventListener('pointerup', auf);
      window.removeEventListener('pointercancel', auf);
    };
  }, []);

  /*
   * Das Scrollen anhalten, sobald die Geste beansprucht ist.
   *
   * `touch-action` fest zu setzen ginge nicht: Ein Streifen mit
   * `touch-action: none` würde auch alles verschlucken, was darunter liegt –
   * jeden Knopf, jeden Text, jeden Wisch. Also wird erst dann eingegriffen,
   * wenn die Richtung feststeht, und zwar mit einem nicht-passiven Zuhörer,
   * der nur dann `preventDefault` ruft. Vorher gehört das Scrollen dem Browser.
   */
  useEffect(() => {
    const halt = (e: TouchEvent) => {
      const g = lauf.current;
      if (g?.gesperrt && !g.verworfen && e.cancelable) e.preventDefault();
    };
    window.addEventListener('touchmove', halt, { passive: false });
    return () => window.removeEventListener('touchmove', halt);
  }, []);

  useEffect(() => () => void (uhr.current && clearTimeout(uhr.current)), []);

  const drin = tiefe > 0;

  return (
    <div
      ref={huelle}
      className="dc-schicht relative flex min-h-0 flex-1 flex-col"
      data-phase={phase}
      data-ort={ort}
      data-tiefe={tiefe}
    >
      <div className={drin ? 'contents' : 'dc-mitte flex min-h-0 flex-1 flex-col'}>{children}</div>

      {gestenrichtung && (
        <>
          <Richtungsbogen richtung={gestenrichtung} />
          <Richtungszeichen richtung={gestenrichtung} />
        </>
      )}
      {phase === 'verpflichtend' && <Fokuspunkt />}

      <button
        type="button"
        onClick={() => {
          useRaum.getState().heim();
          beende(konfig().bewegung.heimkehrMs);
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:bottom-4 focus:left-1/2 focus:z-40 focus:-translate-x-1/2 focus:rounded-full focus:bg-cream-50 focus:px-4 focus:py-2 focus:text-sm focus:text-ink"
      >
        <Home size={14} className="mr-1 inline" aria-hidden />
        Zurück zum Werk
      </button>
    </div>
  );
}
