/**
 * Eigene Eintragstypen.
 *
 * Der Beweis, dass Typen wirklich Daten sind: hier legt der Nutzer eine neue
 * Inhaltsart an – mit Feldern, Symbol und Farbe – und sie verhält sich danach
 * exakt wie die eingebauten. Kein Update nötig.
 */

import { useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useStudio } from '../../store/useStudio';
import { Modal } from '../ui/Modal';
import { confirm } from '../ui/Confirm';
import { Field, SelectInput, TextInput } from '../ui/Fields';
import { ICON_NAMES, iconByName } from '../../lib/icons';
import { allTemplates } from '../../lib/templates';
import type { CustomTypeDef } from '../../types';
import { cx } from '../../lib/utils';

const FIELD_KINDS: { value: string; label: string }[] = [
  { value: 'text', label: 'Kurzer Text' },
  { value: 'textarea', label: 'Langer Text' },
  { value: 'tags', label: 'Schlagworte' },
  { value: 'boolean', label: 'Ja / Nein' },
  { value: 'images', label: 'Bilder' },
  { value: 'palette', label: 'Farbpalette' },
];

const ACCENTS = ['#A8853F', '#55604A', '#8C6D31', '#6B5B45', '#9C86B0', '#5E6B7A', '#8B6A4F', '#7A8467'];

const EMPTY: CustomTypeDef = {
  type: '',
  label: '',
  labelPlural: '',
  newTitle: '',
  icon: 'Circle',
  accent: ACCENTS[0],
  categories: [],
  fields: [],
};

