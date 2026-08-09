/** Globale Suche über Einträge und Bilder. */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, SearchX } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { Thumb } from '../images/Thumb';
import { StatusPill } from '../entry/StatusPill';
import { useStudio, livingEntries } from '../../store/useStudio';
import { matchesQuery, scoreEntry, searchImages } from '../../lib/search';
import { sucheBlaetter, sucheVerbindungen, sucheZeit } from '../../lib/suche';
import { templateFor } from '../../lib/templates';
import { relativeTime } from '../../lib/utils';

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const allEntries = useStudio((s) => s.entries);
  const images = useStudio((s) => s.images);
  const relations = useStudio((s) => s.relations);
  // Was im Papierkorb liegt, taucht in der Suche nicht auf – dafür gibt es die Zeitleiste.
  const entries = useMemo(() => livingEntries(allEntries), [allEntries]);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery('');
      // Kurze Verzögerung, damit der Dialog erst gerendert ist (iOS-Tastatur).
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [open]);

  const foundEntries = useMemo(() => {
    if (!query.trim()) return entries.slice().sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8);
    return entries
      .filter((e) => matchesQuery(e, query))
      .sort((a, b) => scoreEntry(b, query) - scoreEntry(a, query) || b.updatedAt - a.updatedAt)
      .slice(0, 30);
  }, [entries, query]);

  const foundImages = useMemo(() => {
    if (!query.trim()) return [];
    return searchImages(images, query).slice(0, 12);
  }, [images, query]);

  /*
   * Drei weitere Arten von Treffern. Sie stehen nach den Seiten, weil eine
   * Seite fast immer das Gesuchte ist – aber sie stehen da, weil „1044" und
   * „herrschte über" eben keine Seitentitel sind.
   */
  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  const foundRelations = useMemo(
    () => (query.trim() ? sucheVerbindungen(query, relations, byId) : []),
    [query, relations, byId],
  );
  const foundTime = useMemo(() => (query.trim() ? sucheZeit(query) : undefined), [query]);
  const foundSheets = useMemo(() => (query.trim() ? sucheBlaetter(query) : []), [query]);

  const nothing =
    query.trim() &&
    foundEntries.length === 0 &&
    foundImages.length === 0 &&
    foundRelations.length === 0 &&
    foundSheets.length === 0 &&
    !foundTime;

  return (
    <Modal open={open} onClose={onClose} title="Suche" size="lg">
      <div className="relative mb-4">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          ref={inputRef}
          className="input-base pl-10"
          placeholder="Name, Jahr, Verbindung, Blatt …"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
        />
      </div>

      {nothing ? (
        <EmptyState
          icon={SearchX}
          title="Nichts gefunden"
          message={`Für „${query}“ gibt es keinen Treffer. Vielleicht ein anderer Begriff oder weniger Wörter?`}
        />
      ) : (
        <div className="space-y-5">
          <section>
            <h3 className="mb-2 text-[13px] font-medium uppercase tracking-wide text-ink-muted">
              {query.trim() ? `Einträge (${foundEntries.length})` : 'Zuletzt bearbeitet'}
            </h3>
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
              {foundEntries.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(`/eintrag/${e.id}`);
                    }}
                    className="flex w-full items-center gap-3 bg-cream-50 px-3 py-2.5 text-left transition-colors hover:bg-cream-200"
                  >
                    <Thumb imageId={e.coverImage} alt="" className="h-11 w-11 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] text-ink">{e.title}</span>
                      <span className="block truncate text-[13px] text-ink-muted">
                        {templateFor(e.type).label}
                        {e.category ? ` · ${e.category}` : ''} · {relativeTime(e.updatedAt)}
                      </span>
                    </span>
                    <StatusPill status={e.status} className="hidden sm:inline-flex" />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* --------------------------------------------- Wohin es führt */}
          {(foundSheets.length > 0 || foundTime) && (
            <section>
              <h3 className="mb-2 text-[13px] font-medium uppercase tracking-wide text-ink-muted">
                Blätter
              </h3>
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                {foundTime && (
                  <Zeile
                    key="zeit"
                    titel={foundTime.text}
                    unten="Zeitstrahl · zu diesem Jahr springen"
                    onClick={() => {
                      onClose();
                      navigate(`/zeitstrahl?jahr=${foundTime.jahr}`);
                    }}
                  />
                )}
                {foundSheets.map((b) => (
                  <Zeile
                    key={b.pfad}
                    titel={b.titel}
                    unten={b.hinweis}
                    onClick={() => {
                      onClose();
                      navigate(b.pfad);
                    }}
                  />
                ))}
              </ul>
            </section>
          )}

          {/* ----------------------------------------------- Verbindungen */}
          {foundRelations.length > 0 && (
            <section>
              <h3 className="mb-2 text-[13px] font-medium uppercase tracking-wide text-ink-muted">
                Verbindungen ({foundRelations.length})
              </h3>
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                {foundRelations.map((v) => (
                  <Zeile
                    key={v.relation.id}
                    titel={v.satz}
                    unten={`${templateFor(v.von.type).label} → ${templateFor(v.nach.type).label}`}
                    onClick={() => {
                      onClose();
                      navigate(`/eintrag/${v.von.id}`);
                    }}
                  />
                ))}
              </ul>
            </section>
          )}

          {foundImages.length > 0 && (
            <section>
              <h3 className="mb-2 text-[13px] font-medium uppercase tracking-wide text-ink-muted">
                Bilder ({foundImages.length})
              </h3>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {foundImages.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(`/bilder?bild=${m.id}`);
                    }}
                    className="overflow-hidden rounded-xl border border-line transition-colors hover:border-brass-400"
                    title={m.title}
                  >
                    <Thumb imageId={m.id} alt={m.title} className="aspect-square w-full" rounded="rounded-none" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}

/** Eine Trefferzeile – überall gleich, damit die Liste ruhig bleibt. */
function Zeile({
  titel,
  unten,
  onClick,
}: {
  titel: string;
  unten: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 bg-cream-50 px-3 py-2.5 text-left transition-colors hover:bg-cream-200"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] text-ink">{titel}</span>
          <span className="block truncate text-[13px] text-ink-muted">{unten}</span>
        </span>
      </button>
    </li>
  );
}
