/**
 * Bearbeitung der Bild-Metadaten (React Hook Form + Zod).
 * Speichert automatisch beim Verlassen des Feldes und beim Schließen.
 */

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Star, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Field, SelectInput, TagInput, TextInput, AutoTextarea } from '../ui/Fields';
import { Thumb } from './Thumb';
import { EntryLinkPicker } from '../entry/EntryLinkPicker';
import { confirm } from '../ui/Confirm';
import { useStudio } from '../../store/useStudio';
import { imageMetaSchema, type ImageMetaValues } from '../../lib/schemas';
import { ENTRY_STATUSES, type EntryStatus } from '../../types';
import { cx, formatBytes, formatDateTime } from '../../lib/utils';
import { orientationOf } from '../../lib/images';

export function ImageMetaEditor({
  imageId,
  onClose,
}: {
  imageId: string | null;
  onClose: () => void;
}) {
  const meta = useStudio((s) => s.images.find((m) => m.id === imageId));
  const entries = useStudio((s) => s.entries);
  const updateImage = useStudio((s) => s.updateImage);
  const deleteImage = useStudio((s) => s.deleteImage);
  const notify = useStudio((s) => s.notify);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);

  const defaults = useMemo<ImageMetaValues>(
    () => ({
      title: meta?.title ?? '',
      description: meta?.description ?? '',
      category: meta?.category ?? '',
      prompt: meta?.prompt ?? '',
      negativePrompt: meta?.negativePrompt ?? '',
      source: meta?.source ?? '',
      status: meta?.status ?? 'Idee',
      tags: meta?.tags ?? [],
    }),
    [meta],
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ImageMetaValues>({
    resolver: zodResolver(imageMetaSchema),
    defaultValues: defaults,
    mode: 'onBlur',
  });

  useEffect(() => reset(defaults), [defaults, reset]);

  const tags = watch('tags');

  if (!imageId || !meta) return null;

  const save = handleSubmit(
    (values) => {
      updateImage(meta.id, { ...values, status: values.status as EntryStatus });
      notify('Bild gespeichert.', 'success');
      onClose();
    },
    () => notify('Bitte die markierten Felder prüfen.', 'error'),
  );

  const linked = entries.filter((e) => meta.linkedEntryIds.includes(e.id));

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title="Bild bearbeiten"
        description={meta.fileName}
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="btn-danger mr-auto"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Bild löschen?',
                  message:
                    'Das Bild wird endgültig entfernt und aus allen Einträgen und Blöcken herausgenommen.',
                  confirmLabel: 'Endgültig löschen',
                  danger: true,
                });
                if (!ok) return;
                await deleteImage(meta.id);
                onClose();
              }}
            >
              <Trash2 size={18} /> Löschen
            </button>
            <button type="button" className="btn-ghost" onClick={onClose}>
              Abbrechen
            </button>
            <button type="button" className="btn-accent" onClick={() => void save()}>
              Speichern
            </button>
          </>
        }
      >
        <div className="grid gap-5 sm:grid-cols-[220px_1fr]">
          <div>
            <Thumb imageId={meta.id} alt={meta.title} className="aspect-square w-full" />
            <dl className="mt-3 space-y-1 text-[13px] text-ink-muted">
              <div className="flex justify-between gap-2">
                <dt>Maße</dt>
                <dd className="text-ink">
                  {meta.width} × {meta.height}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Orientierung</dt>
                <dd className="text-ink">{orientationOf(meta)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Größe</dt>
                <dd className="text-ink">{formatBytes(meta.size)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Hinzugefügt</dt>
                <dd className="text-ink">{formatDateTime(meta.createdAt)}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => updateImage(meta.id, { favorite: !meta.favorite })}
              className={cx(
                'btn mt-3 w-full',
                meta.favorite ? 'btn-accent' : 'btn-ghost',
              )}
            >
              <Star size={18} className={meta.favorite ? 'fill-current' : ''} />
              {meta.favorite ? 'Favorit' : 'Als Favorit'}
            </button>
          </div>

          <div className="space-y-4">
            <Field label="Titel" error={errors.title?.message}>
              <TextInput {...register('title')} placeholder="Bildtitel" />
            </Field>

            <Field label="Beschreibung" error={errors.description?.message}>
              <AutoTextarea {...register('description')} placeholder="Was ist zu sehen?" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Kategorie" error={errors.category?.message}>
                <TextInput {...register('category')} placeholder="z. B. Umgebung" />
              </Field>
              <Field label="Status">
                <SelectInput {...register('status')}>
                  {ENTRY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>

            <Field label="Schlagworte">
              <TagInput value={tags} onChange={(v) => setValue('tags', v, { shouldDirty: true })} />
            </Field>

            <Field label="Prompt" error={errors.prompt?.message}>
              <AutoTextarea {...register('prompt')} placeholder="Womit wurde das Bild erzeugt?" />
            </Field>

            <Field label="Negativer Prompt" error={errors.negativePrompt?.message}>
              <AutoTextarea {...register('negativePrompt')} minRows={2} />
            </Field>

            <Field label="Quelle" error={errors.source?.message}>
              <TextInput {...register('source')} placeholder="Modell, Link oder eigene Zeichnung" />
            </Field>

            <div>
              <span className="label-base">Verknüpfte Einträge</span>
              <div className="flex flex-wrap gap-1.5">
                {linked.map((e) => (
                  <span key={e.id} className="chip">
                    {e.title}
                  </span>
                ))}
                <button type="button" className="chip hover:bg-cream-200" onClick={() => setLinkPickerOpen(true)}>
                  Verknüpfungen bearbeiten
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <EntryLinkPicker
        open={linkPickerOpen}
        onClose={() => setLinkPickerOpen(false)}
        selected={meta.linkedEntryIds}
        onChange={(ids) => updateImage(meta.id, { linkedEntryIds: ids })}
        title="Bild verknüpfen"
      />
    </>
  );
}
