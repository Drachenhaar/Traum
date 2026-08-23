/**
 * Bildauswahl: vorhandene Bilder aus der Mediathek wählen oder neue importieren.
 * Wird von Blöcken, Cover-Auswahl und den Vorlagenfeldern genutzt.
 */

import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Thumb } from './Thumb';
import { ImageUploadButton } from './ImageUploadButton';
import { EmptyState } from '../ui/EmptyState';
import { useStudio } from '../../store/useStudio';
import { cx } from '../../lib/utils';
import { Images } from 'lucide-react';

export function ImagePicker({
  open,
  onClose,
  onSelect,
  multiple = false,
  title = 'Bild auswählen',
  initiallySelected = [],
}: {
  open: boolean;
  onClose: () => void;
  /** Liefert die IDs der gewählten Bilder zurück. */
  onSelect: (ids: string[]) => void;
  multiple?: boolean;
  title?: string;
  initiallySelected?: string[];
}) {
  const images = useStudio((s) => s.images);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>(initiallySelected);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...images].sort((a, b) => b.createdAt - a.createdAt);
    if (!q) return sorted;
    return sorted.filter((m) =>
      [m.title, m.description, m.category, m.fileName, ...m.tags]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [images, query]);

  const toggle = (id: string) => {
    if (!multiple) {
      onSelect([id]);
      onClose();
      return;
    }
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <ImageUploadButton
            className="btn-ghost mr-auto"
            onImported={(metas) => {
              const ids = metas.map((m) => m.id);
              if (multiple) setSelected((prev) => [...prev, ...ids]);
              else {
                onSelect(ids.slice(0, 1));
                onClose();
              }
            }}
          >
            Neue Bilder importieren
          </ImageUploadButton>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Abbrechen
          </button>
          {multiple && (
            <button
              type="button"
              className="btn-accent"
              disabled={selected.length === 0}
              onClick={() => {
                onSelect(selected);
                onClose();
              }}
            >
              {selected.length} übernehmen
            </button>
          )}
        </>
      }
    >
      <div className="relative mb-4">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          className="input-base pl-10"
          placeholder="Bilder durchsuchen"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Images}
          title={images.length ? 'Nichts gefunden' : 'Noch keine Bilder'}
          message={
            images.length
              ? 'Für diese Suche gibt es kein Bild. Andere Begriffe versuchen.'
              : 'Importiere deine ersten Bilder aus der Fotomediathek oder der Dateien-App.'
          }
        />
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {filtered.map((m) => {
            const active = selected.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(m.id)}
                className={cx(
                  'relative aspect-square overflow-hidden rounded-xl border-2 transition-all duration-200 ease-calm no-tap-highlight',
                  active ? 'border-brass-500 ring-2 ring-brass-500/25' : 'border-line hover:border-brass-400',
                )}
                title={m.title}
              >
                <Thumb imageId={m.id} alt={m.title} className="h-full w-full" rounded="rounded-none" />
                {active && (
                  <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-brass-500 text-paper-50">
                    <Check size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
