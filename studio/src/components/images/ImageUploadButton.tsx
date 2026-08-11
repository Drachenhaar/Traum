/**
 * Bilder auswählen – öffnet auf dem iPhone die Fotomediathek bzw. Dateien-App.
 * `multiple` erlaubt mehrere Bilder auf einmal.
 */

import { useRef, useState, type ReactNode } from 'react';
import { importImageFiles } from '../../lib/images';
import { useStudio } from '../../store/useStudio';
import type { StoredImageMeta } from '../../types';
import { cx } from '../../lib/utils';

export function ImageUploadButton({
  onImported,
  children,
  className = 'btn-accent',
  multiple = true,
  category,
  linkedEntryIds,
}: {
  onImported?: (metas: StoredImageMeta[]) => void;
  children: ReactNode;
  className?: string;
  multiple?: boolean;
  category?: string;
  linkedEntryIds?: string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const addImages = useStudio((s) => s.addImages);
  const notify = useStudio((s) => s.notify);
  /* Ein Bild kommt in das Buch, das gerade offen liegt – wie eine Tafel. */
  const bookId = useStudio((s) => s.activeBookId);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    try {
      const { metas, errors } = await importImageFiles(Array.from(fileList), {
        category,
        linkedEntryIds,
        bookId,
      });
      if (metas.length) {
        addImages(metas);
        onImported?.(metas);
        notify(
          metas.length === 1 ? 'Bild gespeichert.' : `${metas.length} Bilder gespeichert.`,
          'success',
        );
      }
      errors.forEach((e) => notify(e, 'error'));
      if (!metas.length && !errors.length) notify('Keine Bilder gefunden.', 'error');
    } catch (err) {
      notify(`Import fehlgeschlagen: ${(err as Error).message}`, 'error');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <button
        type="button"
        className={cx(className)}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? 'Lädt …' : children}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </>
  );
}
