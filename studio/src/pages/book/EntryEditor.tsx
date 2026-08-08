/**
 * Die Seite im Bearbeitungszustand.
 *
 * Bewusst ein anderer Ort: Das Papier bleibt, aber jetzt sind Felder sichtbar.
 * Solange man hier ist, arbeitet man; sobald man fertig ist, ist es wieder ein
 * Buch. Deshalb steht „Fertig“ oben und nicht irgendwo unten.
 *
 * Die Maschine dahinter ist unverändert: dieselben Felder, dieselben Blöcke,
 * dieselben Beziehungen wie zuvor.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen, Check, Copy, ImagePlus, Trash2 } from 'lucide-react';
import type { Entry, EntryStatus } from '../../types';
import { ENTRY_STATUSES } from '../../types';
import { useStudio } from '../../store/useStudio';
import { templateFor } from '../../lib/templates';
import { entryMetaSchema, type EntryMetaValues } from '../../lib/schemas';
import { allTags } from '../../lib/search';
import { AutoTextarea, Field, SelectInput, TagInput, TextInput } from '../../components/ui/Fields';
import { EntryFields } from '../../components/entry/EntryFields';
import { BlockEditor } from '../../components/blocks/BlockEditor';
import { RelationPanel } from '../../components/relations/RelationPanel';
import { PipelineBar } from '../../components/entry/PipelineBar';
import { ImagePicker } from '../../components/images/ImagePicker';
import { Thumb } from '../../components/images/Thumb';
import { confirm } from '../../components/ui/Confirm';
import { Spread } from '../../components/book/Spread';

export function EntryEditor({
  entry,
  onDone,
  pageLeft,
}: {
  entry: Entry;
  onDone: () => void;
  pageLeft: number;
}) {
  const navigate = useNavigate();
  const entries = useStudio((s) => s.entries);
  const images = useStudio((s) => s.images);
  const updateEntry = useStudio((s) => s.updateEntry);
  const duplicateEntry = useStudio((s) => s.duplicateEntry);
  const deleteEntry = useStudio((s) => s.deleteEntry);
  const notify = useStudio((s) => s.notify);

  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const tpl = templateFor(entry.type);

  const defaults = useMemo<EntryMetaValues>(
    () => ({
      title: entry.title,
      subtitle: entry.subtitle ?? '',
      category: entry.category ?? '',
      description: entry.description ?? '',
      status: entry.status,
      tags: entry.tags ?? [],
      beginn: entry.beginn ?? '',
      ende: entry.ende ?? '',
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entry.id],
  );

  const {
    register,
    setValue,
    watch,
    reset,
    getValues,
    formState: { errors },
  } = useForm<EntryMetaValues>({
    resolver: zodResolver(entryMetaSchema),
    defaultValues: defaults,
    mode: 'onBlur',
  });

  useEffect(() => reset(defaults), [defaults, reset]);

  const tags = watch('tags');
  const tagSuggestions = useMemo(() => allTags(entries, images), [entries, images]);

  const commit = () => {
    const values = getValues();
    const title = values.title.trim();
    if (!title) {
      notify('Ein Titel ist nötig – bitte etwas eintragen.', 'error');
      return;
    }
    updateEntry(entry.id, {
      title,
      subtitle: values.subtitle,
      category: values.category,
      description: values.description,
      status: values.status as EntryStatus,
      tags: values.tags,
      beginn: values.beginn.trim(),
      ende: values.ende.trim(),
    });
  };

  const finish = () => {
    commit();
    onDone();
  };

  return (
    <>
      <Spread
        pageLeft={pageLeft}
        left={
          <>
            {/* Kopfzeile der Werkbank */}
            <div className="mb-6 flex items-center justify-between gap-3 border-b border-paper-300/70 pb-3">
              <p className="rubric">{tpl.label} bearbeiten</p>
              <button
                type="button"
                onClick={finish}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-gild-500/40 px-4 font-serif text-[14px] text-gild-600 transition-colors hover:bg-gild-400/10 no-tap-highlight"
              >
                <Check size={15} /> Fertig
              </button>
            </div>

            <Field label="Titel" error={errors.title?.message}>
              <TextInput {...register('title')} onBlur={commit} placeholder="Titel" />
            </Field>

            <Field label="Untertitel" className="mt-4">
              <TextInput {...register('subtitle')} onBlur={commit} placeholder="Untertitel" />
            </Field>

            {/*
              Wann in der Welt.
              Beide dürfen leer bleiben – ein Ort ohne Ende besteht bis heute,
              eine Figur ohne Anfang war immer schon da. Das ist eine Aussage,
              kein fehlender Wert, und wird auf dem Zeitstrahl auch so
              gezeichnet: offen.
            */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Field label="Beginn">
                <TextInput {...register('beginn')} onBlur={commit} placeholder="1032" />
              </Field>
              <Field label="Ende">
                <TextInput {...register('ende')} onBlur={commit} placeholder="1078" />
              </Field>
            </div>
            <p className="mt-1.5 font-serif text-[12.5px] italic leading-relaxed text-ink-faint">
              Zeit in der Welt, nicht am Schreibtisch. Ein Jahr genügt; genauer geht mit{' '}
              <span className="whitespace-nowrap">1032-04</span> oder{' '}
              <span className="whitespace-nowrap">12.4.1032</span>.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Kategorie" error={errors.category?.message}>
                <TextInput {...register('category')} onBlur={commit} list={`cats-${entry.type}`} />
                <datalist id={`cats-${entry.type}`}>
                  {tpl.categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>

              <Field label="Status">
                <SelectInput
                  {...register('status')}
                  onChange={(e) => {
                    setValue('status', e.target.value);
                    updateEntry(entry.id, { status: e.target.value as EntryStatus });
                  }}
                >
                  {ENTRY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>

            <Field label="Beschreibung" error={errors.description?.message} className="mt-4">
              <AutoTextarea
                {...register('description')}
                onBlur={commit}
                placeholder="Worum geht es hier?"
                minRows={5}
              />
            </Field>

            <Field label="Schlagworte" className="mt-4">
              <TagInput
                value={tags}
                suggestions={tagSuggestions}
                onChange={(v) => {
                  setValue('tags', v);
                  updateEntry(entry.id, { tags: v });
                }}
              />
            </Field>

            {tpl.fields.length > 0 && (
              <section className="mt-8 border-t border-paper-300/70 pt-6">
                <p className="rubric mb-4">{tpl.label}-Angaben</p>
                <EntryFields entry={entry} />
              </section>
            )}

            <section className="mt-8 border-t border-paper-300/70 pt-6">
              <p className="rubric mb-4">Seiteninhalt</p>
              <BlockEditor entry={entry} />
            </section>
          </>
        }
        right={
          <>
            {/* Tafel */}
            <section>
              <p className="rubric mb-2">Tafel</p>
              {entry.coverImage ? (
                <div>
                  <Thumb
                    imageId={entry.coverImage}
                    alt={entry.title}
                    className="max-h-[280px] w-full rounded-[2px]"
                    rounded="rounded-[2px]"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="btn-ghost h-10 min-h-0 px-3 text-[14px]"
                      onClick={() => setCoverPickerOpen(true)}
                    >
                      Ersetzen
                    </button>
                    <button
                      type="button"
                      className="btn-ghost h-10 min-h-0 px-3 text-[14px]"
                      onClick={() => updateEntry(entry.id, { coverImage: undefined })}
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCoverPickerOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-[2px] border border-dashed border-paper-400/70 py-10 font-serif text-[15px] text-ink-muted transition-colors hover:border-gild-500/50 hover:text-ink"
                >
                  <ImagePlus size={18} /> Tafel wählen
                </button>
              )}
            </section>

            {entry.type === 'asset' && (
              <section className="mt-8">
                <p className="rubric mb-3">Produktionsstufe</p>
                <PipelineBar entry={entry} />
              </section>
            )}

            <section className="mt-8">
              <p className="rubric mb-3">Verbindungen</p>
              <RelationPanel entry={entry} />
            </section>

            <section className="mt-10 border-t border-paper-300/70 pt-5">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-ghost h-10 min-h-0 px-3 text-[14px]"
                  onClick={async () => {
                    const copy = await duplicateEntry(entry.id);
                    if (copy) navigate(`/eintrag/${copy.id}`);
                  }}
                >
                  <Copy size={15} /> Duplizieren
                </button>
                <button
                  type="button"
                  className="btn-ghost h-10 min-h-0 px-3 text-[14px]"
                  onClick={finish}
                >
                  <BookOpen size={15} /> Lesen
                </button>
                <button
                  type="button"
                  className="btn-danger ml-auto h-10 min-h-0 px-3 text-[14px]"
                  onClick={async () => {
                    const ok = await confirm({
                      title: `„${entry.title}“ aus dem Buch nehmen?`,
                      message:
                        'Die Seite wandert in den Papierkorb. Beziehungen und Fassungen bleiben erhalten – die Chronik im Anhang holt sie zurück.',
                      confirmLabel: 'In den Papierkorb',
                      danger: true,
                    });
                    if (!ok) return;
                    await deleteEntry(entry.id);
                    navigate('/inhalt');
                  }}
                >
                  <Trash2 size={15} /> Entfernen
                </button>
              </div>
            </section>
          </>
        }
      />

      <ImagePicker
        open={coverPickerOpen}
        onClose={() => setCoverPickerOpen(false)}
        title="Tafel wählen"
        onSelect={(ids) => ids[0] && updateEntry(entry.id, { coverImage: ids[0] })}
      />
    </>
  );
}
