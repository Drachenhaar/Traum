/**
 * „Wie hängt das mit … zusammen?“
 *
 * Die Frage, die eine Welt von einer Datenbank unterscheidet. Sie lässt sich
 * nur beantworten, wenn Verbindungen eine Bedeutung tragen – und genau das
 * tun sie hier seit dem ersten Tag. Es gibt deshalb keinen zweiten Graphen
 * und keine Vorberechnung: Der kürzeste Weg wird gesucht, wenn jemand fragt.
 *
 * Gezeigt wird der Weg als Satzfolge, nicht als Liniendiagramm:
 *
 *   König Halvar — herrschte über → Königreich Aschen — enthält → Arven
 *
 * Was hier steht, ist immer wahr, weil jede Kante darin eingetragen wurde.
 * Es wird nichts geschlossen und nichts vermutet – nur nachgegangen.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Route, X } from 'lucide-react';
import type { Entry } from '../../types';
import { useStudio, livingEntries } from '../../store/useStudio';
import { findPath, relationType } from '../../lib/relations';
import { EntryLinkPicker } from '../entry/EntryLinkPicker';

/** Ein Schritt auf dem Weg: „— herrschte über → Königreich Aschen“. */
interface Schritt {
  label: string;
  ziel: Entry;
}

export function Pfad({ entry }: { entry: Entry }) {
  const alleEintraege = useStudio((s) => s.entries);
  const relIndex = useStudio((s) => s.relIndex);

  const entries = useMemo(() => livingEntries(alleEintraege), [alleEintraege]);
  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);

  const [zielId, setZielId] = useState<string | null>(null);
  const [waehlen, setWaehlen] = useState(false);

  const weg = useMemo(() => {
    if (!zielId) return null;
    const ids = findPath(relIndex, entry.id, zielId);
    if (!ids) return null;

    const schritte: Schritt[] = [];
    for (let i = 1; i < ids.length; i++) {
      const ziel = byId.get(ids[i]);
      if (!ziel) return null;
      /*
       * Die Kante zwischen zwei Nachbarn – in der Richtung, in der sie
       * eingetragen wurde, und deshalb mit der richtigen Beschriftung.
       * `findPath` kennt nur Nachbarschaft, nicht Bedeutung.
       */
      const hin = (relIndex.out.get(ids[i - 1]) ?? []).find((r) => r.toId === ids[i]);
      const her = (relIndex.in.get(ids[i - 1]) ?? []).find((r) => r.fromId === ids[i]);
      const def = hin ? relationType(hin.type) : her ? relationType(her.type) : null;
      schritte.push({
        label: def ? (hin ? def.label : def.symmetric ? def.label : def.inverse) : 'hängt zusammen mit',
        ziel,
      });
    }
    return schritte;
  }, [zielId, entry.id, relIndex, byId]);

  const ziel = zielId ? byId.get(zielId) : undefined;

  /* Ohne eine einzige Verbindung gibt es nichts nachzugehen. */
  if (!relIndex.neighbours.get(entry.id)?.size) return null;

  return (
    <section className="mt-8 border-t border-line pt-5">
      {!zielId ? (
        <button
          type="button"
          onClick={() => setWaehlen(true)}
          className="inline-flex min-h-[38px] items-center gap-1.5 font-serif text-[14px] text-ink-faint transition-colors hover:text-gold no-tap-highlight"
        >
          <Route size={13} /> Wie hängt das mit … zusammen?
        </button>
      ) : (
        <>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <p className="rubric">
              {weg ? `${entry.title} und ${ziel?.title ?? '…'}` : 'Kein Weg gefunden'}
            </p>
            <button
              type="button"
              onClick={() => setZielId(null)}
              aria-label="Schließen"
              className="grid h-7 w-7 shrink-0 place-items-center text-ink-faint/40 transition-colors hover:text-ink no-tap-highlight"
            >
              <X size={13} />
            </button>
          </div>

          {weg ? (
            <ol className="font-serif text-[15px] leading-relaxed">
              <li className="text-ink">{entry.title}</li>
              {weg.map((s, i) => (
                <li key={`${s.ziel.id}-${i}`} className="mt-1.5 flex gap-2">
                  <span aria-hidden className="shrink-0 text-ink-faint/45">
                    ↳
                  </span>
                  <span className="min-w-0">
                    <span className="italic text-ink-faint">{s.label}</span>{' '}
                    <Link
                      to={`/eintrag/${s.ziel.id}`}
                      className="text-ink transition-colors hover:text-gold"
                    >
                      {s.ziel.title}
                    </Link>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="font-serif text-[14.5px] italic leading-relaxed text-ink-faint">
              Zwischen „{entry.title}“ und „{ziel?.title}“ führt keine Kette von Verbindungen.
              Das ist keine Lücke – manche Dinge einer Welt haben nichts miteinander zu tun.
            </p>
          )}

          <button
            type="button"
            onClick={() => setWaehlen(true)}
            className="mt-3 font-serif text-[13.5px] text-ink-faint transition-colors hover:text-gold no-tap-highlight"
          >
            Etwas anderes nachschlagen
          </button>
        </>
      )}

      <EntryLinkPicker
        open={waehlen}
        onClose={() => setWaehlen(false)}
        title="Womit vergleichen?"
        selected={zielId ? [zielId] : []}
        excludeId={entry.id}
        onChange={(ids) => setZielId(ids[ids.length - 1] ?? null)}
      />
    </section>
  );
}
