/** Vollbildansicht für Bilder – mit Blättern, Titel und Sprung zur Bearbeitung. */

import { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Pencil, X } from 'lucide-react';
import { useImageUrl } from './Thumb';
import { useStudio } from '../../store/useStudio';

export function Lightbox({
  ids,
  index,
  onIndexChange,
  onClose,
  onEdit,
}: {
  ids: string[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  onEdit?: (id: string) => void;
}) {
  const id = ids[index];
  const url = useImageUrl(id, 'full');
  const meta = useStudio((s) => s.images.find((m) => m.id === id));

  const go = useCallback(
    (delta: number) => {
      if (!ids.length) return;
      onIndexChange((index + delta + ids.length) % ids.length);
    },
    [ids.length, index, onIndexChange],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
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

  if (!id) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-olive-900/95 animate-fadeIn">
      <header className="flex items-center gap-2 px-3 pt-safe">
        <div className="min-w-0 flex-1 py-3">
          <p className="truncate text-[15px] text-cream-100">{meta?.title ?? 'Bild'}</p>
          {meta && (
            <p className="truncate text-[13px] text-cream-100/55">
              {meta.width} × {meta.height} · {index + 1} von {ids.length}
            </p>
          )}
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(id)}
            className="touch-target grid place-items-center rounded-xl text-cream-100/80 hover:bg-cream-100/10 hover:text-cream-100 no-tap-highlight"
            aria-label="Bild bearbeiten"
          >
            <Pencil size={20} />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="touch-target grid place-items-center rounded-xl text-cream-100/80 hover:bg-cream-100/10 hover:text-cream-100 no-tap-highlight"
          aria-label="Schließen"
        >
          <X size={22} />
        </button>
      </header>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 pb-2">
        {url ? (
          <img src={url} alt={meta?.title ?? ''} className="max-h-full max-w-full object-contain" />
        ) : (
          <p className="text-cream-100/60">Bild wird geladen …</p>
        )}
      </div>

      {ids.length > 1 && (
        <div className="flex items-center justify-center gap-3 px-4 pb-safe">
          <button
            type="button"
            onClick={() => go(-1)}
            className="touch-target grid flex-1 place-items-center rounded-xl bg-cream-100/10 text-cream-100 hover:bg-cream-100/20 no-tap-highlight"
            aria-label="Vorheriges Bild"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="touch-target grid flex-1 place-items-center rounded-xl bg-cream-100/10 text-cream-100 hover:bg-cream-100/20 no-tap-highlight"
            aria-label="Nächstes Bild"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      )}
      <div className="h-3 pb-safe" />
    </div>,
    document.body,
  );
}
