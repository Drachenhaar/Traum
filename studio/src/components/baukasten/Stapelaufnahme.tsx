/**
 * Der Stapel – viele Zeichnungen auf einmal hereinlegen.
 *
 * ---
 *
 * **Erst zeigen, dann tun.**
 *
 * Bei zwanzig Dateien kann man nachsehen, was passiert ist. Bei zweitausend
 * nicht: Wer dort einen falsch benannten Ordner einliest, hat vierhundert
 * Teile in der falschen Schicht und keine Möglichkeit, das von Hand zu
 * berichtigen.
 *
 * Deshalb wird zuerst **gelesen und gezeigt** – wie viele Teile entstehen, in
 * welchen Schichten, was nicht verstanden wurde – und erst auf einen zweiten
 * Handgriff hin wirklich eingelesen. Der Plan kostet nichts: Er liest nur
 * Namen, keine Dateien (siehe `lib/stapel.ts`).
 *
 * ---
 *
 * **Eins nach dem anderen, mit sichtbarem Fortschritt.**
 *
 * Zweitausend Dateien gleichzeitig in den Speicher zu ziehen, bringt den
 * Browser um. Es geht Teil für Teil, und die Zahl daneben läuft mit – nicht
 * als Zierrat, sondern weil ein Vorgang, der zwei Minuten dauert und nichts
 * sagt, von jedem für einen Absturz gehalten wird.
 */

import { useRef, useState } from 'react';
import { Layers } from 'lucide-react';
import { useStudio } from '../../store/useStudio';
import { importImageFiles } from '../../lib/images';
import { auskunft, planIstBrauchbar, planeStapel, type Stapelplan } from '../../lib/stapel';
import { schichtVon, type Ansicht, type Quelle } from '../../lib/baukasten';
import { cx } from '../../lib/utils';

