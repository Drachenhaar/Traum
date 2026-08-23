/** Auswahl von Einträgen – für Verknüpfungen und für Felder vom Typ „entries“. */

import { useMemo, useState } from 'react';
import { Check, Link2, Search } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { Thumb } from '../images/Thumb';
import { useStudio, livingEntries } from '../../store/useStudio';
import { templateFor } from '../../lib/templates';
import { cx } from '../../lib/utils';
import type { EntryType } from '../../types';

export function EntryLinkPicker({
  open,
  onClose,
  selected,
  onChange,
  title = 'Einträge verknüpfen',
  excludeId,
  limitTypes,
}: {
  open: boolean;
  onClose: () => void;
  selected: string[];
  onChange: (ids: string[]) => void;
  title?: string;
  excludeId?: string;
  limitTypes?: EntryType[];
}) {
  const allEntries = useStudio((s) => s.entries);
  const entries = useMemo(() => livingEntries(allEntries), [allEntries]);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<string[]>(selected);

  // Beim Öffnen die aktuelle Auswahl übernehmen.
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setDraft(selected);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .filter((e) => e.id !== excludeId)
      .filter((e) => !limitTypes?.length || limitTypes.includes(e.type))
      .filter((e) =>
        !q
          ? true
          : [e.title, e.subtitle, e.category, ...e.tags].join(' ').toLowerCase().includes(q),
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [entries, query, excludeId, limitTypes]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <span className="mr-auto text-[13px] text-ink-muted">{draft.length} ausgewählt</span>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn-accent"
            onClick={() => {
              onChange(draft);
              onClose();
            }}
          >
            Übernehmen
          </button>
        </>
      }
    >
      <div className="relative mb-4">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          className="input-base pl-10"
          placeholder="Einträge durchsuchen"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="Nichts gefunden"
          message="Es gibt noch keinen passenden Eintrag zum Verknüpfen."
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {filtered.map((e) => {
            const active = draft.includes(e.id);
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => (active ? prev.filter((x) => x !== e.id) : [...prev, e.id]))
                  }
                  className={cx(
                    'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors no-tap-highlight',
                    active ? 'bg-brass-500/10' : 'bg-cream-50 hover:bg-cream-200',
                  )}
                >
                  <Thumb imageId={e.coverImage} alt="" className="h-11 w-11 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] text-ink">{e.title}</span>
                    <span className="block truncate text-[13px] text-ink-muted">
                      {templateFor(e.type).label}
                      {e.category ? ` · ${e.category}` : ''}
                    </span>
                  </span>
                  <span
                    className={cx(
                      'grid h-6 w-6 shrink-0 place-items-center rounded-full border',
                      active ? 'border-brass-500 bg-brass-500 text-paper-50' : 'border-lineStrong',
                    )}
                  >
                    {active && <Check size={14} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
