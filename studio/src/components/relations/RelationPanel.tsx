/**
 * Die Beziehungen eines Eintrags – gruppiert, lesbar, veränderbar.
 *
 * Darunter: „Vielleicht gehört das zusammen“. Das sind Einträge im zweiten
 * Grad – noch nicht verbunden, aber schon in der Nähe. Genau dort entstehen
 * die Momente, in denen die Welt dem Nutzer etwas über sich selbst erzählt.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, Link2, Plus, Sparkle, X } from 'lucide-react';
import type { Entry } from '../../types';
import { useStudio } from '../../store/useStudio';
import { discoverRelated, groupRelations, relationsOf } from '../../lib/relations';
import { templateFor } from '../../lib/templates';
import { RelationCreator } from './RelationCreator';
import { Thumb } from '../images/Thumb';
import { cx } from '../../lib/utils';

export function RelationPanel({ entry }: { entry: Entry }) {
  const entries = useStudio((s) => s.entries);
  const relIndex = useStudio((s) => s.relIndex);
  const removeRelation = useStudio((s) => s.removeRelation);
  const flipRelation = useStudio((s) => s.flipRelation);
  const addRelation = useStudio((s) => s.addRelation);
  const [creatorOpen, setCreatorOpen] = useState(false);

  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);

  const groups = useMemo(() => {
    const list = relationsOf(relIndex, entry.id).filter((r) => {
      const other = byId.get(r.otherId);
      return other && !other.deletedAt;
    });
    return groupRelations(list);
  }, [relIndex, entry.id, byId]);

  const discoveries = useMemo(
    () => discoverRelated(relIndex, entry.id, byId, 5),
    [relIndex, entry.id, byId],
  );

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-serif text-xl text-ink">
          Beziehungen{' '}
          {total > 0 && <span className="text-[15px] font-sans text-ink-faint">· {total}</span>}
        </h2>
        <button
          type="button"
          className="btn-ghost h-10 min-h-0 px-3 text-[14px]"
          onClick={() => setCreatorOpen(true)}
        >
          <Plus size={16} /> Verbinden
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-lineStrong px-4 py-6 text-center">
          <Link2 size={22} className="mx-auto mb-2 text-ink-faint" strokeWidth={1.5} />
          <p className="text-[15px] text-ink-muted">
            Noch nichts verbunden. Ein Eintrag ohne Beziehungen ist ein loses Blatt –
            <br className="hidden sm:block" /> verknüpfe ihn mit einem Ort, einem Material oder einer DNA-Regel.
          </p>
          <button type="button" className="btn-accent mt-4" onClick={() => setCreatorOpen(true)}>
            <Plus size={18} /> Erste Verbindung
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              <p
                className="mb-1.5 text-[13px] font-medium uppercase tracking-wide"
                style={{ color: group.color }}
              >
                {group.label}
              </p>
              <ul className="space-y-1.5">
                {group.items.map((rel) => {
                  const other = byId.get(rel.otherId);
                  if (!other) return null;
                  const tpl = templateFor(other.type);
                  return (
                    <li
                      key={rel.relation.id}
                      className="group flex items-center gap-2.5 rounded-xl border border-line bg-cream-50 py-1.5 pl-2 pr-1 transition-colors hover:border-lineStrong"
                    >
                      <span
                        className="h-9 w-1 shrink-0 rounded-full"
                        style={{ background: group.color }}
                        aria-hidden
                      />
                      <Thumb imageId={other.coverImage} alt="" className="h-9 w-9 shrink-0" />
                      <Link to={`/eintrag/${other.id}`} className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] text-ink transition-colors hover:text-brass-600">
                          {other.title}
                        </span>
                        <span className="flex items-center gap-1.5 truncate text-[13px] text-ink-muted">
                          <span
                            className="inline-block h-2 w-2 shrink-0 rounded-full"
                            style={{ background: tpl.accent }}
                          />
                          {tpl.label}
                        </span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => flipRelation(rel.relation.id)}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-cream-200 hover:text-ink"
                        aria-label="Richtung umkehren"
                        title="Richtung umkehren"
                      >
                        <ArrowLeftRight size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRelation(rel.relation.id)}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-cream-200 hover:text-red-700"
                        aria-label="Verbindung lösen"
                      >
                        <X size={16} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------- Entdeckungen */}
      {discoveries.length > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-medium uppercase tracking-wide text-brass-600">
            <Sparkle size={14} /> Vielleicht gehört das zusammen
          </p>
          <ul className="space-y-1.5">
            {discoveries.map((d) => {
              const other = byId.get(d.entryId);
              if (!other) return null;
              const tpl = templateFor(other.type);
              return (
                <li
                  key={d.entryId}
                  className="flex items-center gap-2.5 rounded-xl border border-dashed border-lineStrong bg-cream-50/60 py-1.5 pl-2.5 pr-1"
                >
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: tpl.accent }}
                  />
                  <Link to={`/eintrag/${other.id}`} className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-ink hover:text-brass-600">
                      {other.title}
                    </span>
                    <span className="block truncate text-[13px] text-ink-faint">{d.path}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => addRelation(entry.id, other.id, 'related')}
                    className={cx(
                      'btn-ghost h-9 min-h-0 shrink-0 px-2.5 text-[13px]',
                    )}
                  >
                    Verbinden
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <RelationCreator open={creatorOpen} onClose={() => setCreatorOpen(false)} entry={entry} />
    </section>
  );
}
