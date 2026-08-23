/**
 * Das Stimmzimmer.
 *
 * Kein Merkmal für Leser. Ein Werkzeug, um auf einem echten Telefon zu sagen:
 * „fünfzehn Prozent fühlen sich zu spät an" – und den Regler zu schieben,
 * statt Code zu ändern, zu bauen, hochzuladen und die Testsituation neu
 * aufzubauen.
 *
 * ---
 *
 * **Eine Abweichung vom Auftrag, und warum.**
 *
 * Der Bauplan sagt „Development-only" und „niemals in Production". Er sagt
 * aber auch: „Ich möchte auf einem echten iPhone sagen können, fünfzehn
 * Prozent sind zu spät." Beides zugleich geht nicht – das iPhone bekommt den
 * gebauten Stand von GitHub Pages, und der *ist* Production. Ein Labor, das
 * nur im Entwicklungsserver läuft, ist genau dort nicht da, wo es gebraucht
 * wird.
 *
 * Deshalb hängt es nicht am Baumodus, sondern an einer Adresse, die niemand
 * versehentlich eingibt:
 *
 *   …/studio/?interactionLab=1
 *
 * Wer sie nicht kennt, sieht nichts: keine Regler, keine Zahlen, keinen
 * Schalter, keinen Hinweis. Für den normalen Betrieb ist das dasselbe wie
 * „nicht vorhanden", und für das Stimmen auf dem Gerät ist es der Unterschied
 * zwischen möglich und unmöglich.
 */

import { useEffect, useRef, useState } from 'react';
import { Copy, X } from 'lucide-react';
import {
  BUCHVORLAGEN,
  VORGABE,
  VORLAGEN,
  alsQuelltext,
  beiKonfig,
  buchvorlage,
  konfig,
  setzeBuchvorlage,
  setzeKonfig,
  setzeVorlage,
  type Raumkonfig,
} from '../../lib/raum/konfig';
import { karteJetzt, useRaum } from '../../lib/raum/useRaum';
import { fenster } from './Raumschicht';

/** Steht die Adresse auf „Labor"? */
export function laborAn(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.href.includes('interactionLab=1');
}

type Gruppe = keyof Raumkonfig;

