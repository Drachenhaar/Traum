/**
 * Der Charakterspiegel.
 *
 * Kein Persönlichkeitstest. Er diagnostiziert nicht, bewertet nicht und
 * behauptet nicht zu wissen, wer ein Mensch ist. Er betrachtet ausschliesslich
 * das Werk und macht sichtbar, was darin wiederkehrt.
 *
 * Drei Dinge machen den Unterschied zwischen einem Werkzeug und einer
 * Anmassung, und alle drei stehen hier im Code und nicht nur im Text:
 *
 *  - **Er spricht nie über den Verfasser.** Alle Sätze kommen aus den Regeln,
 *    und keine Regel kennt eine Formulierung, die mit „du bist“ beginnt.
 *  - **Nichts ohne Grundlage.** Jede Beobachtung lässt sich aufklappen und
 *    zeigt die Seiten, auf denen sie beruht. Keine Blackbox.
 *  - **Er lässt sich abschalten.** Vollständig, ohne Nachfrage.
 *
 * Und er schweigt, solange er zu wenig gesehen hat.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Eye, EyeOff } from 'lucide-react';
import { useStudio, livingEntries } from '../../store/useStudio';
import { spiegle, tiefeSpiegelung, type Beobachtung } from '../../lib/spiegel/regeln';
import { reife } from '../../lib/spiegel/schwelle';
import { templateFor } from '../../lib/templates';
import { AppendixSheet } from './Appendix';
import { cx } from '../../lib/utils';

/* Der Satz, der zum Spiegel gehört. Keine Erklärung, keine Funktion. */
const SPRUCH =
  'Eine Welt zeigt nicht, wer ihr Schöpfer ist. Aber manchmal zeigt sie ihm etwas, das er noch nicht gesehen hat.';

const ANKUENDIGUNG = ['Der Spiegel betrachtet nicht dich.', 'Er betrachtet, was du erschaffen hast.'];

