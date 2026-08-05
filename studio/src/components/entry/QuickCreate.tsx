/** „Neu“-Dialog: nach Familien geordnet, damit die Auswahl trotz vieler Typen ruhig bleibt. */

import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { ImageUploadButton } from '../images/ImageUploadButton';
import { useStudio } from '../../store/useStudio';
import { templatesByFamily } from '../../lib/templates';
import { iconByName } from '../../lib/icons';

export function QuickCreate({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createEntry = useStudio((s) => s.createEntry);
  const navigate = useNavigate();
  const families = templatesByFamily();

  const create = async (type: string) => {
    const entry = await createEntry(type);
    onClose();
    navigate(`/eintrag/${entry.id}`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Was entsteht gerade?"
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
      <div className="space-y-5">
        {families.map((family) => (
          <section key={family.family}>
            <h3 className="mb-2 text-[13px] font-medium uppercase tracking-wide text-ink-muted">
              {family.label}
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {family.items.map((tpl) => {
                const Icon = iconByName(tpl.icon);
                return (
                  <button
                    key={tpl.type}
                    type="button"
                    onClick={() => void create(tpl.type)}
                    className="group flex min-h-[72px] flex-col items-start gap-1 rounded-xl border border-line bg-cream-50 p-3 text-left transition-all duration-200 ease-calm hover:-translate-y-0.5 hover:border-brass-400 hover:shadow-card active:scale-[0.99]"
                  >
                    <span
                      className="grid h-8 w-8 place-items-center rounded-lg transition-transform duration-200 ease-calm group-hover:scale-105"
                      style={{ background: `${tpl.accent}1F`, color: tpl.accent }}
                    >
                      <Icon size={17} />
                    </span>
                    <span className="text-[15px] font-medium text-ink">{tpl.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  );
}