/** Was sich schieben lässt – Gruppe, Feld, Grenzen, Schrittweite. */
const REGLER: { gruppe: Gruppe; feld: string; von: number; bis: number; schritt: number; name: string }[] = [
  { gruppe: 'geste', feld: 'andeutung', von: 0.04, bis: 0.4, schritt: 0.01, name: 'Andeutung ab' },
  { gruppe: 'geste', feld: 'verpflichtung', von: 0.2, bis: 0.8, schritt: 0.01, name: 'Öffnen ab' },
  { gruppe: 'geste', feld: 'wegAnteilWaagerecht', von: 0.15, bis: 0.9, schritt: 0.01, name: 'Ziehweg waagerecht' },
  { gruppe: 'geste', feld: 'wegAnteilSenkrecht', von: 0.1, bis: 0.9, schritt: 0.01, name: 'Ziehweg senkrecht' },
  { gruppe: 'geste', feld: 'totzonePx', von: 0, bis: 24, schritt: 1, name: 'Totzone' },
  { gruppe: 'geste', feld: 'richtungstoleranzGrad', von: 12, bis: 60, schritt: 1, name: 'Bogen erlaubt (°)' },
  { gruppe: 'geste', feld: 'aufgabewinkelGrad', von: 40, bis: 90, schritt: 1, name: 'Aufgeben ab (°)' },
  { gruppe: 'geste', feld: 'fremdwegPx', von: 24, bis: 200, schritt: 4, name: 'Querweg bis Aufgabe' },
  { gruppe: 'geste', feld: 'randEinzugPx', von: 0, bis: 40, schritt: 1, name: 'Randeinzug' },
  { gruppe: 'geste', feld: 'randBreitePx', von: 12, bis: 120, schritt: 2, name: 'Randstreifen' },
  { gruppe: 'geste', feld: 'systemEinzugObenPx', von: 0, bis: 90, schritt: 2, name: 'Abstand oben (System)' },
  { gruppe: 'geste', feld: 'systemEinzugUntenPx', von: 0, bis: 120, schritt: 2, name: 'Abstand unten (System)' },
  { gruppe: 'geste', feld: 'schnellMindestweg', von: 0.05, bis: 0.5, schritt: 0.01, name: 'Schnellwisch ab' },
  { gruppe: 'geste', feld: 'schnellTempoPxProMs', von: 0.2, bis: 2, schritt: 0.05, name: 'Schnellwisch-Tempo' },
  { gruppe: 'geste', feld: 'richtungssperrePx', von: 2, bis: 40, schritt: 1, name: 'Richtungssperre' },
  { gruppe: 'geste', feld: 'richtungstoleranzGrad', von: 8, bis: 60, schritt: 1, name: 'Winkeltoleranz' },
  { gruppe: 'geste', feld: 'hoechsteTiefe', von: 1, bis: 4, schritt: 1, name: 'Höchste Tiefe' },

  { gruppe: 'bogen', feld: 'staerke', von: 0.2, bis: 2, schritt: 0.05, name: 'Bogenstärke' },
  { gruppe: 'bogen', feld: 'vollDeckkraft', von: 0.2, bis: 1, schritt: 0.02, name: 'Deckkraft voll' },
  { gruppe: 'bogen', feld: 'andeutungDeckkraft', von: 0, bis: 0.8, schritt: 0.02, name: 'Deckkraft Andeutung' },
  { gruppe: 'bogen', feld: 'maxBreitePx', von: 0.5, bis: 8, schritt: 0.1, name: 'Strichbreite' },
  { gruppe: 'bogen', feld: 'maxEinzugAnteil', von: 0.2, bis: 0.9, schritt: 0.02, name: 'Bogeneinzug' },
  { gruppe: 'bogen', feld: 'weichzeichnenMaxPx', von: 0, bis: 30, schritt: 1, name: 'Weichzeichnen' },

  { gruppe: 'bewegung', feld: 'verpflichtenMs', von: 120, bis: 800, schritt: 10, name: 'Öffnen (ms)' },
  { gruppe: 'bewegung', feld: 'abbrechenMs', von: 80, bis: 600, schritt: 10, name: 'Zurückfedern (ms)' },
  { gruppe: 'bewegung', feld: 'heimkehrMs', von: 120, bis: 800, schritt: 10, name: 'Heimkehr (ms)' },
  { gruppe: 'bewegung', feld: 'mitteSkalaMin', von: 0.9, bis: 1, schritt: 0.005, name: 'Mitte schrumpft auf' },
  { gruppe: 'bewegung', feld: 'mitteVersatzMaxPx', von: 0, bis: 60, schritt: 1, name: 'Mitte weicht (px)' },
  { gruppe: 'bewegung', feld: 'federHaerte', von: 80, bis: 500, schritt: 10, name: 'Federhärte' },
  { gruppe: 'bewegung', feld: 'federDaempfung', von: 8, bis: 60, schritt: 1, name: 'Dämpfung' },

  { gruppe: 'doppeltipp', feld: 'abstandMs', von: 150, bis: 600, schritt: 10, name: 'Doppeltipp-Fenster' },
  { gruppe: 'doppeltipp', feld: 'maxWegPx', von: 8, bis: 80, schritt: 2, name: 'Doppeltipp-Toleranz' },

  { gruppe: 'langdruck', feld: 'dauerMs', von: 200, bis: 1200, schritt: 25, name: 'Langdruck (ms)' },
  { gruppe: 'langdruck', feld: 'toleranzPx', von: 2, bis: 30, schritt: 1, name: 'Langdruck-Toleranz' },

  /*
   * Der Körper des Buches.
   *
   * `gewicht` steht absichtlich ganz oben: Es ist der einzige Regler hier,
   * der mehrere Dinge zugleich dreht, und meistens der einzige, den man
   * braucht. Die darunter sind zum Nachschärfen, wenn das Gewicht stimmt und
   * trotzdem etwas nicht passt.
   */
  { gruppe: 'buch', feld: 'gewicht', von: 0, bis: 1, schritt: 0.02, name: 'Gewicht' },
  { gruppe: 'buch', feld: 'hub', von: 0, bis: 20, schritt: 0.5, name: 'Hub bei Berührung' },
  { gruppe: 'buch', feld: 'skala', von: 1, bis: 1.05, schritt: 0.002, name: 'Wachsen bei Berührung' },
  { gruppe: 'buch', feld: 'deckelwiderstand', von: 0, bis: 1, schritt: 0.02, name: 'Deckelwiderstand' },
  { gruppe: 'buch', feld: 'deckelWinkelGrad', von: 120, bis: 180, schritt: 1, name: 'Deckelwinkel' },
  { gruppe: 'buch', feld: 'koerpertraegheit', von: 0, bis: 1, schritt: 0.02, name: 'Körperträgheit' },
  { gruppe: 'buch', feld: 'oeffnenMs', von: 300, bis: 1600, schritt: 20, name: 'Öffnen (ms)' },
  { gruppe: 'buch', feld: 'schliessenMs', von: 200, bis: 1200, schritt: 20, name: 'Schließen (ms)' },
  { gruppe: 'buch', feld: 'einrastenMs', von: 100, bis: 700, schritt: 10, name: 'Aufrichten (ms)' },
  { gruppe: 'buch', feld: 'einraststaerke', von: 0, bis: 1, schritt: 0.02, name: 'Einraststärke' },
  { gruppe: 'buch', feld: 'schattenstaerke', von: 0, bis: 1.4, schritt: 0.02, name: 'Schattenstärke' },
  { gruppe: 'buch', feld: 'schattenverzoegerungMs', von: 0, bis: 300, schritt: 5, name: 'Schatten läuft nach (ms)' },

  { gruppe: 'seite', feld: 'wegAnteil', von: 0.2, bis: 1, schritt: 0.02, name: 'Ziehweg (Anteil)' },
  { gruppe: 'seite', feld: 'schwelle', von: 0.15, bis: 0.8, schritt: 0.01, name: 'Umlegen ab' },
  { gruppe: 'seite', feld: 'schnellMindestweg', von: 0.04, bis: 0.5, schritt: 0.01, name: 'Schnellblättern ab' },
  { gruppe: 'seite', feld: 'schnellTempoPxProMs', von: 0.2, bis: 2, schritt: 0.05, name: 'Schnellblättern-Tempo' },
  { gruppe: 'seite', feld: 'totzonePx', von: 0, bis: 40, schritt: 1, name: 'Totzone' },
  { gruppe: 'seite', feld: 'kruemmung', von: 0, bis: 1.4, schritt: 0.02, name: 'Wölbung' },
  { gruppe: 'seite', feld: 'falzstaerke', von: 0, bis: 1.5, schritt: 0.02, name: 'Falzstärke' },
  { gruppe: 'seite', feld: 'schatten', von: 0, bis: 1.4, schritt: 0.02, name: 'Blattschatten' },
  { gruppe: 'seite', feld: 'zurueckMs', von: 100, bis: 700, schritt: 10, name: 'Zurückfedern (ms)' },
  { gruppe: 'seite', feld: 'legenMs', von: 150, bis: 900, schritt: 10, name: 'Umlegen (ms)' },
  { gruppe: 'seite', feld: 'federHaerte', von: 60, bis: 400, schritt: 10, name: 'Federhärte' },
  { gruppe: 'seite', feld: 'federDaempfung', von: 8, bis: 70, schritt: 1, name: 'Dämpfung' },

  /* Wie weit die Oberfläche zurücktritt, wenn niemand etwas tut. */
  { gruppe: 'flaeche', feld: 'ruheNachMs', von: 800, bis: 8000, schritt: 100, name: 'Ruhe nach (ms)' },
  { gruppe: 'flaeche', feld: 'ruheDeckkraft', von: 0.12, bis: 1, schritt: 0.02, name: 'Deutlichkeit in Ruhe' },
  { gruppe: 'flaeche', feld: 'beruhigenMs', von: 200, bis: 2000, schritt: 50, name: 'Beruhigen (ms)' },
  { gruppe: 'flaeche', feld: 'erscheinenMs', von: 60, bis: 600, schritt: 10, name: 'Erscheinen (ms)' },

  /*
   * Die Charakterseite.
   *
   * Der Auftrag verlangt hier ausdrücklich Architektur und nicht Fülle:
   * „Noch nicht hunderte Regler bauen." Also die sechs, die den Gesamteindruck
   * tragen – wie laut das Gold ist, wie deutlich die Kanten sprechen, wie tief
   * der Grund wirkt. Was zu *einem* Bildnis gehört, steht bewusst nicht hier,
   * sondern am Eintrag: Der Zuschnitt eines Porträts ist keine Stimmung des
   * Buches, sondern eine Eigenschaft dieses Bildes.
   */
  { gruppe: 'figur', feld: 'namensgroesse', von: 20, bis: 48, schritt: 1, name: 'Name (Punkte)' },
  { gruppe: 'figur', feld: 'hinweisstaerke', von: 0, bis: 1, schritt: 0.05, name: 'Tiefenhinweise' },
  { gruppe: 'figur', feld: 'goldstaerke', von: 0.2, bis: 1, schritt: 0.05, name: 'Goldstärke' },
  { gruppe: 'figur', feld: 'linienstaerke', von: 0, bis: 1, schritt: 0.05, name: 'Linien' },
  { gruppe: 'figur', feld: 'grundtiefe', von: 0, bis: 1, schritt: 0.05, name: 'Grundtiefe' },
  { gruppe: 'figur', feld: 'kornstaerke', von: 0, bis: 1, schritt: 0.05, name: 'Korn' },
  { gruppe: 'figur', feld: 'registerbreite', von: 0, bis: 96, schritt: 2, name: 'Registerkante' },
];