export function CustomTypes() {
  const settings = useStudio((s) => s.settings);
  const entries = useStudio((s) => s.entries);
  const saveCustomType = useStudio((s) => s.saveCustomType);
  const removeCustomType = useStudio((s) => s.removeCustomType);
  const notify = useStudio((s) => s.notify);

  const [editing, setEditing] = useState<CustomTypeDef | null>(null);
  const [isNew, setIsNew] = useState(false);
  const custom = settings.customTypes ?? [];

  const startNew = () => {
    setEditing({ ...EMPTY });
    setIsNew(true);
  };

  const save = () => {
    if (!editing) return;
    const label = editing.label.trim();
    if (!label) {
      notify('Der Typ braucht einen Namen.', 'error');
      return;
    }
    const type =
      editing.type ||
      `custom_${label.toLowerCase().replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')}_${Date.now().toString(36).slice(-4)}`;

    // Kein bestehender Typ darf überschrieben werden.
    if (isNew && allTemplates().some((t) => t.type === type)) {
      notify('Diesen Typ gibt es schon.', 'error');
      return;
    }

    saveCustomType({
      ...editing,
      type,
      label,
      labelPlural: editing.labelPlural.trim() || label,
      newTitle: editing.newTitle.trim() || `Neu: ${label}`,
      fields: editing.fields.filter((f) => f.label.trim()),
    });
    setEditing(null);
  };

  return (
    <section className="card p-4 sm:p-5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="font-serif text-xl text-ink">Eigene Eintragstypen</h2>
        <button type="button" className="btn-ghost h-10 min-h-0 px-3 text-[14px]" onClick={startNew}>
          <Plus size={16} /> Typ anlegen
        </button>
      </div>
      <p className="mb-4 text-[15px] text-ink-muted">
        Fehlt eine Inhaltsart – Fahrzeuge, Rezepte, Sprachen? Lege sie hier an. Sie verhält sich
        danach wie jede eingebaute Art: eigene Felder, eigener Platz in der Bibliothek, eigener
        Knoten im Graphen.
      </p>

      {custom.length === 0 ? (
        <p className="rounded-xl border border-dashed border-lineStrong px-4 py-5 text-center text-[15px] text-ink-muted">
          Noch kein eigener Typ. Die eingebauten decken schon viel ab – aber deine Welt darf mehr
          sein.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {custom.map((def) => {
            const Icon = iconByName(def.icon);
            const count = entries.filter((e) => e.type === def.type && !e.deletedAt).length;
            return (
              <li key={def.type} className="flex items-center gap-3 bg-cream-50 px-3 py-2.5">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                  style={{ background: `${def.accent}1F`, color: def.accent }}
                >
                  <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] text-ink">{def.labelPlural}</p>
                  <p className="text-[13px] text-ink-muted">
                    {def.fields.length} Felder · {count} {count === 1 ? 'Eintrag' : 'Einträge'}
                  </p>
                </div>
                <button
                  type="button"
                  className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-cream-200 hover:text-ink"
                  aria-label="Typ bearbeiten"
                  onClick={() => {
                    setEditing({ ...def, fields: def.fields.map((f) => ({ ...f })) });
                    setIsNew(false);
                  }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-cream-200 hover:text-red-700"
                  aria-label="Typ entfernen"
                  onClick={async () => {
                    const ok = await confirm({
                      title: `„${def.label}“ entfernen?`,
                      message:
                        count > 0
                          ? `${count} Einträge behalten ihre Daten, verlieren aber ihre Feldbeschriftungen. Rückgängig geht nur, indem du den Typ neu anlegst.`
                          : 'Der Typ wird aus der Auswahl entfernt.',
                      confirmLabel: 'Entfernen',
                      danger: true,
                    });
                    if (ok) removeCustomType(def.type);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* --------------------------------------------------------- Bearbeiten */}
      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={isNew ? 'Neuer Eintragstyp' : 'Typ bearbeiten'}
        size="md"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>
              Abbrechen
            </button>
            <button type="button" className="btn-accent" onClick={save}>
              Speichern
            </button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name (Einzahl)">
                <TextInput
                  value={editing.label}
                  onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                  placeholder="z. B. Fahrzeug"
                  autoFocus
                />
              </Field>
              <Field label="Name (Mehrzahl)">
                <TextInput
                  value={editing.labelPlural}
                  onChange={(e) => setEditing({ ...editing, labelPlural: e.target.value })}
                  placeholder="z. B. Fahrzeuge"
                />
              </Field>
            </div>

            <Field label="Titel neuer Einträge" hint="Was im Titelfeld steht, bevor du es überschreibst.">
              <TextInput
                value={editing.newTitle}
                onChange={(e) => setEditing({ ...editing, newTitle: e.target.value })}
                placeholder="z. B. Neues Fahrzeug"
              />
            </Field>

            <div>
              <p className="label-base">Farbe</p>
              <div className="flex flex-wrap gap-1.5">
                {ACCENTS.map((accent) => (
                  <button
                    key={accent}
                    type="button"
                    onClick={() => setEditing({ ...editing, accent })}
                    className={cx(
                      'h-10 w-10 rounded-xl border-2 transition-transform',
                      editing.accent === accent ? 'border-ink scale-105' : 'border-transparent',
                    )}
                    style={{ background: accent }}
                    aria-label={`Farbe ${accent}`}
                  />
                ))}
              </div>
            </div>

            <Field label="Symbol">
              <SelectInput
                value={editing.icon}
                onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
              >
                {ICON_NAMES.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </SelectInput>
            </Field>

            {/* Felder */}
            <div>
              <p className="label-base">Felder</p>
              <div className="space-y-2">
                {editing.fields.map((field, i) => (
                  <div key={i} className="flex gap-2">
                    <TextInput
                      value={field.label}
                      placeholder="Feldname"
                      onChange={(e) => {
                        const fields = editing.fields.slice();
                        fields[i] = {
                          ...fields[i],
                          label: e.target.value,
                          key: fields[i].key || `f${i}_${Date.now().toString(36).slice(-4)}`,
                        };
                        setEditing({ ...editing, fields });
                      }}
                    />
                    <SelectInput
                      value={field.kind}
                      className="max-w-[150px]"
                      onChange={(e) => {
                        const fields = editing.fields.slice();
                        fields[i] = { ...fields[i], kind: e.target.value };
                        setEditing({ ...editing, fields });
                      }}
                    >
                      {FIELD_KINDS.map((k) => (
                        <option key={k.value} value={k.value}>
                          {k.label}
                        </option>
                      ))}
                    </SelectInput>
                    <button
                      type="button"
                      className="touch-target grid shrink-0 place-items-center rounded-lg text-ink-faint hover:bg-cream-200 hover:text-red-700"
                      aria-label="Feld entfernen"
                      onClick={() =>
                        setEditing({ ...editing, fields: editing.fields.filter((_, x) => x !== i) })
                      }
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn-ghost mt-2 w-full"
                onClick={() =>
                  setEditing({
                    ...editing,
                    fields: [
                      ...editing.fields,
                      { key: `f${editing.fields.length}_${Date.now().toString(36).slice(-4)}`, label: '', kind: 'text' },
                    ],
                  })
                }
              >
                <Plus size={18} /> Feld hinzufügen
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
