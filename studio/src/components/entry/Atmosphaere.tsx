/**
 * Die Atmosphäre einer Seite.
 *
 * Zwei Dinge, und beide klein:
 *
 *   **Das Zeichen.** Ein Kreis am Seitenrand. Gefüllt, wenn etwas klingt;
 *   offen, wenn etwas klingen könnte. Antippen hebt an oder lässt verklingen.
 *   Kein Abspielbalken, keine Fortschrittsleiste, keine Titelanzeige – das
 *   Buch bleibt der Hauptdarsteller (§8).
 *
 *   **Das Einlegen.** Unter „Mehr", weil man es einmal tut und danach nie
 *   wieder. Eine Datei wählen, einen Regler für die Lautstärke, ein Schalter
 *   für die Schleife. Mehr Einstellungen wären ein Mischpult.
 *
 * Der wichtigste Satz dieser Datei steht nicht im Code: **Es beginnt nie von
 * selbst, solange die Atmosphäre nicht eingeschaltet ist.** Der Schalter dafür
 * liegt im Kolophon und steht auf aus.
 */

import { useEffect, useRef, useState } from 'react';
import { Circle, CircleDot, Music, Trash2, Upload } from 'lucide-react';
import { useStudio } from '../../store/useStudio';
import { Modal } from '../ui/Modal';
import {
  ATMOSPHAERE_VORGABE,
  anheben,
  klingtGerade,
  verklingenLassen,
} from '../../lib/atmosphaere';
import { cx } from '../../lib/utils';
import type { Entry } from '../../types';

/* ------------------------------------------------------------- Das Zeichen */

/**
 * Der Kreis am Rand.
 *
 * Erscheint nur, wenn diese Seite überhaupt eine Atmosphäre trägt. Eine Seite
 * ohne Klang bekommt kein graues, abgeschaltetes Symbol: Ein Zeichen für
 * „hier ist nichts" ist ein Zeichen zu viel.
 */
export function Atmosphaerenzeichen({ entry }: { entry: Entry }) {
  const settings = useStudio((s) => s.settings);
  const updateSettings = useStudio((s) => s.updateSettings);
  const notify = useStudio((s) => s.notify);
  const [klingt, setKlingt] = useState(false);

  const a = entry.atmosphaere;
  const an = settings.atmosphaereAn === true;

  /*
   * Von selbst anheben – aber nur, wenn alle drei zustimmen: der Schalter am
   * Geraet, die Seite, und der Browser. Beim Verlassen verklingt es wieder.
   */
  useEffect(() => {
    if (!a || !an || !a.vonSelbst) return;
    let lebt = true;
    void anheben(a).then((ok) => {
      if (lebt) setKlingt(ok);
    });
    return () => {
      lebt = false;
      verklingenLassen(a.ausblenden);
      setKlingt(false);
    };
  }, [a, an]);

  /* Was gerade wirklich klingt – der Spieler weiss es besser als wir. */
  useEffect(() => {
    const id = setInterval(() => setKlingt(klingtGerade() === a?.klangId), 400);
    return () => clearInterval(id);
  }, [a?.klangId]);

  if (!a) return null;

  const umschalten = () => {
    if (klingt) {
      verklingenLassen(a.ausblenden);
      setKlingt(false);
      return;
    }
    /*
     * Wer hier tippt, will hoeren – und hat damit zugleich die Beruehrung
     * geliefert, die der Browser verlangt. Ist die Atmosphaere am Geraet aus,
     * schalten wir sie mit ein: Das ist kein Uebergriff, sondern genau das,
     * wonach gerade gefragt wurde.
     */
    if (!an) updateSettings({ atmosphaereAn: true });
    void anheben(a).then((ok) => {
      setKlingt(ok);
      if (!ok) notify('Der Klang ließ sich nicht abspielen – fehlt die Datei?', 'error');
    });
  };

  const Zeichen = klingt ? CircleDot : Circle;

  return (
    <button
      type="button"
      onClick={umschalten}
      aria-label={klingt ? 'Atmosphäre verklingen lassen' : 'Atmosphäre anheben'}
      title={klingt ? 'Atmosphäre · klingt' : 'Atmosphäre'}
      data-leitfaden="atmosphaere"
      className={cx(
        'grid h-9 w-9 place-items-center transition-colors no-tap-highlight',
        klingt ? 'text-gild-500' : 'text-ink-faint/35 hover:text-gold-hell',
      )}
    >
      <Zeichen size={15} strokeWidth={1.6} />
    </button>
  );
}

/* ------------------------------------------------------------ Das Einlegen */