/**
 * Welche Gruppen das Zimmer zeigt – abgeleitet, nicht aufgezählt.
 *
 * Hier stand die Liste einmal wörtlich im Renderer. Das hieß: Jede neue
 * Gruppe kostete zwei Änderungen an zwei Stellen, und wer die zweite vergaß,
 * bekam Regler, die es gab und die niemand sah. Genau die Art Fehler, die man
 * nicht sucht, weil nichts kaputt aussieht.
 *
 * Jetzt entsteht die Reihenfolge aus der Tabelle selbst: Eine Gruppe
 * existiert, sobald sie einen Regler hat. Für KARTE, WERK und ÜBERGÄNGE sind
 * noch keine Regler da – und deshalb sind sie hier auch nicht. Das ist die
 * Vorbereitung, um die es geht: Die spätere Erweiterung braucht eine Zeile in
 * der Tabelle und **keinen Umbau**.
 */
const GRUPPEN = REGLER.reduce<Gruppe[]>(
  (aus, r) => (aus.includes(r.gruppe) ? aus : [...aus, r.gruppe]),
  [],
);

const SCHALTER: { feld: keyof Raumkonfig['haptik']; name: string }[] = [
  { feld: 'andeutung', name: 'Haptik bei Andeutung' },
  { feld: 'verpflichtung', name: 'Haptik bei Schwelle' },
  { feld: 'einrasten', name: 'Haptik beim Einrasten' },
  { feld: 'heimkehr', name: 'Haptik bei Heimkehr' },
  { feld: 'beruehrung', name: 'Haptik bei Berührung' },
  { feld: 'oeffnen', name: 'Haptik beim Aufschlagen' },
  { feld: 'blattFest', name: 'Haptik beim Umlegen' },
  { feld: 'blattRuht', name: 'Haptik beim Ankommen' },
];

