/**
 * Wiederverwendbare Übersicht für Einträge.
 *
 * Enthält Suche, Filter, Umschalten zwischen Raster und Liste sowie den
 * Knopf zum Anlegen. Wird von fast allen Bereichsseiten verwendet.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, LayoutGrid, List, Plus, Search, X } from 'lucide-react';
import type { Entry, EntryType, ViewMode } from '../../types';
import { EMPTY_FILTER, ENTRY_STATUSES, type EntryFilter } from '../../types';
import { EntryCard, EntryRow } from './EntryCard';
import { EmptyState } from '../ui/EmptyState';
import { ChipSelect } from '../ui/Fields';
import { useStudio } from '../../store/useStudio';
import { allCategories, allTags, filterEntries } from '../../lib/search';
import { asText, templateFor } from '../../lib/templates';
import { iconByName } from '../../lib/icons';
import { cx } from '../../lib/utils';

export function EntryBrowser({
  title,
  description,
  types,
  /** Zusätzliche Asset-Filter (freigestellt, animierbar, Orientierung) */
  assetFilters = false,
  /** Nur Einträge, die diese Bedingung erfüllen */
  extraFilter,
  emptyHint,
  fieldFilters = [],
}: {
  title: string;
  description?: string;
  types: EntryType[];
  assetFilters?: boolean;
  extraFilter?: (e: Entry) => boolean;
  emptyHint?: string;
  /** Zusätzliche Filter über Vorlagenfelder, z. B. „Modell“ bei Prompts */
  fieldFilters?: { key: string; label: string }[];
}) {
  const entries = useStudio((s) => s.entries);
  const createEntry = useStudio((s) => s.createEntry);
  const navigate = useNavigate();

  const [filter, setFilter] = useState<EntryFilter>({ ...EMPTY_FILTER, types });
  const [view, setView] = useState<ViewMode>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  /** Ausgewählte Werte je Vorlagenfeld (z. B. { model: ['Midjourney v6'] }) */
  const [fieldSelection, setFieldSelection] = useState<Record<string, string[]>>({});

  const scoped = useMemo(
    () => entries.filter((e) => types.includes(e.type)).filter((e) => !extraFilter || extraFilter(e)),
    [entries, types, extraFilter],
  );

  const categories = useMemo(() => {
    const fromData = allCategories(scoped);
    const fromTemplates = types.flatMap((t) => templateFor(t).categories);
    return [...new Set([...fromData, ...fromTemplates])].sort((a, b) => a.localeCompare(b, 'de'));
  }, [scoped, types]);

  const tags = useMemo(() => allTags(scoped), [scoped]);

  /** Vorkommende Werte je zusätzlichem Feldfilter. */
  const fieldOptions = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const f of fieldFilters) {
      const values = new Set<string>();
      scoped.forEach((e) => {
        const v = asText(e.fields[f.key]);
        if (v) values.add(v);
      });
      out[f.key] = [...values].sort((a, b) => a.localeCompare(b, 'de'));
    }
    return out;
  }, [scoped, fieldFilters]);

  const visible = useMemo(() => {
    const base = filterEntries(scoped, { ...filter, types });
    const active = Object.entries(fieldSelection).filter(([, v]) => v.length);
    if (!active.length) return base;
    return base.filter((e) => active.every(([key, values]) => values.includes(asText(e.fields[key]))));
  }, [scoped, filter, types, fieldSelection]);

  const activeFilterCount =
    filter.categories.length +
    filter.statuses.length +
    filter.tags.length +
    (filter.favoritesOnly ? 1 : 0) +
    (filter.cutoutOnly ? 1 : 0) +
    (filter.animatableOnly ? 1 : 0) +
    (filter.orientation ? 1 : 0) +
    Object.values(fieldSelection).reduce((sum, v) => sum + v.length, 0);

  const primaryType = types[0];
  const tpl = templateFor(primaryType);
  const Icon = iconByName(tpl.icon);

  const create = async () => {
    const entry = await createEntry(primaryType);
    navigate(`/eintrag/${entry.id}`);
  };

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-serif text-[30px] leading-tight text-ink sm:text-[34px]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[15px] text-ink-muted">{description}</p>}
      </header>

      {/* Werkzeugzeile */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            className="input-base pl-10"
            placeholder={`In ${title} suchen`}
            value={filter.query}
            onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
            enterKeyHint="search"
          />
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className={cx('btn-ghost px-3', activeFilterCount > 0 && 'border-brass-400 bg-brass-500/10')}
          aria-expanded={filtersOpen}
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
            className={cx('grid h-11 w-11 place-items-center transition-colors', view === 'grid' ? 'bg-cream-300 text-ink' : 'bg-cream-50 text-ink-muted')}
            aria-label="Raster"
          >
            <LayoutGrid size={18} />
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={cx('grid h-11 w-11 place-items-center border-l border-line transition-colors', view === 'list' ? 'bg-cream-300 text-ink' : 'bg-cream-50 text-ink-muted')}
            aria-label="Liste"
          >
            <List size={18} />
          </button>
        </div>

        <button
          type="button"
          className="btn-accent flex-1 px-3.5 sm:flex-none"
          onClick={() => void create()}
        >
          <Plus size={18} /> {tpl.label}
        </button>
      </div>

      {/* Filterbereich */}
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

          {fieldFilters.map((f) =>
            fieldOptions[f.key]?.length ? (
              <div key={f.key}>
                <p className="label-base">{f.label}</p>
                <ChipSelect
                  options={fieldOptions[f.key]}
                  value={fieldSelection[f.key] ?? []}
                  onChange={(v) => setFieldSelection((prev) => ({ ...prev, [f.key]: v }))}
                />
              </div>
            ) : null,
          )}

          {tags.length > 0 && (
            <div>
              <p className="label-base">Schlagworte</p>
              <ChipSelect
                options={tags}
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
                  onChange={(v) => setFilter((f) => ({ ...f, orientation: (v[0] ?? '') as EntryFilter['orientation'] }))}
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
            {activeFilterCount > 0 && (
              <button
                type="button"
                className="btn-quiet px-3"
                onClick={() => {
                  setFilter((f) => ({ ...EMPTY_FILTER, types, query: f.query }));
                  setFieldSelection({});
                }}
              >
                <X size={16} /> Filter zurücksetzen
              </button>
            )}
          </div>
        </div>
      )}

      {/* Ergebnis */}
      {visible.length === 0 ? (
        <EmptyState
          icon={Icon}
          title={scoped.length === 0 ? `Noch keine ${title}` : 'Nichts gefunden'}
          message={
            scoped.length === 0
              ? emptyHint ?? `Lege den ersten Eintrag an – du kannst ihn jederzeit ändern oder löschen.`
              : 'Für diese Suche und Filter gibt es keinen Eintrag.'
          }
          action={
            scoped.length === 0 ? (
              <button type="button" className="btn-accent" onClick={() => void create()}>
                <Plus size={18} /> {tpl.label} anlegen
              </button>
            ) : (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setFilter({ ...EMPTY_FILTER, types });
                  setFieldSelection({});
                }}
              >
                Suche und Filter zurücksetzen
              </button>
            )
          }
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((e) => (
            <EntryCard key={e.id} entry={e} />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {visible.map((e) => (
            <EntryRow key={e.id} entry={e} />
          ))}
        </ul>
      )}

      {visible.length > 0 && (
        <p className="mt-4 text-[13px] text-ink-faint">
          {visible.length} von {scoped.length} Einträgen
        </p>
      )}
    </div>
  );
}
