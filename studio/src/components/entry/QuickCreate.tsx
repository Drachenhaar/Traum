/** „Neu“-Dialog: Eintragstyp wählen und direkt in die Bearbeitung springen. */

import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { ImageUploadButton } from '../images/ImageUploadButton';
import { useStudio } from '../../store/useStudio';
import { TEMPLATE_LIST } from '../../lib/templates';
import { iconByName } from '../../lib/icons';

export function QuickCreate({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createEntry = useStudio((s) => s.createEntry);
  const notify = useStudio((s) => s.notify);
  const navigate = useNavigate();

  const create = async (type: (typeof TEMPLATE_LIST)[number]['type']) => {
    const entry = await createEntry(type);
    onClose();
    navigate(`/eintrag/${entry.id}`);
    notify('Angelegt. Titel und Felder lassen sich jetzt ausfüllen.', 'success');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Neu anlegen"
      description="Was möchtest du hinzufügen?"
      size="lg"
      footer={
        <ImageUploadButton
          className="btn-ghost w-full sm:w-auto"
          onImported={() => {
            onClose();
            navigate('/bilder');
          }}
        >
          Stattdessen Bilder importieren
        </ImageUploadButton>
      }
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {TEMPLATE_LIST.map((tpl) => {
          const Icon = iconByName(tpl.icon);
          return (
            <button
              key={tpl.type}
              type="button"
              onClick={() => void create(tpl.type)}
              className="flex min-h-[84px] flex-col items-start gap-1.5 rounded-xl border border-line bg-cream-50 p-3 text-left transition-all duration-200 ease-calm hover:border-brass-400 hover:bg-cream-200 active:scale-[0.99]"
            >
              <Icon size={20} className="text-brass-600" />
              <span className="text-[15px] font-medium text-ink">{tpl.label}</span>
              <span className="text-[13px] leading-snug text-ink-muted">
                {tpl.fields.length ? `${tpl.fields.length} Felder` : 'Freie Seite'}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