export function InteractionLab() {
  const [offen, setOffen] = useState(false);
  const [, zeichneNeu] = useState(0);

  useEffect(() => beiKonfig(() => zeichneNeu((n) => n + 1)), []);

  if (!laborAn()) return null;

  const k = konfig();
  const lies = (gruppe: Gruppe, feld: string) =>
    (k[gruppe] as unknown as Record<string, number>)[feld];

  const schreibe = (gruppe: Gruppe, feld: string, wert: number) =>
    setzeKonfig({ [gruppe]: { [feld]: wert } } as Partial<Raumkonfig>);

  if (!offen) {
    return (
      <>
        <Sichtfenster />
        <button
          type="button"
          onClick={() => setOffen(true)}
          className="fixed bottom-3 left-3 z-[70] rounded-full bg-black/70 px-3 py-1.5 font-mono text-[11px] text-gild-300"
        >
          LAB
        </button>
      </>
    );
  }

  return (
    <>
      <Sichtfenster />
      <div className="fixed inset-x-0 bottom-0 z-[70] max-h-[72vh] overflow-y-auto rounded-t-2xl bg-black/90 px-4 pb-safe pt-3 font-mono text-[11px] text-paper-300 backdrop-blur">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-gild-300">INTERACTION LAB</span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(alsQuelltext());
            }}
            className="ml-auto flex items-center gap-1 rounded border border-paper-400/25 px-2 py-1"
          >
            <Copy size={11} aria-hidden /> Copy Config
          </button>
          <button type="button" onClick={() => setOffen(false)} className="rounded border border-paper-400/25 p-1">
            <X size={12} aria-hidden />
          </button>
        </div>

        {/*
          Zwei Reihen, zwei Achsen.
          Oben, wie die Bedienung antwortet; darunter, wie sich das Buch
          anfühlt. Sie kreuzen sich frei – ein antwortfreudiger RAUM mit einem
          SCHWEREN Buch ist eine gültige Einstellung und die interessanteste
          Frage, die dieses Zimmer stellen kann.
        */}
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-paper-400/40">RAUM</span>
          {Object.keys(VORLAGEN).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setzeVorlage(name)}
              className="rounded-full border border-gild-500/40 px-3 py-1 text-gild-300"
            >
              {name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setzeVorlage('AUSGEWOGEN')}
            className="rounded-full border border-paper-400/25 px-3 py-1"
          >
            Zurücksetzen
          </button>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-paper-400/40">BUCH</span>
          {Object.keys(BUCHVORLAGEN).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setzeBuchvorlage(name)}
              className={
                buchvorlage() === name
                  ? 'rounded-full border border-gild-400 bg-gild-500/20 px-3 py-1 text-gild-200'
                  : 'rounded-full border border-gild-500/40 px-3 py-1 text-gild-300'
              }
            >
              {name}
            </button>
          ))}
        </div>

        {GRUPPEN.map((gruppe) => (
          <section key={gruppe} className="mb-3">
            <p className="mb-1 uppercase tracking-widest text-paper-400/50">{gruppe}</p>
            {REGLER.filter((r) => r.gruppe === gruppe).map((r) => (
              <label key={r.feld} className="mb-1.5 flex items-center gap-2">
                <span className="w-[42%] shrink-0 truncate">{r.name}</span>
                <input
                  type="range"
                  min={r.von}
                  max={r.bis}
                  step={r.schritt}
                  value={lies(gruppe, r.feld)}
                  onChange={(e) => schreibe(gruppe, r.feld, Number(e.target.value))}
                  className="min-w-0 flex-1"
                />
                <span className="w-12 shrink-0 text-right text-gild-300">
                  {lies(gruppe, r.feld)}
                </span>
              </label>
            ))}
          </section>
        ))}

        <section className="mb-4">
          <p className="mb-1 uppercase tracking-widest text-paper-400/50">feedback</p>
          {SCHALTER.map((s) => (
            <label key={s.feld} className="mb-1 flex items-center gap-2">
              <input
                type="checkbox"
                checked={k.haptik[s.feld]}
                onChange={(e) => setzeKonfig({ haptik: { [s.feld]: e.target.checked } } as Partial<Raumkonfig>)}
              />
              <span>{s.name}</span>
            </label>
          ))}
          <p className="mt-2 leading-relaxed text-paper-400/40">
            Auf iOS Safari gibt es keine Vibration – die Schalter greifen dort ins Leere. Das ist
            kein Fehler dieser Seite, sondern die Plattform. Siehe lib/raum/haptik.ts.
          </p>
        </section>

        <p className="pb-4 leading-relaxed text-paper-400/40">
          Vorgabe zum Vergleich: Öffnen ab {VORGABE.geste.verpflichtung}, Andeutung ab{' '}
          {VORGABE.geste.andeutung}, Heimkehr {VORGABE.bewegung.heimkehrMs} ms. Buch: Gewicht{' '}
          {VORGABE.buch.gewicht}, Deckelwiderstand {VORGABE.buch.deckelwiderstand}, Umlegen ab{' '}
          {VORGABE.seite.schwelle}.
        </p>
      </div>
    </>
  );
}

