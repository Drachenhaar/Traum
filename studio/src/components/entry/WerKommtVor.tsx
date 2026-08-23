/**
 * „Wer und was hier vorkommt“.
 *
 * Steht auf jeder Seite, deren Text Namen enthält, und bietet an, was das
 * Buch daraus machen könnte: Bekanntes verbinden, Neues anlegen.
 *
 * Zwei Regeln, die hier wie überall gelten:
 *
 *   Es legt nichts von selbst an. Jeder Fund zeigt den Satz, aus dem er
 *   stammt – wer die Regel für falsch hält, sieht sofort warum.
 *
 *   Es erfindet keine Bedeutung. Beim Verbinden fragt das Buch, *wie* zwei
 *   Dinge zusammenhängen, statt eine beliebige Kante zu ziehen. Eine
 *   Verbindung ohne Bedeutung wäre ein Faden, und Fäden tragen nichts.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Link2 } from 'lucide-react';
import type { Entry } from '../../types';
import { useStudio, livingEntries } from '../../store/useStudio';
import { findeWesen, verbundenMit, type Fund } from '../../lib/erkennung';
import { templateFor, asText } from '../../lib/templates';
import { RelationCreator } from '../relations/RelationCreator';
import { cx } from '../../lib/utils';

/**
 * Woraus gelesen wird: alles, was auf dieser Seite Fliesstext ist.
 *
 * Beschreibung und Prosafelder, nicht Titel oder Schlagworte – dort steht
 * kein Satzbau, an dem sich ein Name erkennen liesse.
 */
function seitenText(entry: Entry): string {
  const tpl = templateFor(entry.type);
  const felder = tpl.fields
    .filter((f) => f.kind === 'textarea')
    .map((f) => asText(entry.fields[f.key]))
    .filter(Boolean);
  return [entry.description, ...felder].filter(Boolean).join('\n\n');
}

export function WerKommtVor({ entry }: { entry: Entry }) {
  const alleEintraege = useStudio((s) => s.entries);
  const relations = useStudio((s) => s.relations);
  const createEntry = useStudio((s) => s.createEntry);
  const notify = useStudio((s) => s.notify);

  const [abgelehnt, setAbgelehnt] = useState<Set<string>>(new Set());
  /** Welcher Eintrag soll verbunden werden? `null` heisst: Blatt zu. */
  const [verbinden, setVerbinden] = useState<string | null>(null);

  const entries = useMemo(() => livingEntries(alleEintraege), [alleEintraege]);
  const text = useMemo(() => seitenText(entry), [entry]);

  const funde = useMemo(
    () => findeWesen(text, entries, entry.id, verbundenMit(relations, entry.id)),
    [text, entries, entry.id, relations],
  );

  const offen = funde.filter((f) => !abgelehnt.has(f.id));
  if (offen.length === 0) return null;

  const ablehnen = (f: Fund) => setAbgelehnt((s) => new Set(s).add(f.id));

  /*
   * Anlegen laesst die Zeile stehen.
   *
   * Vorher verschwand sie – und mit ihr der Weg zum Verbinden, der doch
   * genau der naechste Schritt ist. Jetzt gibt es den Eintrag, die
   * Erkennung findet ihn beim naechsten Zeichnen als bekannt, und aus
   * „Anlegen" wird „Verbinden".
   */
  const anlegen = (f: Fund) => {
    void createEntry(f.type, { title: f.name })
      .then((neu) => {
        notify(`„${f.name}" steht jetzt im Buch.`, 'success');
        setVerbinden(neu.id);
      })
      .catch((err) => notify(`Nicht angelegt: ${(err as Error).message}`, 'error'));
  };

  return (
    <>
      <section className="mt-8 border-t border-line pt-5">
        <p className="rubric mb-1">Wer und was hier vorkommt</p>
        <p className="mb-4 font-serif text-[12.5px] italic leading-relaxed text-ink-faint/85">
          Aus deinem Text gelesen – am Satzbau, nicht am Sinn. Nichts davon
          geschieht von selbst.
        </p>

        <ul>
          {offen.map((f) => (
            <li key={f.id} className="mb-4 last:mb-0">
              <div className="flex flex-wrap items-baseline gap-x-2">
                {f.vorhandenId ? (
                  <Link
                    to={`/eintrag/${f.vorhandenId}`}
                    className="font-serif text-[16px] text-ink transition-colors hover:text-gold"
                  >
                    {f.name}
                  </Link>
                ) : (
                  <span className="font-serif text-[16px] text-ink">{f.name}</span>
                )}
                <span className="font-serif text-[12.5px] text-ink-faint/70">
                  {f.vorhandenId ? 'steht schon im Buch' : templateFor(f.type).label}
                </span>
              </div>

              {/* Der Beleg. Ohne ihn waere es eine Behauptung. */}
              {f.satz && (
                <p className="mt-0.5 font-serif text-[12.5px] italic leading-relaxed text-ink-faint">
                  „{f.satz.length > 130 ? `${f.satz.slice(0, 128).trimEnd()}…` : f.satz}“
                </p>
              )}

              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {f.vorhandenId ? (
                  <Knopf onClick={() => setVerbinden(f.vorhandenId!)}>
                    <Link2 size={12} /> Verbinden
                  </Knopf>
                ) : (
                  <Knopf onClick={() => anlegen(f)}>
                    <Plus size={12} /> Als {templateFor(f.type).label} anlegen
                  </Knopf>
                )}
                <button
                  type="button"
                  onClick={() => ablehnen(f)}
                  className="inline-flex min-h-[32px] items-center rounded-full px-3 font-serif text-[13px] text-ink-faint transition-colors hover:text-ink no-tap-highlight"
                >
                  Nicht nötig
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/*
        Verbunden wird über den gewöhnlichen Weg – mit der Frage nach der
        Bedeutung. Hier eine Kantenart zu raten wäre bequem und falsch: „lebt
        in“ und „gehört zu“ sind nicht dasselbe, und der Weltgraph lebt genau
        von diesem Unterschied.
      */}
      <RelationCreator
        open={verbinden !== null}
        onClose={() => setVerbinden(null)}
        entry={entry}
        presetPicked={verbinden ? [verbinden] : []}
      />
    </>
  );
}

function Knopf({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-gild-500/40 px-3',
        'font-serif text-[13px] text-gold transition-colors hover:bg-gild-400/10 no-tap-highlight',
      )}
    >
      {children}
    </button>
  );
}
