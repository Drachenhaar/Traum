/**
 * Story-Modus.
 *
 * Die Oberfläche verschwindet vollständig; übrig bleiben Seiten wie in einem
 * Artbook. Wer von einem Eintrag aus startet, wandert anschließend durch
 * dessen Nachbarschaft – so wird beim Vorführen die Welt erzählt und nicht
 * eine Datenbank vorgelesen.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useStudio, livingEntries } from '../../store/useStudio';
import { neighbourhood } from '../../lib/graph';
import { relationsOf } from '../../lib/relations';
import { templateFor, asList, asText } from '../../lib/templates';
import { BlockList } from '../blocks/BlockView';
import { useImageUrl } from '../images/Thumb';
import { Thumb } from '../images/Thumb';
import { cx } from '../../lib/utils';

export function StoryMode({
  startId,
  ids,
  onClose,
}: {
  startId?: string;
  /** Feste Reihenfolge (z. B. aus dem Weltbuch). Ohne sie wird gewandert. */
  ids?: string[];
  onClose: () => void;
}) {
  const entries = useStudio((s) => s.entries);
  const relIndex = useStudio((s) => s.relIndex);
  const living = useMemo(() => livingEntries(entries), [entries]);
  const byId = useMemo(() => new Map(living.map((e) => [e.id, e])), [living]);

  /** Die Reihenfolge der Seiten. */
  const sequence = useMemo(() => {
    if (ids?.length) return ids.filter((id) => byId.has(id));
    if (!startId || !byId.has(startId)) return living.map((e) => e.id);
    // Vom Startpunkt aus in die Nachbarschaft wandern.
    const near = neighbourhood(relIndex.neighbours, startId, 2);
    const ordered = [startId, ...[...near].filter((id) => id !== startId)];
    return ordered.filter((id) => byId.has(id));
  }, [ids, startId, byId, living, relIndex]);

  const [index, setIndex] = useState(() => Math.max(0, sequence.indexOf(startId ?? '')));
  const go = useCallback(
    (delta: number) => {
      setIndex((i) => Math.min(sequence.length - 1, Math.max(0, i + delta)));
    },
    [sequence.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === ' ') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [go, onClose]);

  // Wischen auf dem iPhone
  const touchStart = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
    touchStart.current = null;
  };

  const entry = byId.get(sequence[index]);
  const cover = useImageUrl(entry?.coverImage, 'full');

  if (!entry) {
    return createPortal(
      <div className="fixed inset-0 z-[80] grid place-items-center bg-olive-900 text-paper-50">
        <div className="text-center">
          <p className="font-serif text-2xl">Nichts zu zeigen</p>
          <button type="button" className="btn-ghost mt-4" onClick={onClose}>
            Schließen
          </button>
        </div>
      </div>,
      document.body,
    );
  }

  const tpl = templateFor(entry.type);
  const relations = relationsOf(relIndex, entry.id);

  /** Die inhaltsstärksten Felder – nicht alle, sonst wird es eine Tabelle. */
  const highlights = tpl.fields
    .filter((f) => ['text', 'textarea'].includes(f.kind))
    .map((f) => ({ label: f.label, value: asText(entry.fields[f.key]) }))
    .filter((f) => f.value)
    .slice(0, 4);

  const palette = asList(entry.fields.palette);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] overflow-y-auto bg-olive-900 text-paper-50 animate-fadeIn"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Titelbild als ganze Fläche */}
      {cover && (
        <div className="relative h-[46vh] w-full overflow-hidden sm:h-[58vh]">
          <img src={cover} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-olive-900 via-olive-900/35 to-transparent" />
        </div>
      )}

      <article className={cx('mx-auto w-full max-w-[720px] px-6 pb-32', cover ? '-mt-28 relative' : 'pt-24')}>
        <p className="mb-2 flex items-center gap-2 text-[13px] uppercase tracking-[0.2em] text-brass-300">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: tpl.accent }} />
          {tpl.label}
          {entry.category ? ` · ${entry.category}` : ''}
        </p>

        <h1 className="font-serif text-[38px] leading-[1.1] sm:text-[52px]">{entry.title}</h1>
        {entry.subtitle && (
          <p className="mt-2 font-serif text-[20px] italic text-paper-50/70 sm:text-[24px]">
            {entry.subtitle}
          </p>
        )}

        {entry.description && (
          <p className="mt-7 text-[18px] leading-[1.75] text-paper-50/90">{entry.description}</p>
        )}

        {palette.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {palette.map((raw, i) => {
              const [color, ...rest] = raw.split('|');
              return (
                <span key={i} className="flex items-center gap-2 text-[13px] text-paper-50/70">
                  <span
                    className="h-9 w-9 rounded-lg border border-paper-50/15"
                    style={{ background: color }}
                  />
                  {rest.join('|') || color}
                </span>
              );
            })}
          </div>
        )}

        {highlights.length > 0 && (
          <dl className="mt-9 grid gap-5 sm:grid-cols-2">
            {highlights.map((h) => (
              <div key={h.label}>
                <dt className="text-[12px] uppercase tracking-wide text-brass-300/80">{h.label}</dt>
                <dd className="mt-1 whitespace-pre-wrap text-[16px] leading-relaxed text-paper-50/85">
                  {h.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <BlockList blocks={entry.blocks} tone="dark" />

        {relations.length > 0 && (
          <div className="mt-12 border-t border-paper-50/15 pt-6">
            <p className="mb-3 text-[12px] uppercase tracking-[0.18em] text-brass-300/80">
              Steht in Verbindung mit
            </p>
            <div className="flex flex-wrap gap-2">
              {relations.slice(0, 10).map((rel) => {
                const other = byId.get(rel.otherId);
                if (!other) return null;
                const pos = sequence.indexOf(other.id);
                return (
                  <button
                    key={rel.relation.id}
                    type="button"
                    onClick={() => pos >= 0 && setIndex(pos)}
                    className="flex items-center gap-2 rounded-full border border-paper-50/20 px-3 py-1.5 text-[14px] text-paper-50/85 transition-colors hover:border-brass-300 hover:text-paper-50"
                  >
                    <Thumb imageId={other.coverImage} alt="" className="h-6 w-6" rounded="rounded-full" />
                    <span className="text-paper-50/55">{rel.label}</span>
                    {other.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </article>

      {/* Bedienung – so leise wie möglich */}
      <div className="fixed inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-olive-900 to-transparent px-4 pb-safe pt-8">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          className="touch-target grid place-items-center rounded-full bg-paper-50/10 px-4 text-paper-50 transition-colors hover:bg-paper-50/20 disabled:opacity-25"
          aria-label="Zurück"
        >
          <ChevronLeft size={20} />
        </button>
        <p className="flex-1 text-center text-[13px] text-paper-50/50">
          {index + 1} / {sequence.length}
        </p>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={index === sequence.length - 1}
          className="touch-target grid place-items-center rounded-full bg-paper-50/10 px-4 text-paper-50 transition-colors hover:bg-paper-50/20 disabled:opacity-25"
          aria-label="Weiter"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="fixed right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-olive-900/60 text-paper-50/80 backdrop-blur transition-colors hover:bg-olive-900 hover:text-paper-50"
        style={{ top: 'calc(var(--sat) + 12px)' }}
        aria-label="Story-Modus verlassen"
      >
        <X size={20} />
      </button>
    </div>,
    document.body,
  );
}