export function Stapelaufnahme() {
  const teilAnlegen = useStudio((s) => s.teilAnlegen);
  const addImages = useStudio((s) => s.addImages);
  const notify = useStudio((s) => s.notify);

  const dateiRef = useRef<HTMLInputElement>(null);
  /** Die gewählten Dateien, nach Namen greifbar. */
  const [dateien, setDateien] = useState<Map<string, File>>(new Map());
  const [plan, setPlan] = useState<Stapelplan | null>(null);
  const [laeuft, setLaeuft] = useState<{ fertig: number; gesamt: number } | null>(null);

  const waehlen = (liste: FileList | null) => {
    if (!liste?.length) return;
    const dateiliste = [...liste];
    setDateien(new Map(dateiliste.map((f) => [f.name, f])));
    setPlan(planeStapel(dateiliste.map((f) => f.name)));
  };

  const verwerfen = () => {
    setDateien(new Map());
    setPlan(null);
    if (dateiRef.current) dateiRef.current.value = '';
  };

  /**
   * Den Plan wirklich ausführen.
   *
   * Teil für Teil: erst die Bilder dieses Teils einlesen, dann das Teil
   * anlegen. Andersherum – alle Bilder zuerst – stünde bei einem Abbruch
   * mitten im Vorgang eine Ablage voller Bilder da, die zu nichts gehören.
   */
  const einlesen = async () => {
    if (!plan) return;
    const brauchbar = plan.plaene.filter(planIstBrauchbar);
    setLaeuft({ fertig: 0, gesamt: brauchbar.length });

    let angelegt = 0;
    const fehlend: string[] = [];
    try {
      for (const teilplan of brauchbar) {
        const ansichten: Partial<Record<Ansicht, Quelle>> = {};

        for (const [ansicht, paar] of Object.entries(teilplan.ansichten) as [
          Ansicht,
          { flaeche?: string; linie?: string },
        ][]) {
          if (!paar.flaeche) continue;
          const flaecheDatei = dateien.get(paar.flaeche);
          if (!flaecheDatei) {
            fehlend.push(paar.flaeche);
            continue;
          }
          const linieDatei = paar.linie ? dateien.get(paar.linie) : undefined;

          const { metas, errors } = await importImageFiles(
            linieDatei ? [flaecheDatei, linieDatei] : [flaecheDatei],
          );
          addImages(metas);
          for (const fehler of errors) fehlend.push(fehler);
          if (!metas[0]) continue;

          ansichten[ansicht] = {
            art: 'bild',
            bildId: metas[0].id,
            ...(linieDatei && metas[1] ? { linieId: metas[1].id } : {}),
          };
        }

        if (Object.keys(ansichten).length === 0) continue;
        await teilAnlegen({
          schicht: teilplan.schicht,
          name: teilplan.name,
          ansichten,
          /*
           * Wie beim einzelnen Hochladen: zunächst **nicht** tönbar. Eine
           * bunte Zeichnung einzufärben ergibt Matsch, und bei zweihundert
           * Teilen auf einmal wäre das zweihundertmal Matsch.
           */
          toenbar: false,
        });
        angelegt++;
        setLaeuft({ fertig: angelegt, gesamt: brauchbar.length });
      }

      notify(
        `${angelegt} ${angelegt === 1 ? 'Teil' : 'Teile'} in den Baukasten gelegt.`,
        'success',
      );
      if (fehlend.length) {
        notify(`${fehlend.length} Datei(en) liessen sich nicht lesen.`, 'error');
      }
      verwerfen();
    } finally {
      setLaeuft(null);
    }
  };

  const zahlen = plan ? auskunft(plan, dateien.size) : null;

  return (
    <div className="mt-6 border-t border-line pt-4">
      <p className="rubric text-gild-400/70">Stapel einlesen</p>
      <p className="mt-1.5 font-serif text-[12.5px] italic text-ink-faint">
        Viele Zeichnungen auf einmal. Der <strong>Dateiname</strong> sagt, wohin sie gehören:
        {' '}<code className="not-italic">haar_locken_vorn.png</code>. Das erste Wort nennt die
        Schicht, dahinter der Name, dann die Ansicht – und <code className="not-italic">_linie</code>
        {' '}für die Tusche. Ansicht und Tusche dürfen fehlen; dann gilt „von vorn" und „Fläche".
      </p>
      <p className="mt-1 font-serif text-[12.5px] italic text-ink-faint">
        Gleiche Schicht und gleicher Name werden <em>ein</em> Teil mit mehreren Ansichten.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!!laeuft}
          onClick={() => dateiRef.current?.click()}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-gild-500/40 px-4 font-serif text-[13.5px] text-gold transition-colors hover:bg-gild-400/10 disabled:opacity-50 no-tap-highlight"
        >
          <Layers size={15} /> Dateien wählen
        </button>
        {plan && !laeuft && (
          <button
            type="button"
            onClick={verwerfen}
            className="min-h-[36px] font-serif text-[12.5px] italic text-ink-faint transition-colors hover:text-gold no-tap-highlight"
          >
            Verwerfen
          </button>
        )}
        <input
          ref={dateiRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => waehlen(e.target.files)}
        />
      </div>

      {/* --------------------------------------------------- Die Auskunft --- */}
      {zahlen && (
        <div className="mt-4 rounded-[3px] border border-line bg-paper-200/60 p-3">
          <p className="font-serif text-[14px] text-ink">
            <strong>{zahlen.dateien.toLocaleString('de')}</strong> Dateien ergeben{' '}
            <strong>{zahlen.teile.toLocaleString('de')}</strong>{' '}
            {zahlen.teile === 1 ? 'Teil' : 'Teile'}.
          </p>

          {zahlen.jeSchicht.length > 0 && (
            <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-3">
              {zahlen.jeSchicht.map((z) => (
                <li key={z.schicht} className="font-serif text-[12.5px] text-ink-faint">
                  {schichtVon(z.schicht)?.label}
                  <span className="text-gold"> {z.anzahl}</span>
                </li>
              ))}
            </ul>
          )}

          {/*
            Was nicht klappt, steht **hier** und nicht in einer Meldung, die
            nach drei Sekunden verschwindet: Es ist der Grund, den Stapel noch
            einmal umzubenennen, bevor man ihn einliest.
          */}
          {(zahlen.unklar > 0 || zahlen.doppelt > 0 || zahlen.ohneFlaeche > 0) && (
            <div className="mt-3 border-t border-line pt-2">
              {zahlen.unklar > 0 && (
                <Hinweis
                  zahl={zahlen.unklar}
                  wort="nicht zu deuten – das erste Wort nennt keine Schicht"
                  beispiele={plan!.unklar}
                />
              )}
              {zahlen.doppelt > 0 && (
                <Hinweis
                  zahl={zahlen.doppelt}
                  wort="belegen eine Stelle doppelt – nur die erste gilt"
                  beispiele={plan!.doppelt}
                />
              )}
              {zahlen.ohneFlaeche > 0 && (
                <p className="font-serif text-[12.5px] italic text-sanguine">
                  {zahlen.ohneFlaeche} Teil(e) haben nur eine Linie und keine Fläche – sie werden
                  nicht angelegt.
                </p>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!!laeuft || zahlen.teile === 0}
              onClick={() => void einlesen()}
              className={cx(
                'inline-flex min-h-[36px] items-center rounded-full border px-4 font-serif text-[13.5px] transition-colors no-tap-highlight',
                laeuft || zahlen.teile === 0
                  ? 'border-line text-ink-faint/50'
                  : 'border-gild-500/50 text-gold hover:bg-gild-400/10',
              )}
            >
              {laeuft
                ? `${laeuft.fertig} von ${laeuft.gesamt} …`
                : `${zahlen.teile.toLocaleString('de')} Teile einlesen`}
            </button>
            {laeuft && (
              <span className="font-serif text-[12.5px] italic text-ink-faint">
                Bitte die Seite nicht schliessen.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Eine Zeile über das, was nicht klappt – mit den ersten Beispielen. */
function Hinweis({
  zahl,
  wort,
  beispiele,
}: {
  zahl: number;
  wort: string;
  beispiele: string[];
}) {
  return (
    <p className="font-serif text-[12.5px] italic text-ink-faint">
      <span className="text-sanguine">{zahl}</span> {wort}
      {beispiele.length > 0 && (
        <span className="not-italic">
          {' – '}
          <code className="text-[11.5px]">{beispiele.slice(0, 3).join(', ')}</code>
          {beispiele.length > 3 && ` … und ${beispiele.length - 3} weitere`}
        </span>
      )}
    </p>
  );
}
