/** Eintrag als Karte (Raster) oder als Zeile (kompakte Liste). */

import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import type { Entry } from '../../types';
import { Thumb } from '../images/Thumb';
import { templateFor } from '../../lib/templates';
import { iconByName } from '../../lib/icons';
import { cx, relativeTime } from '../../lib/utils';
import { useStudio } from '../../store/useStudio';
import { StatusPill } from './StatusPill';

export function EntryCard({ entry }: { entry: Entry }) {
  const toggleFavorite = useStudio((s) => s.toggleFavorite);
  const tpl = templateFor(entry.type);

  return (
    <div className="group relative">
      <Link
        to={`/eintrag/${entry.id}`}
        className="block overflow-hidden rounded-2xl border border-line bg-cream-50 shadow-card transition-all duration-200 ease-calm hover:-translate-y-0.5 hover:shadow-lift no-tap-highlight"
      >
        {entry.coverImage ? (
          <Thumb imageId={entry.coverImage} alt={entry.title} className="aspect-[4/3] w-full" rounded="rounded-none" />
        ) : (
          <CoverPlaceholder type={entry.type} />
        )}
        <div className="p-3.5">
          <p className="text-[12px] font-medium uppercase tracking-wide text-brass-600">
            {tpl.label}
            {entry.category ? ` · ${entry.category}` : ''}
          </p>
          <h3 className="mt-1 line-clamp-2 font-serif text-lg leading-snug text-ink">{entry.title}</h3>
          {entry.subtitle && (
            <p className="mt-0.5 line-clamp-1 text-[14px] text-ink-muted">{entry.subtitle}</p>
          )}
          <div className="mt-3 flex items-center justify-between gap-2">
            <StatusPill status={entry.status} />
            <span className="shrink-0 text-[12px] text-ink-faint">{relativeTime(entry.updatedAt)}</span>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={() => toggleFavorite(entry.id)}
        className={cx(
          'absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full backdrop-blur transition-colors no-tap-highlight',
          entry.favorite
            ? 'bg-brass-500 text-cream-50'
            : 'bg-cream-50/85 text-ink-muted hover:text-brass-600',
        )}
        aria-label={entry.favorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
      >
        <Star size={17} className={entry.favorite ? 'fill-current' : ''} />
      </button>
    </div>
  );
}

/** Ruhiger Platzhalter mit dem Symbol des Eintragstyps, wenn kein Titelbild gesetzt ist. */
function CoverPlaceholder({ type }: { type: Entry['type'] }) {
  const Icon = iconByName(templateFor(type).icon);
  return (
    <div className="grid aspect-[4/3] w-full place-items-center bg-gradient-to-br from-cream-200 to-cream-300">
      <Icon size={26} strokeWidth={1.25} className="text-brass-500/60" />
    </div>
  );
}

export function EntryRow({ entry }: { entry: Entry }) {
  const toggleFavorite = useStudio((s) => s.toggleFavorite);
  const tpl = templateFor(entry.type);

  return (
    <li className="flex items-center gap-3 bg-cream-50 px-3 py-2 transition-colors hover:bg-cream-200/60">
      <Link to={`/eintrag/${entry.id}`} className="flex min-w-0 flex-1 items-center gap-3 no-tap-highlight">
        <Thumb imageId={entry.coverImage} alt="" className="h-12 w-12 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] text-ink">{entry.title}</span>
          <span className="block truncate text-[13px] text-ink-muted">
            {tpl.label}
            {entry.category ? ` · ${entry.category}` : ''} · {relativeTime(entry.updatedAt)}
          </span>
        </span>
        <StatusPill status={entry.status} className="hidden sm:inline-flex" />
      </Link>
      <button
        type="button"
        onClick={() => toggleFavorite(entry.id)}
        className={cx(
          'touch-target grid shrink-0 place-items-center rounded-lg transition-colors',
          entry.favorite ? 'text-brass-500' : 'text-ink-faint hover:text-brass-600',
        )}
        aria-label={entry.favorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
      >
        <Star size={17} className={entry.favorite ? 'fill-current' : ''} />
      </button>
    </li>
  );
}
