/**
 * Wann Dragoncore hinsieht – und wann es den Mund hält.
 *
 * Die Stelle, an der aus vier reinen Funktionen ein Verhalten wird. Hier
 * steckt der Teil des Auftrags, der am leichtesten schiefgeht: „Dragoncore
 * darf nicht nerven."
 *
 * Vier Vorkehrungen, alle vier hier:
 *
 * **Es sieht nur hin, wenn es ruhig ist.** Die Beobachter laufen nicht bei
 * jeder Änderung, sondern erst, wenn eine Weile nichts passiert ist. Das ist
 * nicht nur höflich, sondern auch billig: Kein Beobachter läuft je, während
 * jemand tippt.
 *
 * **Es spricht nur an ruhigen Orten.** Der Schreibraum, die Bearbeitung, die
 * Erschaffung, die Bibliothek – dort erscheint nichts. Nicht weil es dort
 * nichts zu sagen gäbe, sondern weil dort jemand mitten in etwas steckt.
 *
 * **Es wartet, bis die Seite gelesen ist.** Wer eine Seite aufschlägt, will
 * sie lesen; ein Zettel, der mit ihr zusammen erscheint, konkurriert mit dem,
 * weswegen er gekommen ist.
 *
 * **Es merkt sich jede Antwort.** Und das dauerhaft, im Buch.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStudio, livingEntries } from '../../store/useStudio';
import { beobachte } from '../../lib/anerbieten/beobachter';
import { waehle } from '../../lib/anerbieten/anerbieten';
import { heileGedaechtnis, merke, type Antwort } from '../../lib/anerbieten/gedaechtnis';
import { AnerbietenZettel } from './Anerbieten';

/**
 * Wo niemand angesprochen wird.
 *
 * Eine Liste von Anfängen, keine von vollständigen Adressen: `/schreiben`
 * deckt jede Szene ab, ohne dass jemand daran denken muss.
 */
const UNRUHIG = ['/schreiben', '/neu-binden', '/bibliothek', '/neues-buch', '/setzerei', '/lose-blaetter'];

/** Wie lange nichts passiert sein muss, bevor überhaupt hingesehen wird. */
const NACHDENKPAUSE_MS = 2500;

export function Aufmerksamkeit() {
  const entries = useStudio((s) => s.entries);
  const relations = useStudio((s) => s.relations);
  const settings = useStudio((s) => s.settings);
  const updateSettings = useStudio((s) => s.updateSettings);
  const saving = useStudio((s) => s.saving);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const gedaechtnis = useMemo(() => heileGedaechtnis(settings.anerbieten), [settings.anerbieten]);

  /*
   * Die Verweildauer wird an der Adresse gemessen, nicht an der Zeit seit dem
   * Start. Wer blaettert, faengt von vorn an – und das ist richtig: Jede neue
   * Seite ist ein neuer Grund, in Ruhe gelassen zu werden.
   */
  const [seitWann, setSeitWann] = useState(() => Date.now());
  useEffect(() => setSeitWann(Date.now()), [pathname]);

  /* Ein Takt, der nur laeuft, solange nichts anderes passiert. */
  const [takt, setTakt] = useState(0);
  const letzteAenderung = useRef(Date.now());
  useEffect(() => {
    letzteAenderung.current = Date.now();
  }, [entries, relations, saving]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (Date.now() - letzteAenderung.current > NACHDENKPAUSE_MS) setTakt((t) => t + 1);
    }, 1500);
    return () => window.clearInterval(id);
  }, []);

  const unruhig = UNRUHIG.some((p) => pathname.startsWith(p));

  /*
   * Ein zusaetzlicher Blick auf das Dokument: Wer in einem Feld steht,
   * schreibt – auch wenn die Adresse ruhig aussieht. Die Bearbeitung einer
   * Seite liegt unter derselben Adresse wie das Lesen, und ohne diese Zeile
   * erschiene der Zettel mitten im Formular.
   */
  const imFeld =
    typeof document !== 'undefined' &&
    ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName ?? '');

  const gefunden = useMemo(() => {
    if (unruhig) return { leise: [] };
    void takt;
    /*
     * Spricht schon jemand?
     *
     * Der Leitfaden erklaert dem Verfasser gerade das Buch. Ihm dabei ins Wort
     * zu fallen waere genau das Nerven, das dieser ganze Bau vermeiden soll –
     * und zwei Zettel uebereinander waeren nicht einmal lesbar.
     *
     * Geprueft wird am Dokument und nicht an einem Zustand, weil die Frage
     * genau die ist: Steht gerade etwas auf dem Bildschirm? Der eigene Zettel
     * ist dabei ausgenommen, sonst brachte er sich beim naechsten Takt selbst
     * zum Verschwinden.
     */
    if (typeof document !== 'undefined' &&
        document.querySelector('[role="note"]:not([data-anerbieten])')) {
      return { leise: [] };
    }
    const lebende = livingEntries(entries);
    return waehle(beobachte({ entries: lebende, relations }), gedaechtnis, {
      beschaeftigt: saving || imFeld,
      verweildauer: Date.now() - seitWann,
      beiEintrag: pathname.startsWith('/eintrag/') ? pathname.slice('/eintrag/'.length) : undefined,
      umfang: lebende.length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [takt, unruhig, pathname, gedaechtnis, saving, imFeld, entries, relations, seitWann]);

  const a = gefunden.anerbieten;
  if (!a) return null;

  /*
   * Wohin „Ansehen" fuehrt.
   *
   * Fuer eine Figur in ihren Spiegel, sonst auf die betroffene Seite. Gibt es
   * kein sinnvolles Ziel, erscheint der Knopf gar nicht – ein „Ansehen", das
   * irgendwohin fuehrt, ist schlimmer als keines.
   */
  const istFigur = a.beobachtung.art === 'figur:spiegel';
  const ziel = istFigur
    ? `/spiegel/${a.beobachtung.betrifft}`
    : a.beobachtung.betrifft
      ? `/eintrag/${a.beobachtung.betrifft}`
      : undefined;

  const antworten = (antwort: Antwort) => {
    updateSettings({
      anerbieten: merke(gedaechtnis, {
        id: a.beobachtung.id,
        art: a.beobachtung.art,
        betrifft: a.beobachtung.betrifft,
        wann: Date.now(),
        antwort,
      }),
    });
    /* Nach jeder Antwort ist die Seite wieder frisch – kein sofortiger Nachschlag. */
    setSeitWann(Date.now());
  };

  return (
    <AnerbietenZettel
      anerbieten={a}
      ziel={ziel}
      zielLabel={istFigur ? 'Den Spiegel aufschlagen' : 'Ansehen'}
      onAntwort={(antwort) => {
        antworten(antwort);
        if (antwort === 'geoeffnet' && !ziel) navigate('/anhang');
      }}
    />
  );
}
