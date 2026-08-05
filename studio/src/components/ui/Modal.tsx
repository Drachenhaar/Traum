/**
 * Modal / Bottom-Sheet.
 *
 * Auf dem Desktop ein zentrierter Dialog, auf dem iPhone ein von unten
 * einfahrendes Blatt, das den Bildschirm möglichst vollständig nutzt.
 * Der Inhalt scrollt eigenständig, damit die Tastatur nichts verdeckt.
 */

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx } from '../../lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Breite des Dialogs auf großen Bildschirmen */
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
};

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  // Hintergrund nicht mitscrollen lassen und Escape zum Schließen erlauben.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-olive-900/45 backdrop-blur-[2px] animate-fadeIn"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'relative flex max-h-[92vh] w-full flex-col overflow-hidden bg-cream-100 shadow-panel',
          'rounded-t-2xl sm:rounded-2xl animate-slideUp sm:animate-riseIn',
          SIZES[size],
        )}
      >
        <header className="flex items-start gap-3 border-b border-line px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-serif text-xl text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target -mr-2 grid place-items-center rounded-xl text-ink-muted transition-colors hover:bg-cream-200 hover:text-ink no-tap-highlight"
            aria-label="Schließen"
          >
            <X size={20} />
          </button>
        </header>

        <div className="scroll-slim flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {children}
        </div>

        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-cream-50 px-4 py-3 pb-safe sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
