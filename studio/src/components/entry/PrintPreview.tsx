/**
 * Druckfreundliche HTML-Ansicht eines Eintrags.
 *
 * Die Seite wird als eigenständiges HTML erzeugt (Bilder eingebettet) und in
 * einem iframe angezeigt. Von dort kann direkt gedruckt oder die Datei
 * heruntergeladen werden – die Grundlage für einen späteren PDF-Export.
 */

import { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { renderEntryHtml } from '../../lib/portability';
import { downloadFile } from '../../lib/utils';
import { useStudio } from '../../store/useStudio';
import type { Entry } from '../../types';

export function PrintPreview({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const notify = useStudio((s) => s.notify);

  useEffect(() => {
    let active = true;
    renderEntryHtml(entry)
      .then((result) => active && setHtml(result))
      .catch((err) => active && setError((err as Error).message));
    return () => {
      active = false;
    };
  }, [entry]);

  const fileName = `${entry.title.replace(/[^\w\säöüÄÖÜß-]/g, '').trim().replace(/\s+/g, '-') || 'eintrag'}.html`;

  return (
    <Modal
      open
      onClose={onClose}
      title="Druckansicht"
      description={entry.title}
      size="xl"
      footer={
        <>
          <button
            type="button"
            className="btn-ghost"
            disabled={!html}
            onClick={() => {
              if (!html) return;
              downloadFile(fileName, html, 'text/html');
              notify('HTML-Datei gesichert.', 'success');
            }}
          >
            <Download size={18} /> Als HTML sichern
          </button>
          <button
            type="button"
            className="btn-accent"
            disabled={!html}
            onClick={() => {
              const frame = document.getElementById('print-frame') as HTMLIFrameElement | null;
              frame?.contentWindow?.focus();
              frame?.contentWindow?.print();
            }}
          >
            <Printer size={18} /> Drucken
          </button>
        </>
      }
    >
      {error ? (
        <p className="text-[15px] text-red-700">Die Druckansicht konnte nicht erzeugt werden: {error}</p>
      ) : !html ? (
        <p className="py-10 text-center text-[15px] text-ink-muted">Ansicht wird vorbereitet …</p>
      ) : (
        <iframe
          id="print-frame"
          title="Druckansicht"
          srcDoc={html}
          className="h-[65vh] w-full rounded-xl border border-line bg-white"
        />
      )}
    </Modal>
  );
}
