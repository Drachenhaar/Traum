/**
 * Bildermediathek.
 *
 * Raster oder Liste, Suche, Filter nach Kategorie, Status, Schlagwort,
 * Favoriten und Orientierung. Bilder lassen sich in Vollbild ansehen und
 * ihre Angaben bearbeiten.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, ImagePlus, Images, LayoutGrid, List, Search, Star, X } from 'lucide-react';
import { useStudio } from '../store/useStudio';
import { Thumb } from '../components/images/Thumb';
import { Lightbox } from '../components/images/Lightbox';
import { ImageMetaEditor } from '../components/images/ImageMetaEditor';
import { ImageUploadButton } from '../components/images/ImageUploadButton';
import { EmptyState } from '../components/ui/EmptyState';
import { ChipSelect } from '../components/ui/Fields';
import { StatusPill } from '../components/entry/StatusPill';
import { searchImages } from '../lib/search';
import { orientationOf } from '../lib/images';
import { ENTRY_STATUSES, type EntryStatus } from '../types';
import { cx, formatBytes, relativeTime } from '../lib/utils';

type Orientation = 'hoch' | 'quer' | 'quadratisch';

export function ImagesPage() {
  const images = useStudio((s) => s.images);
  const [params, setParams] = useSearchParams();

  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<EntryStatus[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [orientation, setOrientation] = useState<Orientation[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  // Direktaufruf per ?bild=<id> (z. B. aus der globalen Suche)
  useEffect(() => {
    const wanted = params.get('bild');
    if (wanted && images.some((m) => m.id === wanted)) {
      setEditing(wanted);
      params.delete('bild');
      setParams(params, { replace: true });
    }
  }, [params, images, setParams]);

  const allCategories = useMemo(
    () => [...new Set(images.map((m) => m.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de')),
    [images],
  );
  const allTags = useMemo(
    () => [...new Set(images.flatMap((m) => m.tags))].sort((a, b) => a.localeCompare(b, 'de')),
    [images],
  );

  const visible = useMemo(() => {
    let list = searchImages(images, query);
    if (categories.length) list = list.filter((m) => categories.includes(m.category));
    if (statuses.length) list = list.filter((m) => statuses.includes(m.status));
    if (tags.length) list = list.filter((m) => tags.every((t) => m.tags.includes(t)));
    if (favoritesOnly) list = list.filter((m) => m.favorite);
    if (orientation.length) list = list.filter((m) => orientation.includes(orientationOf(m)));
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }, [images, query, categories, statuses, tags, favoritesOnly, orientation]);

  const activeFilters =
    categories.length + statuses.length + tags.length + orientation.length + (favoritesOnly ? 1 : 0);

  const resetFilters = () => {
    setCategories([]);
    setStatuses([]);
    setTags([]);
    setOrientation([]);
    setFavoritesOnly(false);
  };

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-serif text-[30px] leading-tight text-ink sm:text-[34px]">Bilder</h1>
        <p className="mt-1 max-w-2xl text-[15px] text-ink-muted">
          Alle Bilder liegen lokal in diesem Browser. Titel, Schlagworte und Prompts machen sie
          wiederauffindbar.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            className="input-base pl-10"
            placeholder="Bilder durchsuchen"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            enterKeyHint="search"
          />
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className={cx('btn-ghost px-3', activeFilters > 0 && 'border-brass-400 bg-brass-500/10')}
        >
          <Filter size={18} />
          <span className="hidden sm:inline">Filter</span>
          {activeFilters > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brass-500 px-1 text-[11px] text-cream-50">
              {activeFilters}
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

        <ImageUploadButton className="btn-accent flex-1 px-3.5 sm:flex-none">
          <ImagePlus size={18} /> Importieren
        </ImageUploadButton>
      </div>

      {filtersOpen && (
        <div className="mb-5 space-y-4 rounded-2xl border border-line bg-cream-50 p-4 animate-riseIn">
          {allCategories.length > 0 && (
            <div>
              <p className="label-base">Kategorie</p>
              <ChipSelect options={allCategories} value={categories} onChange={setCategories} />
            </div>
          )}
          <div>
            <p className="label-base">Status</p>
            <ChipSelect options={ENTRY_STATUSES} value={statuses} onChange={setStatuses} />
          </div>
          {allTags.length > 0 && (
            <div>
              <p className="label-base">Schlagworte</p>
              <ChipSelect options={allTags} value={tags} onChange={setTags} />
            </div>
          )}
          <div>
            <p className="label-base">Orientierung</p>
            <ChipSelect
              options={['hoch', 'quer', 'quadratisch'] as const}
              value={orientation}
              onChange={setOrientation}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <button
              type="button"
              onClick={() => setFavoritesOnly((v) => !v)}
              className={cx('btn px-3', favoritesOnly ? 'btn-accent' : 'btn-ghost')}
            >
              <Star size={16} className={favoritesOnly ? 'fill-current' : ''} /> Nur Favoriten
            </button>
            {activeFilters > 0 && (
              <button type="button" className="btn-quiet px-3" onClick={resetFilters}>
                <X size={16} /> Filter zurücksetzen
              </button>
            )}
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={Images}
          title={images.length === 0 ? 'Noch keine Bilder' : 'Nichts gefunden'}
          message={
            images.length === 0
              ? 'Importiere Bilder aus der Fotomediathek oder der Dateien-App. Du kannst mehrere gleichzeitig auswählen.'
              : 'Für diese Suche und Filter gibt es kein Bild.'
          }
          action={
            images.length === 0 ? (
              <ImageUploadButton className="btn-accent">
                <ImagePlus size={18} /> Bilder importieren
              </ImageUploadButton>
            ) : (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setQuery('');
                  resetFilters();
                }}
              >
                Suche und Filter zurücksetzen
              </button>
            )
          }
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
          {visible.map((m, i) => (
            <div key={m.id} className="group relative">
              <button
                type="button"
                onClick={() => setLightbox(i)}
                className="block w-full overflow-hidden rounded-xl border border-line bg-cream-50 transition-all duration-200 ease-calm hover:-translate-y-0.5 hover:shadow-card"
              >
                <Thumb imageId={m.id} alt={m.title} className="aspect-square w-full" rounded="rounded-none" />
                <span className="block truncate px-2 py-1.5 text-left text-[13px] text-ink">{m.title}</span>
              </button>
              <button
                type="button"
                onClick={() => setEditing(m.id)}
                className="absolute right-1.5 top-1.5 rounded-lg bg-cream-50/90 px-2 py-1.5 text-[12px] text-ink opacity-0 shadow transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                Bearbeiten
              </button>
              {m.favorite && (
                <Star size={15} className="absolute left-1.5 top-1.5 fill-brass-500 text-brass-500 drop-shadow" />
              )}
            </div>
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {visible.map((m, i) => (
            <li key={m.id} className="flex items-center gap-3 bg-cream-50 px-3 py-2">
              <button type="button" onClick={() => setLightbox(i)} className="shrink-0">
                <Thumb imageId={m.id} alt="" className="h-12 w-12" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] text-ink">{m.title}</p>
                <p className="truncate text-[13px] text-ink-muted">
                  {m.width} × {m.height} · {formatBytes(m.size)} · {relativeTime(m.createdAt)}
                  {m.category ? ` · ${m.category}` : ''}
                </p>
              </div>
              <StatusPill status={m.status} className="hidden sm:inline-flex" />
              <button type="button" className="btn-ghost h-10 min-h-0 shrink-0 px-3 text-[14px]" onClick={() => setEditing(m.id)}>
                Bearbeiten
              </button>
            </li>
          ))}
        </ul>
      )}

      {visible.length > 0 && (
        <p className="mt-4 text-[13px] text-ink-faint">
          {visible.length} von {images.length} Bildern
        </p>
      )}

      {lightbox !== null && (
        <Lightbox
          ids={visible.map((m) => m.id)}
          index={lightbox}
          onIndexChange={setLightbox}
          onClose={() => setLightbox(null)}
          onEdit={(id) => {
            setLightbox(null);
            setEditing(id);
          }}
        />
      )}

      <ImageMetaEditor imageId={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
