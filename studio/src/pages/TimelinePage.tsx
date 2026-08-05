/**
 * Die Zeitleiste.
 *
 * Zwei Dinge, die zusammengehören: was zuletzt geschah – und was verworfen
 * wurde. Nichts ist endgültig weg, solange es hier steht. Das nimmt dem
 * Löschen den Schrecken und dem Ausprobieren die Kosten.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, RotateCcw, Trash2 } from 'lucide-react';
import { useStudio } from '../store/useStudio';
import { templateFor } from '../lib/templates';
import { EmptyState } from '../components/ui/EmptyState';
import { Thumb } from '../components/images/Thumb';
import { confirm } from '../components/ui/Confirm';
import { formatDate, formatDateTime, relativeTime } from '../lib/utils';
import type { Revision } from '../types';

const ACTION_LABELS: Record<Revision['action'], string> = {
  created: 'angelegt',
  edited: 'bearbeitet',
  deleted: 'gelöscht',
  restored: 'zurückgeholt',
};

export function TimelinePage() {
  const entries = useStudio((s) => s.entries);
  const recentRevisions = useStudio((s) => s.recentRevisions);
  const restoreRevision = useStudio((s) => s.restoreRevision);
  const restoreEntry = useStudio((s) => s.restoreEntry);
  const purgeEntry = useStudio((s) => s.purgeEntry);

  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [tab, setTab] = useState<'verlauf' | 'papierkorb'>('verlauf');

  const load = useCallback(async () => {
    setRevisions(await recentRevisions(120));
  }, [recentRevisions]);

  useEffect(() => {
    void load();
  }, [load, entries]);

  const trashed = useMemo(
    () => entries.filter((e) => e.deletedAt).sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0)),
    [entries],
  );

  /** Nach Tagen gruppieren – so liest sich der Verlauf wie ein Arbeitsjournal. */
  const days = useMemo(() => {
    const map = new Map<string, Revision[]>();
    for (const rev of revisions) {
      const key = formatDate(rev.at);
      const list = map.get(key);
      if (list) list.push(rev);
      else map.set(key, [rev]);
    }
    return [...map.entries()];
  }, [revisions]);

  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-serif text-[30px] leading-tight text-ink sm:text-[34px]">Zeitleiste</h1>
        <p className="mt-1 max-w-2xl text-[15px] text-ink-muted">
          Jede Fassung bleibt erhalten. Was du löschst, wartet im Papierkorb – nichts geht
          unwiederbringlich verloren.
        </p>
      </header>

      <div className="mb-5 flex gap-1.5">
        <button
          type="button"
          onClick={() => setTab('verlauf')}
          className={tab === 'verlauf' ? 'btn-primary px-4' : 'btn-ghost px-4'}
        >
          Verlauf
        </button>
        <button
          type="button"
          onClick={() => setTab('papierkorb')}
          className={tab === 'papierkorb' ? 'btn-primary px-4' : 'btn-ghost px-4'}
        >
          Papierkorb {trashed.length > 0 && <span className="opacity-70">{trashed.length}</span>}
        </button>
      </div>

      {tab === 'verlauf' ? (
        days.length === 0 ? (
          <EmptyState
            icon={History}
            title="Noch kein Verlauf"
            message="Sobald du an Einträgen arbeitest, sammelt sich hier jede Fassung – und lässt sich zurückholen."
          />
        ) : (
          <div className="space-y-7">
            {days.map(([day, list]) => (
              <section key={day}>
                <h2 className="mb-2.5 text-[13px] font-medium uppercase tracking-wide text-ink-muted">
                  {day}
                </h2>
                <ol className="relative space-y-1.5 border-l border-line pl-4">
                  {list.map((rev) => {
                    const current = byId.get(rev.entryId);
                    const tpl = templateFor(rev.snapshot.type);
                    return (
                      <li key={rev.id} className="relative">
                        <span
                          className="absolute -left-[21px] top-3.5 h-2.5 w-2.5 rounded-full border-2 border-cream-100"
                          style={{ background: tpl.accent }}
                          aria-hidden
                        />
                        <div className="flex items-center gap-3 rounded-xl border border-line bg-cream-50 px-3 py-2">
                          <Thumb imageId={rev.snapshot.coverImage} alt="" className="h-10 w-10 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] text-ink">
                              {current && !current.deletedAt ? (
                                <Link to={`/eintrag/${rev.entryId}`} className="hover:text-brass-600">
                                  {rev.snapshot.title}
                                </Link>
                              ) : (
                                rev.snapshot.title
                              )}
                            </p>
                            <p className="truncate text-[13px] text-ink-muted">
                              {tpl.label} · {ACTION_LABELS[rev.action]} · {relativeTime(rev.at)}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn-ghost h-10 min-h-0 shrink-0 px-2.5 text-[13px]"
                            onClick={async () => {
                              const ok = await confirm({
                                title: 'Diese Fassung zurückholen?',
                                message: `„${rev.snapshot.title}“ wird auf den Stand von ${formatDateTime(rev.at)} zurückgesetzt. Der aktuelle Stand wird vorher gesichert.`,
                                confirmLabel: 'Zurückholen',
                              });
                              if (ok) await restoreRevision(rev.id);
                            }}
                          >
                            <RotateCcw size={15} /> Zurück
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        )
      ) : trashed.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="Der Papierkorb ist leer"
          message="Gelöschte Einträge sammeln sich hier und lassen sich jederzeit zurückholen."
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {trashed.map((entry) => {
            const tpl = templateFor(entry.type);
            return (
              <li key={entry.id} className="flex items-center gap-3 bg-cream-50 px-3 py-2.5">
                <Thumb imageId={entry.coverImage} alt="" className="h-11 w-11 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] text-ink">{entry.title}</p>
                  <p className="truncate text-[13px] text-ink-muted">
                    {tpl.label} · gelöscht {relativeTime(entry.deletedAt ?? 0)}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-ghost h-10 min-h-0 shrink-0 px-3 text-[14px]"
                  onClick={() => void restoreEntry(entry.id)}
                >
                  <RotateCcw size={15} /> Zurückholen
                </button>
                <button
                  type="button"
                  className="btn-danger h-10 min-h-0 shrink-0 px-2.5"
                  aria-label="Endgültig löschen"
                  onClick={async () => {
                    const ok = await confirm({
                      title: `„${entry.title}“ endgültig löschen?`,
                      message:
                        'Der Eintrag wird mit allen Beziehungen und Fassungen entfernt. Das lässt sich nicht rückgängig machen.',
                      confirmLabel: 'Endgültig löschen',
                      danger: true,
                    });
                    if (ok) await purgeEntry(entry.id);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