export function Atmosphaerenwahl({
  entry,
  offen,
  onSchliessen,
}: {
  entry: Entry;
  offen: boolean;
  onSchliessen: () => void;
}) {
  const klaenge = useStudio((s) => s.klaenge);
  const legeKlang = useStudio((s) => s.legeKlang);
  const entferneKlang = useStudio((s) => s.entferneKlang);
  const updateEntry = useStudio((s) => s.updateEntry);
  const dateiRef = useRef<HTMLInputElement>(null);
  const [laedt, setLaedt] = useState(false);

  const a = entry.atmosphaere;

  const waehle = (klangId: string) =>
    updateEntry(entry.id, {
      atmosphaere: { ...ATMOSPHAERE_VORGABE, ...a, klangId },
    });

  const aendere = (patch: Partial<NonNullable<Entry['atmosphaere']>>) => {
    if (!a) return;
    updateEntry(entry.id, { atmosphaere: { ...a, ...patch } });
  };

  const einlegen = async (datei: File | undefined) => {
    if (!datei) return;
    setLaedt(true);
    try {
      const k = await legeKlang(datei);
      if (k) waehle(k.id);
    } finally {
      setLaedt(false);
      if (dateiRef.current) dateiRef.current.value = '';
    }
  };

  return (
    <Modal
      open={offen}
      onClose={onSchliessen}
      title="Atmosphäre"
      description={`Wie „${entry.title}“ klingt`}
      size="sm"
    >
      <p className="mb-5 text-[14.5px] leading-relaxed text-ink-muted">
        Ein Geräusch, das anhebt, während man diese Seite liest – Wind, Wasser, das Knarren von
        Holz. Es beginnt nur, wenn die Atmosphäre im Kolophon eingeschaltet ist, und verklingt
        beim Umblättern von selbst.
      </p>

      {/* -------------------------------------------------- Was schon da ist */}
      {klaenge.length > 0 && (
        <ul className="mb-5 space-y-1">
          {klaenge.map((k) => (
            <li key={k.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => waehle(k.id)}
                className={cx(
                  'flex min-h-[38px] flex-1 items-center gap-2 rounded-md px-2 text-left text-[14.5px] transition-colors',
                  a?.klangId === k.id
                    ? 'bg-brass-400/10 text-ink'
                    : 'text-ink-muted hover:bg-cream-100',
                )}
              >
                <Music size={13} className="shrink-0 text-ink-faint" />
                <span className="min-w-0 flex-1 truncate">{k.title}</span>
                {k.dauer !== undefined && (
                  <span className="shrink-0 text-[12px] tabular-nums text-ink-faint">
                    {Math.round(k.dauer)}s
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => void entferneKlang(k.id)}
                aria-label={`„${k.title}“ entfernen`}
                className="grid h-8 w-8 place-items-center text-ink-faint/50 transition-colors hover:text-red-700 no-tap-highlight"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => dateiRef.current?.click()}
        disabled={laedt}
        className="btn-ghost w-full justify-center"
      >
        <Upload size={16} /> {laedt ? 'Wird eingelegt …' : 'Einen Klang einlegen'}
      </button>
      <input
        ref={dateiRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => void einlegen(e.target.files?.[0])}
      />

      {/* ------------------------------------------------- Wie er klingen soll */}
      {a && (
        <div className="mt-6 border-t border-line pt-5">
          <label className="block">
            <span className="text-[13.5px] text-ink-muted">Lautstärke</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(a.lautstaerke * 100)}
              onChange={(e) => aendere({ lautstaerke: Number(e.target.value) / 100 })}
              className="mt-1 h-9 w-full cursor-pointer accent-brass-500"
            />
          </label>

          <div className="mt-3 space-y-2">
            <label className="flex min-h-[34px] items-center gap-2 text-[14px] text-ink-muted">
              <input
                type="checkbox"
                checked={a.schleife}
                onChange={(e) => aendere({ schleife: e.target.checked })}
                className="accent-brass-500"
              />
              Endlos wiederholen
            </label>
            <label className="flex min-h-[34px] items-center gap-2 text-[14px] text-ink-muted">
              <input
                type="checkbox"
                checked={a.vonSelbst}
                onChange={(e) => aendere({ vonSelbst: e.target.checked })}
                className="accent-brass-500"
              />
              Beim Aufschlagen von selbst anheben
            </label>
          </div>

          <button
            type="button"
            onClick={() => updateEntry(entry.id, { atmosphaere: undefined })}
            className="mt-5 min-h-[34px] text-[13.5px] italic text-ink-faint transition-colors hover:text-red-700"
          >
            Diese Seite wieder still machen
          </button>
        </div>
      )}
    </Modal>
  );
}