export function SpiegelSheet() {
  const entries = useStudio((s) => s.entries);
  const relations = useStudio((s) => s.relations);
  const settings = useStudio((s) => s.settings);
  const updateSettings = useStudio((s) => s.updateSettings);

  const lebendig = useMemo(() => livingEntries(entries), [entries]);
  const grad = reife(lebendig.length);

  const beobachtungen = useMemo(
    () => (grad.grad === 'zu-jung' ? [] : spiegle({ entries: lebendig, relations })),
    [lebendig, relations, grad.grad],
  );

  const tief = useMemo(
    () => tiefeSpiegelung(beobachtungen, { entries: lebendig, relations }),
    [beobachtungen, lebendig, relations],
  );

  /*
   * Die Ankündigung erscheint vor den Beobachtungen – kurz, und überspringbar
   * durch eine Berührung. Wer arbeiten will, soll nicht warten müssen.
   */
  const [gezeigt, setGezeigt] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setGezeigt(true), 2600);
    return () => window.clearTimeout(t);
  }, []);

  /*
   * Frühere Spiegelungen festhalten – höchstens eine je Monat, damit daraus
   * eine Chronik wird und kein Protokoll.
   */
  useEffect(() => {
    if (settings.spiegelAus || grad.grad === 'zu-jung' || beobachtungen.length === 0) return;
    const verlauf = settings.spiegelVerlauf ?? [];
    const letzte = verlauf[verlauf.length - 1];
    const monat = 1000 * 60 * 60 * 24 * 30;
    if (letzte && Date.now() - letzte.at < monat) return;

    const motive = beobachtungen.filter((b) => b.zweck === 'muster').slice(0, 3).map((b) => b.motiv);
    if (motive.length === 0) return;
    updateSettings({
      spiegelVerlauf: [...verlauf, { at: Date.now(), motive }].slice(-24),
    });
    // Nur beim Öffnen der Seite festhalten, nicht bei jeder Neuzeichnung.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (settings.spiegelAus) {
    return (
      <AppendixSheet title="Der Spiegel" rubric="Anhang · Was wiederkehrt">
        <div className="max-w-[46ch]">
          <p className="prose-book">Der Spiegel ist abgeschaltet. Er sieht nichts an.</p>
          <button
            type="button"
            onClick={() => updateSettings({ spiegelAus: false })}
            className="mt-6 inline-flex min-h-[44px] items-center gap-2 font-serif text-[15px] text-gold no-tap-highlight"
          >
            <Eye size={15} /> Wieder einschalten
          </button>
        </div>
      </AppendixSheet>
    );
  }

  return (
    <AppendixSheet title="Der Spiegel" rubric="Anhang · Was wiederkehrt">
      {/*
       * Die dunklere Seite. Kein spiegelndes Glas, kein Gesicht – ein Papier,
       * das etwas mehr Licht schluckt als das übrige Buch.
       */}
      <div
        className="relative -mx-3 rounded-[2px] px-3 py-7 sm:-mx-6 sm:px-6"
        style={{
          background:
            'linear-gradient(170deg, rgba(60,44,26,0.09) 0%, rgba(60,44,26,0.05) 40%, rgba(60,44,26,0.11) 100%)',
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[2px]"
          style={{
            background:
              'radial-gradient(120% 60% at 22% 0%, rgba(255,250,235,0.35) 0%, transparent 60%)',
          }}
        />

        <div className="relative">
          {/* ------------------------------------------------ Ankündigung */}
          <button
            type="button"
            onClick={() => setGezeigt(true)}
            className={cx(
              'block w-full text-left transition-opacity duration-700 no-tap-highlight',
              gezeigt ? 'pointer-events-none opacity-0' : 'opacity-100',
            )}
            style={{ height: gezeigt ? 0 : undefined, overflow: 'hidden' }}
          >
            {ANKUENDIGUNG.map((zeile, i) => (
              <p
                key={zeile}
                className="font-serif text-[17px] leading-relaxed text-ink-muted transition-opacity duration-1000"
                style={{ transitionDelay: `${i * 700}ms`, opacity: gezeigt ? 0 : 1 }}
              >
                {zeile}
              </p>
            ))}
          </button>

          <div
            className="transition-opacity duration-1000"
            style={{ opacity: gezeigt ? 1 : 0 }}
          >
            {grad.grad !== 'reif' && (
              <div className="mb-8 max-w-[46ch]">
                <p className="prose-book">{grad.text}</p>
                {grad.fehlen > 0 && (
                  <p className="mt-2 font-serif text-[13px] italic text-ink-faint">
                    Noch {grad.fehlen} {grad.fehlen === 1 ? 'Seite' : 'Seiten'}.
                  </p>
                )}
              </div>
            )}

            {beobachtungen.length === 0 && grad.grad !== 'zu-jung' && (
              <p className="prose-book max-w-[46ch]">
                Noch hat sich nichts gezeigt, das deutlich genug wäre. Der Spiegel wartet lieber,
                als etwas zu behaupten.
              </p>
            )}

            {/* ------------------------------------------- Beobachtungen */}
            <ul className="space-y-7">
              {beobachtungen.map((b) => (
                <Spiegelung key={b.id} b={b} tief={tief?.id === b.id} />
              ))}
            </ul>

            {/* --------------------------------------- Frühere Spiegelungen */}
            {(settings.spiegelVerlauf?.length ?? 0) > 1 && (
              <section className="mt-12 border-t border-line/70 pt-6">
                <p className="rubric mb-3">Frühere Spiegelungen</p>
                <ul className="space-y-1.5">
                  {[...(settings.spiegelVerlauf ?? [])]
                    .slice(0, -1)
                    .reverse()
                    .slice(0, 6)
                    .map((v) => (
                      <li
                        key={v.at}
                        className="font-serif text-[13.5px] leading-relaxed text-ink-faint"
                      >
                        <span className="tabular-nums">
                          {new Date(v.at).toLocaleDateString('de-DE', {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                        {' — '}
                        {v.motive.join(', ')}
                      </li>
                    ))}
                </ul>
              </section>
            )}

            {/* ------------------------------------------------ Abschalten */}
            <div className="mt-12 border-t border-line/70 pt-5">
              <button
                type="button"
                onClick={() => updateSettings({ spiegelAus: true })}
                className="inline-flex min-h-[44px] items-center gap-2 font-serif text-[13.5px] italic text-ink-faint transition-colors hover:text-ink-muted no-tap-highlight"
              >
                <EyeOff size={14} /> Den Spiegel abschalten
              </button>
              <p className="mt-1 max-w-[48ch] font-serif text-[12.5px] italic leading-relaxed text-ink-faint/70">
                Alles hier entsteht auf diesem Gerät, aus deinen eigenen Seiten. Nichts wird
                gesendet, nichts bewertet, nichts verglichen.
              </p>
            </div>

            {/* Der Satz, der zum Spiegel gehört. */}
            <p className="mt-10 max-w-[52ch] font-serif text-[11.5px] italic leading-relaxed text-ink-faint/55">
              {SPRUCH}
            </p>
          </div>
        </div>
      </div>
    </AppendixSheet>
  );
}

/* ------------------------------------------------------------ Eine davon */

function Spiegelung({ b, tief }: { b: Beobachtung; tief: boolean }) {
  const entries = useStudio((s) => s.entries);
  const [offen, setOffen] = useState(false);

  const belegte = useMemo(
    () =>
      b.belege
        .map((id) => entries.find((e) => e.id === id))
        .filter((e): e is NonNullable<typeof e> => !!e),
    [b.belege, entries],
  );

  return (
    <li>
      {tief && (
        /* Die tiefe Spiegelung. Kein Abzeichen, keine Feier – eine Zeile. */
        <p className="mb-1 font-serif text-[11px] tracking-[0.2em] text-gold/80">
          TIEFE SPIEGELUNG
        </p>
      )}

      <p className="rubric mb-1">{b.motiv}</p>
      <p className="font-serif text-[16px] leading-relaxed text-ink">{b.text}</p>

      <button
        type="button"
        onClick={() => setOffen((o) => !o)}
        aria-expanded={offen}
        className="mt-2 inline-flex min-h-[38px] items-center gap-1 font-serif text-[13px] italic text-gold transition-colors hover:text-gold-hell no-tap-highlight"
      >
        Zeige Grundlage
        <ChevronDown
          size={13}
          className={cx('transition-transform duration-300', offen && 'rotate-180')}
        />
      </button>

      {offen && (
        <div className="mt-2 border-l border-lineStrong pl-4">
          <p className="font-serif text-[13px] italic leading-relaxed text-ink-faint">
            {b.herkunft}
          </p>
          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
            {belegte.slice(0, 24).map((e) => (
              <li key={e.id}>
                <Link
                  to={`/eintrag/${e.id}`}
                  className="font-serif text-[13.5px] text-ink-muted transition-colors hover:text-gold no-tap-highlight"
                >
                  {e.title}
                  <span className="ml-1 text-[11px] text-ink-faint/70">
                    {templateFor(e.type).label}
                  </span>
                </Link>
              </li>
            ))}
            {belegte.length > 24 && (
              <li className="font-serif text-[13px] italic text-ink-faint">
                … und {belegte.length - 24} weitere
              </li>
            )}
          </ul>
          <Link
            to="/karte"
            className="mt-3 inline-flex min-h-[38px] items-center font-serif text-[13px] italic text-gold no-tap-highlight"
          >
            Verbindungen ansehen
          </Link>
        </div>
      )}
    </li>
  );
}
