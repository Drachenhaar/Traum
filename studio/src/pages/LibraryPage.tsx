/**
 * Die Bibliothek.
 *
 * Eine Ansicht für alle Inhaltsarten. Statt fester Bereichsseiten gibt es
 * Typfilter, die aus den vorhandenen Daten entstehen – neue oder selbst
 * angelegte Typen erscheinen hier ohne Zutun.
 *
 * Für große Bestände wird stückweise nachgeladen, statt tausende Karten auf
 * einmal in den Baum zu hängen.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Filter, LayoutGrid, Library, List, Plus, Search, Unlink, X } from 'lucide-react';
import { useStudio, livingEntries } from '../store/useStudio';
import { EntryCard, EntryRow } from '../components/entry/EntryCard';
import { EmptyState } from '../components/ui/EmptyState';
import { ChipSelect } from '../components/ui/Fields';
import { QuickCreate } from '../components/entry/QuickCreate';
import { allCategories, allTags, filterEntries } from '../lib/search';
import { templateFor } from '../lib/templates';
import { findOrphans } from '../lib/relations';
import { ENTRY_STATUSES, EMPTY_FILTER, type EntryFilter } from '../types';
import { cx } from '../lib/utils';

const PAGE_SIZE = 48;

export function LibraryPage() {
  const entries = useStudio((s) => s.entries);
  const relIndex = useStudio((s) => s.relIndex);
  const createEntry = useStudio((s) => s.createEntry);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const typeParam = params.get('typ');
  const [filter, setFilter] = useState<EntryFilter>({
    ...EMPTY_FILTER,
    types: typeParam ? [typeParam] : [],
  });
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [onlyOrphans, setOnlyOrphans] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [createOpen, setCreateOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Typwechsel über die Adresszeile (z. B. aus der Seitenleiste)
  useEffect(() => {
    setFilter((f) => ({ ...f, types: typeParam ? [typeParam] : [] }));
    setVisibleCount(PAGE_SIZE);
  }, [typeParam]);

  const living = useMemo(() => livingEntries(entries), [entries]);

  /** Typen mit Anzahl – zuerst die, die es wirklich gibt. */
  const typeChips = useMemo(() => {
    const counts = new Map<string, number>();
    living.forEach((e) => counts.set(e.type, (counts.get(e.type) ?? 0) + 1));
    const used = [...counts.entries()]
      .map(([type, count]) => ({ type, count, tpl: templateFor(type) }))
      .sort((a, b) => b.count - a.count || a.tpl.label.localeCompare(b.tpl.label, 'de'));
    return used;
  }, [living]);

  const orphanIds = useMemo(
    () => new Set(findOrphans(living, relIndex).map((e) => e.id)),
    [living, relIndex],
  );

  const categories = useMemo(() => {
    const fromData = allCategories(living);
    const fromTemplates = filter.types.flatMap((t) => templateFor(t).categories);
    return [...new Set([...fromData, ...fromTemplates])].sort((a, b) => a.localeCompare(b, 'de'));
  }, [living, filter.types]);

  const tags = useMemo(() => allTags(living), [living]);

  const assetFilters = filter.types.includes('asset');

  const visible = useMemo(() => {
    let list = filterEntries(living, filter);
    if (onlyOrphans) list = list.filter((e) => orphanIds.has(e.id));
    return list;
  }, [living, filter, onlyOrphans, orphanIds]);

  // Nachladen beim Scrollen
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((obs) => {
      if (obs[0].isIntersecting) setVisibleCount((c) => Math.min(c + PAGE_SIZE, visible.length));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible.length]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [filter, onlyOrphans]);

  const shown = visible.slice(0, visibleCount);

  const activeFilterCount =
    filter.categories.length +
    filter.statuses.length +
    filter.tags.length +
    (filter.favoritesOnly ? 1 : 0) +
    (filter.cutoutOnly ? 1 : 0) +
    (filter.animatableOnly ? 1 : 0) +
    (filter.orientation ? 1 : 0) +
    (onlyOrphans ? 1 : 0);

  const selectedType = filter.types.length === 1 ? filter.types[0] : null;
  const tpl = selectedType ? templateFor(selectedType) : null;

  const setType = (type: string | null) => {
    const next = new URLSearchParams(params);
    if (type) next.set('typ', type);
    else next.delete('typ');
    setParams(next, { replace: true });
  };

  const resetAll = () => {
    setFilter({ ...EMPTY_FILTER, types: filter.types });
    setOnlyOrphans(false);
  };

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-serif text-[30px] leading-tight text-ink sm:text-[34px]">
          {tpl ? tpl.labelPlural : 'Bibliothek'}
        </h1>
        <p className="mt-1 max-w-2xl text-[15px] text-ink-muted">
          {tpl
            ? `${visible.length} von ${living.filter((e) => e.type === tpl.type).length} Einträgen`
            : `Alles, was deine Welt bisher ausmacht – ${living.length} Einträge.`}
        </p>
      </header>

      {/* Typen */}
      <div className="scroll-slim -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <button
          type="button"
          onClick={() => setType(null)}
          className={cx(
            'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[14px] transition-all duration-200 ease-calm',
            !selectedType
              ? 'border-ink bg-ink text-cream-50'
              : 'border-line bg-cream-50 text-ink-muted hover:bg-cream-200',
          )}
        >
          Alles <span className="opacity-60">{living.length}</span>
        </button>
        {typeChips.map(({ type, count, tpl: t }) => {
          const active = selectedType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setType(active ? null : type)}
              className={cx(
                'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[14px] transition-all duration-200 ease-calm',
                active ? 'text-ink' : 'border-line bg-cream-50 text-ink-muted hover:bg-cream-200',
              )}
              style={active ? { borderColor: t.accent, background: `${t.accent}1F` } : undefined}
            >
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: t.accent }} />
              {t.labelPlural} <span className="opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Werkzeugzeile */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            className="input-base pl-10"
            placeholder="Durchsuchen"
            value={filter.query}
            onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
            enterKeyHint="search"
          />
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className={cx('btn-ghost px-3', activeFilterCount > 0 && 'border-brass-400 bg-brass-500/10')}
        >
          <Filter size={18} />
          <span className="hidden sm:inline">Filter</span>
          {activeFilterCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brass-500 px-1 text-[11px] text-cream-50">
              {activeFilterCount}
            </span>
          )}
        </button>

        <div className="flex overflow-hidden rounded-xl border border-line">
          <button
            type="button"
            onClick={() => setView('grid')}
            className={cx('grid h-11 w-11 place-items-center', view === 'grid' ? 'bg-cream-300 text-ink' : 'bg-cream-50 text-ink-muted')}
            aria-label="Raster"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={cx('grid h-11 w-11 place-items-center border-l border-line', view === 'list' ? 'bg-cream-300 text-ink' : 'bg-cream-50 text-ink-muted')}
            aria-label="Liste"
          >
            <List size={18} />
          </button>
        </div>

        <button
          type="button"
          className="btn-accent flex-1 px-3.5 sm:flex-none"
          onClick={async () => {
            if (selectedType) {
              const entry = await createEntry(selectedType);
              navigate(`/eintrag/${entry.id}`);
            } else {
              setCreateOpen(true);
            }
          }}
        >
          <Plus size={18} /> {tpl ? tpl.label : 'Neu'}
        </button>
      </div>

      {/* Filter */}
      {filtersOpen && (
        <div className="mb-5 space-y-4 rounded-2xl border border-line bg-cream-50 p-4 animate-riseIn">
          {categories.length > 0 && (
            <div>
              <p className="label-base">Kategorie</p>
              <ChipSelect
                options={categories}
                value={filter.categories}
                onChange={(v) => setFilter((f) => ({ ...f, categories: v }))}
              />
            </div>
          )}

          <div>
            <p className="label-base">Status</p>
            <ChipSelect
              options={ENTRY_STATUSES}
              value={filter.statuses}
              onChange={(v) => setFilter((f) => ({ ...f, statuses: v }))}
            />
          </div>

          {tags.length > 0 && (
            <div>
              <p className="label-base">Schlagworte</p>
              <ChipSelect
                options={tags.slice(0, 40)}
                value={filter.tags}
                onChange={(v) => setFilter((f) => ({ ...f, tags: v }))}
              />
            </div>
          )}

          {assetFilters && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="label-base">Eigenschaften</p>
                <ChipSelect
                  options={['freigestellt', 'animierbar'] as const}
                  value={[
                    ...(filter.cutoutOnly ? (['freigestellt'] as const) : []),
                    ...(filter.animatableOnly ? (['animierbar'] as const) : []),
                  ]}
                  onChange={(v) =>
                    setFilter((f) => ({
                      ...f,
                      cutoutOnly: v.includes('freigestellt'),
                      animatableOnly: v.includes('animierbar'),
                    }))
                  }
                />
              </div>
              <div>
                <p className="label-base">Orientierung</p>
                <ChipSelect
                  options={['hoch', 'quer', 'quadratisch'] as const}
                  value={filter.orientation ? [filter.orientation] : []}
                  multiple={false}
                  onChange={(v) =>
                    setFilter((f) => ({ ...f, orientation: (v[0] ?? '') as EntryFilter['orientation'] }))
                  }
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <button
              type="button"
              onClick={() => setFilter((f) => ({ ...f, favoritesOnly: !f.favoritesOnly }))}
              className={cx('btn px-3', filter.favoritesOnly ? 'btn-accent' : 'btn-ghost')}
            >
              Nur Favoriten
            </button>
            <button
              type="button"
              onClick={() => setOnlyOrphans((v) => !v)}
              className={cx('btn px-3', onlyOrphans ? 'btn-accent' : 'btn-ghost')}
              title="Einträge, die noch mit nichts verbunden sind"
            >
              <Unlink size={16} /> Ohne Verbindung ({orphanIds.size})
            </button>
            {activeFilterCount > 0 && (
              <button type="button" className="btn-quiet px-3" onClick={resetAll}>
                <X size={16} /> Zurücksetzen
              </button>
            )}
          </div>
        </div>
      )}

      {/* Ergebnis */}
      {visible.length === 0 ? (
        <EmptyState
          icon={Library}
          title={living.length === 0 ? 'Deine Welt beginnt hier' : 'Nichts gefunden'}
          message={
            living.length === 0
              ? 'Lege den ersten Eintrag an. Alles Weitere wächst daran.'
              : 'Für diese Suche und Filter gibt es keinen Eintrag.'
          }
          action={
            living.length === 0 ? (
              <button type="button" className="btn-accent" onClick={() => setCreateOpen(true)}>
                <Plus size={18} /> Ersten Eintrag anlegen
              </button>
            ) : (
              <button type="button" className="btn-ghost" onClick={resetAll}>
                Suche und Filter zurücksetzen
              </button>
            )
          }
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((e) => (
            <EntryCard key={e.id} entry={e} />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {shown.map((e) => (
            <EntryRow key={e.id} entry={e} />
          ))}
        </ul>
      )}

      {/* Nachladepunkt */}
      {shown.length < visible.length && (
        <div ref={sentinelRef} className="py-8 text-center text-[13px] text-ink-faint">
          {visible.length - shown.length} weitere werden geladen …
        </div>
      )}

      {visible.length > 0 && shown.length === visible.length && (
        <p className="mt-4 text-[13px] text-ink-faint">
          {visible.length} {visible.length === 1 ? 'Eintrag' : 'Einträge'}
        </p>
      )}

      <QuickCreate open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
