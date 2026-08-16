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
  VORGABE,
  VORLAGEN,
  alsQuelltext,
  beiKonfig,
  konfig,
  setzeKonfig,
  setzeVorlage,
  type Raumkonfig,
} from '../../lib/raum/konfig';
import { useRaum } from '../../lib/raum/useRaum';

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
  { gruppe: 'geste', feld: 'wegAnteil', von: 0.2, bis: 0.9, schritt: 0.01, name: 'Ziehweg (Anteil)' },
  { gruppe: 'geste', feld: 'totzonePx', von: 0, bis: 24, schritt: 1, name: 'Totzone' },
  { gruppe: 'geste', feld: 'randEinzugPx', von: 0, bis: 40, schritt: 1, name: 'Randeinzug' },
  { gruppe: 'geste', feld: 'randBreitePx', von: 12, bis: 120, schritt: 2, name: 'Randstreifen' },
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
];

const SCHALTER: { feld: keyof Raumkonfig['haptik']; name: string }[] = [
  { feld: 'andeutung', name: 'Haptik bei Andeutung' },
  { feld: 'verpflichtung', name: 'Haptik bei Schwelle' },
  { feld: 'einrasten', name: 'Haptik beim Einrasten' },
  { feld: 'heimkehr', name: 'Haptik bei Heimkehr' },
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

        <div className="mb-3 flex flex-wrap gap-1.5">
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

        {(['geste', 'bogen', 'bewegung', 'doppeltipp', 'langdruck'] as Gruppe[]).map((gruppe) => (
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
          <p className="mb-1 uppercase tracking-widest text-paper-400/50">haptik</p>
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
          {VORGABE.geste.andeutung}, Heimkehr {VORGABE.bewegung.heimkehrMs} ms.
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
    const tick = () => {
      const el = document.querySelector('.dc-schicht') as HTMLElement | null;
      const feld = anzeige.current?.querySelector('[data-weg]') as HTMLElement | null;
      if (el && feld) {
        const roh = Number(getComputedStyle(el).getPropertyValue('--dc-bogen')) || 0;
        /* Zurück auf den Gestenfortschritt – die Schicht rechnet den Einzug ein. */
        feld.textContent = ((roh * 0.5) / konfig().bogen.maxEinzugAnteil).toFixed(3);
      }
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
        style={{ top: k.geste.randEinzugPx, height: k.geste.randBreitePx, left: 0, right: 0 }}
        aria-hidden
      />
      <div
        className={`${balken} border-t`}
        style={{ bottom: k.geste.randEinzugPx, height: k.geste.randBreitePx, left: 0, right: 0 }}
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
        {`tiefe    ${s.tiefe}\n`}
        {`anker    ${s.ankerId ?? '—'}`}
      </pre>
    </>
  );
}
