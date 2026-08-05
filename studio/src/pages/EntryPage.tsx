/**
 * Detailansicht eines Eintrags.
 *
 * Aufbau:
 *  1. Kopf mit Titelbild, Titel, Status und Aktionen
 *  2. Stammdaten (React Hook Form + Zod, speichert beim Verlassen des Feldes)
 *  3. Typspezifische Felder aus der Vorlage
 *  4. Frei anordenbare Blöcke
 *  5. Verwandte Inhalte
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  Copy,
  Download,
  FileCode2,
  ImagePlus,
  Link2,
  MoreHorizontal,
  Star,
  Trash2,
} from 'lucide-react';
import { useStudio } from '../store/useStudio';
import { templateFor } from '../lib/templates';
import { entryMetaSchema, type EntryMetaValues } from '../lib/schemas';
import { ENTRY_STATUSES, type EntryStatus } from '../types';
import { AutoTextarea, Field, SelectInput, TagInput, TextInput } from '../components/ui/Fields';
import { EntryFields } from '../components/entry/EntryFields';
import { BlockEditor } from '../components/blocks/BlockEditor';
import { EntryLinkPicker } from '../components/entry/EntryLinkPicker';
import { Thumb } from '../components/images/Thumb';
import { ImagePicker } from '../components/images/ImagePicker';
import { Modal } from '../components/ui/Modal';
import { confirm } from '../components/ui/Confirm';
import { StatusPill } from '../components/entry/StatusPill';
import { PrintPreview } from '../components/entry/PrintPreview';
import { buildEntryExport } from '../lib/portability';
import { allTags } from '../lib/search';
import { cx, downloadFile, formatDateTime } from '../lib/utils';

export function EntryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const entry = useStudio((s) => s.entries.find((e) => e.id === id));
  const entries = useStudio((s) => s.entries);
  const images = useStudio((s) => s.images);
  const updateEntry = useStudio((s) => s.updateEntry);
  const duplicateEntry = useStudio((s) => s.duplicateEntry);
  const deleteEntry = useStudio((s) => s.deleteEntry);
  const toggleFavorite = useStudio((s) => s.toggleFavorite);
  const linkEntries = useStudio((s) => s.linkEntries);
  const unlinkEntries = useStudio((s) => s.unlinkEntries);
  const notify = useStudio((s) => s.notify);

  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  const defaults = useMemo<EntryMetaValues>(
    () => ({
      title: entry?.title ?? '',
      subtitle: entry?.subtitle ?? '',
      category: entry?.category ?? '',
      description: entry?.description ?? '',
      status: entry?.status ?? 'Idee',
      tags: entry?.tags ?? [],
    }),
    // Nur bei Wechsel des Eintrags neu befüllen, damit Tippen nicht überschrieben wird.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entry?.id],
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

  if (!entry) {
    return (
      <div className="py-20 text-center">
        <h1 className="font-serif text-2xl text-ink">Eintrag nicht gefunden</h1>
        <p className="mt-2 text-[15px] text-ink-muted">
          Er wurde vermutlich gelöscht. Zurück zur Übersicht?
        </p>
        <Link to="/" className="btn-accent mt-5 inline-flex">
          Zur Startseite
        </Link>
      </div>
    );
  }

  const tpl = templateFor(entry.type);
  const linked = entries.filter((e) => entry.linkedEntryIds.includes(e.id));

  /** Stammdaten übernehmen – wird beim Verlassen jedes Feldes aufgerufen. */
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
    });
  };

  const exportJson = async () => {
    const json = await buildEntryExport(entry);
    downloadFile(
      `${entry.title.replace(/[^\w\säöüÄÖÜß-]/g, '').trim().replace(/\s+/g, '-') || 'eintrag'}.json`,
      json,
      'application/json',
    );
    notify('Eintrag als JSON gesichert.', 'success');
  };

  return (
    <div className="pb-6">
      {/* --------------------------------------------------------------- Kopf */}
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="touch-target grid place-items-center rounded-xl text-ink-muted transition-colors hover:bg-cream-200 hover:text-ink"
          aria-label="Zurück"
        >
          <ArrowLeft size={20} />
        </button>
        <span className="text-[13px] uppercase tracking-wide text-ink-muted">{tpl.label}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => toggleFavorite(entry.id)}
            className={cx(
              'touch-target grid place-items-center rounded-xl transition-colors',
              entry.favorite ? 'text-brass-500' : 'text-ink-muted hover:bg-cream-200 hover:text-brass-600',
            )}
            aria-label={entry.favorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
          >
            <Star size={20} className={entry.favorite ? 'fill-current' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="touch-target grid place-items-center rounded-xl text-ink-muted transition-colors hover:bg-cream-200 hover:text-ink"
            aria-label="Aktionen für diesen Eintrag"
          >
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* Titelbild */}
      <div className="mb-5 overflow-hidden rounded-2xl border border-line bg-cream-50">
        {entry.coverImage ? (
          <div className="relative">
            <Thumb imageId={entry.coverImage} alt={entry.title} className="max-h-[320px] w-full" rounded="rounded-none" />
            <div className="absolute right-2 top-2 flex gap-1.5">
              <button type="button" className="btn-ghost h-10 min-h-0 px-3 text-[14px]" onClick={() => setCoverPickerOpen(true)}>
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
            className="flex w-full items-center justify-center gap-2 py-8 text-[15px] text-ink-muted transition-colors hover:bg-cream-200"
          >
            <ImagePlus size={20} /> Titelbild wählen
          </button>
        )}
      </div>

      {/* ------------------------------------------------------- Stammdaten */}
      <section className="card mb-5 p-4 sm:p-5">
        <input
          {...register('title')}
          onBlur={commit}
          placeholder="Titel"
          className="w-full border-0 bg-transparent px-0 py-1 font-serif text-[28px] leading-tight text-ink outline-none placeholder:text-ink-faint sm:text-[32px]"
        />
        {errors.title && <p className="text-[13px] text-red-700">{errors.title.message}</p>}

        <input
          {...register('subtitle')}
          onBlur={commit}
          placeholder="Untertitel"
          className="mt-1 w-full border-0 bg-transparent px-0 py-1 text-[16px] text-ink-muted outline-none placeholder:text-ink-faint"
        />

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Kategorie" error={errors.category?.message}>
            <TextInput
              {...register('category')}
              onBlur={commit}
              list={`cats-${entry.type}`}
              placeholder="z. B. Hauptfigur"
            />
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

        <p className="mt-4 border-t border-line pt-3 text-[13px] text-ink-faint">
          Angelegt {formatDateTime(entry.createdAt)} · Zuletzt geändert {formatDateTime(entry.updatedAt)}
        </p>
      </section>

      {/* --------------------------------------------- Felder aus der Vorlage */}
      {tpl.fields.length > 0 && (
        <section className="card mb-5 p-4 sm:p-5">
          <h2 className="mb-4 font-serif text-xl text-ink">{tpl.label}-Angaben</h2>
          <EntryFields entry={entry} />
        </section>
      )}

      {/* ------------------------------------------------------------ Blöcke */}
      <section className="mb-5">
        <h2 className="mb-3 font-serif text-xl text-ink">Seiteninhalt</h2>
        <BlockEditor entry={entry} />
      </section>

      {/* -------------------------------------------------- Verwandte Inhalte */}
      <section className="card p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-serif text-xl text-ink">Verwandte Inhalte</h2>
          <button type="button" className="btn-ghost h-10 min-h-0 px-3 text-[14px]" onClick={() => setLinkPickerOpen(true)}>
            <Link2 size={16} /> Verknüpfen
          </button>
        </div>

        {linked.length === 0 ? (
          <p className="text-[15px] text-ink-muted">
            Noch nichts verknüpft. Verbinde diesen Eintrag z. B. mit einem Ort, einem Prompt oder einem Asset.
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            {linked.map((e) => (
              <li key={e.id} className="flex items-center gap-3 bg-cream-50 px-3 py-2">
                <Thumb imageId={e.coverImage} alt="" className="h-10 w-10 shrink-0" />
                <Link to={`/eintrag/${e.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] text-ink hover:text-brass-600">{e.title}</span>
                  <span className="block truncate text-[13px] text-ink-muted">
                    {templateFor(e.type).label}
                    {e.category ? ` · ${e.category}` : ''}
                  </span>
                </Link>
                <StatusPill status={e.status} className="hidden sm:inline-flex" />
                <button
                  type="button"
                  onClick={() => unlinkEntries(entry.id, e.id)}
                  className="touch-target grid shrink-0 place-items-center rounded-lg text-ink-faint hover:bg-cream-200 hover:text-red-700"
                  aria-label="Verknüpfung lösen"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* --------------------------------------------------------- Dialoge */}
      <ImagePicker
        open={coverPickerOpen}
        onClose={() => setCoverPickerOpen(false)}
        title="Titelbild wählen"
        onSelect={(ids) => ids[0] && updateEntry(entry.id, { coverImage: ids[0] })}
      />

      <EntryLinkPicker
        open={linkPickerOpen}
        onClose={() => setLinkPickerOpen(false)}
        selected={entry.linkedEntryIds}
        excludeId={entry.id}
        onChange={(ids) => {
          // Verknüpfungen sind beidseitig – Unterschiede einzeln übernehmen.
          const added = ids.filter((i) => !entry.linkedEntryIds.includes(i));
          const removed = entry.linkedEntryIds.filter((i) => !ids.includes(i));
          added.forEach((i) => linkEntries(entry.id, i));
          removed.forEach((i) => unlinkEntries(entry.id, i));
        }}
      />

      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title={entry.title} size="sm">
        <div className="space-y-1.5">
          <button
            type="button"
            className="btn-ghost w-full justify-start"
            onClick={async () => {
              setMenuOpen(false);
              const copy = await duplicateEntry(entry.id);
              if (copy) navigate(`/eintrag/${copy.id}`);
            }}
          >
            <Copy size={18} /> Duplizieren
          </button>
          <button
            type="button"
            className="btn-ghost w-full justify-start"
            onClick={() => {
              setMenuOpen(false);
              void exportJson();
            }}
          >
            <Download size={18} /> Als JSON exportieren
          </button>
          <button
            type="button"
            className="btn-ghost w-full justify-start"
            onClick={() => {
              setMenuOpen(false);
              setPrintOpen(true);
            }}
          >
            <FileCode2 size={18} /> Druckansicht (HTML)
          </button>
          <button
            type="button"
            className="btn-danger w-full justify-start"
            onClick={async () => {
              setMenuOpen(false);
              const ok = await confirm({
                title: `„${entry.title}“ löschen?`,
                message:
                  'Der Eintrag wird endgültig entfernt. Verwendete Bilder bleiben in der Mediathek erhalten.',
                confirmLabel: 'Endgültig löschen',
                danger: true,
              });
              if (!ok) return;
              await deleteEntry(entry.id);
              navigate(-1);
            }}
          >
            <Trash2 size={18} /> Löschen
          </button>
        </div>
      </Modal>

      {printOpen && <PrintPreview entry={entry} onClose={() => setPrintOpen(false)} />}
    </div>
  );
}