/**
 * Das Sichtfenster.
 *
 * Was die Geste gerade tut, in Zahlen – und die Randstreifen als sichtbare
 * Balken. Der zweite Teil ist der wichtigere: Ob ein Streifen an der richtigen
 * Stelle liegt und breit genug ist, sieht man in einer Sekunde und errät man
 * sonst nie.
 */
function Sichtfenster() {
  const phase = useRaum((s) => s.phase);
  const gestenrichtung = useRaum((s) => s.gestenrichtung);
  const ort = useRaum((s) => s.ort);
  const tiefe = useRaum((s) => s.tiefe);
  const ankerId = useRaum((s) => s.ankerId);
  const anzeige = useRef<HTMLPreElement>(null);
  const k = konfig();

  /*
   * Die Balken zeigen dasselbe Feld, das die Geste benutzt.
   *
   * Zuerst rechneten sie mit `randEinzugPx` auf allen vier Seiten – und
   * behaupteten damit, oben und unten lägen die Streifen am Bildschirmrand.
   * Genau dort lagen sie eben *nicht*, seit sie den Systemzonen ausweichen.
   * Ein Sichtfenster, das etwas anderes zeigt als das, was gilt, ist
   * schlimmer als keins: Man stimmt dann an einer Zahl, die man gar nicht
   * sieht.
   */
  const [feld, setFeld] = useState(() => fenster());
  useEffect(() => {
    const neu = () => setFeld(fenster());
    neu();
    window.addEventListener('resize', neu);
    window.addEventListener('orientationchange', neu);
    const ab = beiKonfig(neu);
    return () => {
      window.removeEventListener('resize', neu);
      window.removeEventListener('orientationchange', neu);
      ab();
    };
  }, []);

  /*
   * Der Fortschritt kommt aus dem DOM, nicht aus dem Speicher.
   *
   * Das ist kein Trick, sondern die Folge der Bauart: Während einer Geste
   * schreibt die Raumschicht absichtlich *nicht* in den React-Zustand,
   * sondern setzt eine CSS-Variable. Wer den laufenden Wert sehen will, liest
   * ihn dort – so kostet die Anzeige nichts und misst genau das, was auch
   * gezeichnet wird.
   */
  useEffect(() => {
    let laeuft = 0;
    const setze = (name: string, text: string) => {
      const el = anzeige.current?.querySelector(`[data-${name}]`) as HTMLElement | null;
      if (el) el.textContent = text;
    };
    const tick = () => {
      const el = document.querySelector('.dc-schicht') as HTMLElement | null;
      if (el) {
        const roh = Number(getComputedStyle(el).getPropertyValue('--dc-bogen')) || 0;
        /* Zurück auf den Gestenfortschritt – die Schicht rechnet den Einzug ein. */
        setze('weg', ((roh * 0.5) / konfig().bogen.maxEinzugAnteil).toFixed(3));
      }

      /*
       * Das Buch wird genauso gelesen wie der Raum: aus dem DOM.
       *
       * Der laufende Blattwechsel steht absichtlich nirgends im React-Zustand,
       * damit er den Finger nicht ausbremst. Also steht er hier auch nicht
       * darin – die Anzeige holt sich dieselben Zahlen, die auch gezeichnet
       * werden, und kann deshalb gar nicht etwas anderes behaupten.
       */
      const kasten = document.querySelector('.dc-buchkasten') as HTMLElement | null;
      const wurzel = document.documentElement;
      const zustand = wurzel.dataset.buch ?? (kasten ? 'offen' : 'geschlossen');
      const blatt = kasten?.dataset.blatt ?? 'ruhe';
      const stil = kasten ? getComputedStyle(kasten) : null;

      setze('buchzustand', blatt !== 'ruhe' ? `blaettert (${blatt})` : zustand);
      setze(
        'deckel',
        (Number(getComputedStyle(wurzel).getPropertyValue('--dc-buch-fortschritt')) || 0).toFixed(3),
      );
      setze('blattweg', (Number(stil?.getPropertyValue('--dc-blatt')) || 0).toFixed(3));
      setze('blatttempo', (Number(stil?.getPropertyValue('--dc-blatt-tempo')) || 0).toFixed(3));
      setze('seite', wurzel.dataset.seite ?? '—');
      /*
       * Arbeitsraum und Oberflächenzustand – die beiden Angaben, ohne die
       * §8 und §11 nicht prüfbar wären. Beide stehen als Merkmal im DOM und
       * werden hier nur abgelesen; einen Zustandsspeicher dafür gibt es
       * absichtlich nicht.
       */
      const huelle = document.querySelector('[data-flaeche]') as HTMLElement | null;
      /*
       * Die Karte der sichtbaren Seite – der einzige Weg, §8 zu prüfen.
       *
       * Angezeigt wird, welche Richtungen diese Seite überhaupt anbietet und
       * wie weit jede reicht. Eine fehlende Richtung ist eine Aussage: Dort
       * gibt es nichts, und dort passiert deshalb auch nichts.
       */
      const k2 = karteJetzt();
      const wege = (['links', 'rechts', 'oben', 'unten'] as const)
        .map((r) => (k2[r] ? `${r[0]}${k2[r]!.stufen.length}` : `${r[0]}·`))
        .join(' ');
      setze('tiefenkarte', wege);
      setze(
        'flaechenwert',
        `${huelle?.dataset.flaeche ?? '—'} ${
          huelle ? Number(getComputedStyle(huelle).getPropertyValue('--dc-chrome') || 1).toFixed(2) : ''
        }`,
      );

      /*
       * Wem gehört der Finger – abgelesen, nicht behauptet.
       *
       * Diese eine Zeile ist der Grund, warum die Reihenfolge in
       * `useBlaettern` überhaupt prüfbar ist. Steht hier während eines Zugs am
       * Rand „blatt", ist das Ankerprinzip beschädigt, und man sieht es sofort
       * statt es später als „manchmal blättert es falsch" zu erraten.
       */
      const raumPhase = el?.dataset.phase ?? 'ruhe';
      setze(
        'besitzer',
        raumPhase !== 'ruhe' ? 'raum' : blatt !== 'ruhe' ? 'blatt' : 'niemand',
      );

      laeuft = requestAnimationFrame(tick);
    };
    laeuft = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(laeuft);
  }, []);

  const s = { phase, gestenrichtung, ort, tiefe, ankerId };
  const balken = 'pointer-events-none fixed z-[69] bg-gild-400/10 border-gild-400/30';

  return (
    <>
      <div
        className={`${balken} border-r`}
        style={{ left: k.geste.randEinzugPx, width: k.geste.randBreitePx, top: 0, bottom: 0 }}
        aria-hidden
      />
      <div
        className={`${balken} border-l`}
        style={{ right: k.geste.randEinzugPx, width: k.geste.randBreitePx, top: 0, bottom: 0 }}
        aria-hidden
      />
      <div
        className={`${balken} border-b`}
        style={{
          top: k.geste.randEinzugPx + (feld.oben ?? 0),
          height: k.geste.randBreitePx,
          left: 0,
          right: 0,
        }}
        aria-hidden
      />
      <div
        className={`${balken} border-t`}
        style={{
          bottom: k.geste.randEinzugPx + (feld.unten ?? 0),
          height: k.geste.randBreitePx,
          left: 0,
          right: 0,
        }}
        aria-hidden
      />
      <pre
        ref={anzeige}
        className="pointer-events-none fixed right-2 top-2 z-[70] rounded bg-black/70 px-2 py-1 font-mono text-[10px] leading-tight text-gild-300"
      >
        {`phase    ${s.phase}\n`}
        {`richtung ${s.gestenrichtung ?? '—'}\n`}
        {'weg      '}
        <span data-weg>0.000</span>
        {`\nschwelle ${k.geste.verpflichtung}\n`}
        {`ort      ${s.ort}\n`}
        {`tiefe    ${s.tiefe}${s.tiefe > 0 ? ' (depth)' : ''}\n`}
        {`anker    ${s.ankerId ?? '—'}\n`}
        {`sicher   oben ${Math.round(feld.oben ?? 0)} unten ${Math.round(feld.unten ?? 0)}\n`}
        {'—— buch ——\n'}
        {'zustand  '}
        <span data-buchzustand>geschlossen</span>
        {'\ndeckel   '}
        <span data-deckel>0.000</span>
        {'\nblatt    '}
        <span data-blattweg>0.000</span>
        {' @ '}
        <span data-blatttempo>0.000</span>
        {` px/ms\nkippt ab ${k.seite.schwelle}\n`}
        {'seite    '}
        <span data-seite>—</span>
        {'\nfinger   '}
        <span data-besitzer>niemand</span>
        {`\nvorlage  ${buchvorlage()}\n`}
        {'wege     '}
        <span data-tiefenkarte>l· r· o· u·</span>
        {'\nflaeche  '}
        {/*
          Nicht `data-flaeche`: Genau dieses Merkmal trägt die Hülle, deren
          Wert hier abgelesen wird. Ein Anzeigefeld, das auf den eigenen
          Suchausdruck passt, liest irgendwann sich selbst – und zeigt dann
          zuverlässig den Wert an, den es gerade selbst hineingeschrieben hat.
        */}
        <span data-flaechenwert>arbeit</span>
      </pre>
    </>
  );
}
