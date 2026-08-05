/**
 * Detailansicht eines Eintrags.
 *
 * Reihenfolge nach Wichtigkeit: erst was es ist, dann wo es in der Welt steht
 * (Beziehungen), dann der freie Seiteninhalt. Die Beziehungen stehen bewusst
 * weit oben – sie sind nicht Beiwerk, sondern der Grund für diese App.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  BookOpen,
  Copy,
  Download,
  FileCode2,
  History,
  ImagePlus,
  MoreHorizontal,
  Star,
  Trash2,
  Waypoints,
} from 'lucide-react';
import { useStudio } from '../store/useStudio';
import { templateFor } from '../lib/templates';
import { entryMetaSchema, type EntryMetaValues } from '../lib/schemas';
import { ENTRY_STATUSES, type EntryStatus, type Revision } from '../types';
import { AutoTextarea, Field, SelectInput, TagInput, TextInput } from '../components/ui/Fields';
import { EntryFields } from '../components/entry/EntryFields';
import { BlockEditor } from '../components/blocks/BlockEditor';
import { RelationPanel } from '../components/relations/RelationPanel';
import { PipelineBar } from '../components/entry/PipelineBar';
import { Thumb } from '../components/images/Thumb';
import { ImagePicker } from '../components/images/ImagePicker';
import { Modal } from '../components/ui/Modal';
import { confirm } from '../components/ui/Confirm';
import { PrintPreview } from '../components/entry/PrintPreview';
import { StoryMode } from '../components/story/StoryMode';
import { buildEntryExport } from '../lib/portability';
import { allTags } from '../lib/search';
import { cx, downloadFile, formatDateTime, relativeTime } from '../lib/utils';
import { iconByName } from '../lib/icons';

export function EntryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const entry = useStudio((s) => s.entries.find((e) => e.id === id));
  const entries = useStudio((s) => s.entries);
  const images = useStudio((s) => s.images);
  const updateEntry = useStudio((s) => s.updateEntry);
  const duplicateEntry = useStudio((s) => s.duplicateEntry);
  const deleteEntry = useStudio((s) => s.deleteEntry);
  const restoreEntry = useStudio((s) => s.restoreEntry);
  const toggleFavorite = useStudio((s) => s.toggleFavorite);
  const noteVisit = useStudio((s) => s.noteVisit);
  const revisionsOf = useStudio((s) => s.revisionsOf);
  const restoreRevision = useStudio((s) => s.restoreRevision);
  const notify = useStudio((s) => s.notify);

  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [revisions, setRevisions] = useState<Revision[]>([]);

  // „Weitermachen, wo du warst“ speist sich aus diesen Besuchen.
  useEffect(() => {
    if (id) noteVisit(id);
  }, [id, noteVisit]);

  const defaults = useMemo<EntryMetaValues>(
    () => ({
      title: entry?.title ?? '',
      subtitle: entry?.subtitle ?? '',
      category: entry?.category ?? '',
      description: entry?.description ?? '',
      status: entry?.status ?? 'Idee',
      tags: entry?.tags ?? [],
    }),
    // Nur beim Wechsel des Eintrags neu befüllen, damit Tippen nicht überschrieben wird.
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
          Vielleicht liegt er im Papierkorb – die Zeitleiste holt ihn zurück.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Link to="/zeitleiste" className="btn-ghost">
            Zur Zeitleiste
          </Link>
          <Link to="/" className="btn-accent">
            Zur Startseite
          </Link>
        </div>
      </div>
    );
  }

  const tpl = templateFor(entry.type);
  const TypeIcon = iconByName(tpl.icon);

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

  const safeName =
    entry.title.replace(/[^\w\säöüÄÖÜß-]/g, '').trim().replace(/\s+/g, '-') || 'eintrag';

  const exportJson = async () => {
    const json = await buildEntryExport(entry);
    downloadFile(`${safeName}.json`, json, 'application/json');
    notify('Eintrag als JSON gesichert – samt Beziehungen.', 'success');
  };

  const openHistory = async () => {
    setRevisions(await revisionsOf(entry.id));
    setHistoryOpen(true);
  };

  return (
    <div className="pb-6">
      {/* Papierkorb-Hinweis */}
      {entry.deletedAt && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-brass-500/40 bg-brass-500/10 px-4 py-3">
          <p className="flex-1 text-[15px] text-ink">
            Dieser Eintrag liegt im Papierkorb (seit {relativeTime(entry.deletedAt)}).
          </p>
          <button type="button" className="btn-accent h-10 min-h-0 px-3" onClick={() => void restoreEntry(entry.id)}>
            Zurückholen
          </button>
        </div>
      )}

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

        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px]"
          style={{ background: `${tpl.accent}1A`, color: tpl.accent }}
        >
          <TypeIcon size={14} />
          {tpl.label}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <Link
            to={`/graph?fokus=${entry.id}`}
            className="touch-target grid place-items-center rounded-xl text-ink-muted transition-colors hover:bg-cream-200 hover:text-ink"
            aria-label="Im Weltgraphen zeigen"
            title="Im Weltgraphen zeigen"
          >
            <Waypoints size={20} />
          </Link>
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
          <AutoTextarea {...register('description')} onBlur={commit} placeholder="Worum geht es hier?" />
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

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-[13px] text-ink-faint">
          <span>Angelegt {formatDateTime(entry.createdAt)}</span>
          <span aria-hidden>·</span>
          <span>Zuletzt geändert {relativeTime(entry.updatedAt)}</span>
          <button type="button" className="ml-auto text-brass-600 hover:underline" onClick={() => void openHistory()}>
            Fassungen ansehen
          </button>
        </div>
      </section>

      {/* --------------------------------------------------------- Pipeline */}
      {entry.type === 'asset' && <PipelineBar entry={entry} />}

      {/* ------------------------------------------------------- Beziehungen */}
      <div className="mb-5">
        <RelationPanel entry={entry} />
      </div>

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

      {/* --------------------------------------------------------- Dialoge */}
      <ImagePicker
        open={coverPickerOpen}
        onClose={() => setCoverPickerOpen(false)}
        title="Titelbild wählen"
        onSelect={(ids) => ids[0] && updateEntry(entry.id, { coverImage: ids[0] })}
      />

      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title={entry.title} size="sm">
        <div className="space-y-1.5">
          <button
            type="button"
            className="btn-ghost w-full justify-start"
            onClick={() => {
              setMenuOpen(false);
              setStoryOpen(true);
            }}
          >
            <BookOpen size={18} /> Im Story-Modus zeigen
          </button>
          <button
            type="button"
            className="btn-ghost w-full justify-start"
            onClick={() => {
              setMenuOpen(false);
              void openHistory();
            }}
          >
            <History size={18} /> Fassungen
          </button>
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
          {!entry.deletedAt && (
            <button
              type="button"
              className="btn-danger w-full justify-start"
              onClick={async () => {
                setMenuOpen(false);
                const ok = await confirm({
                  title: `„${entry.title}“ löschen?`,
                  message:
                    'Der Eintrag wandert in den Papierkorb. Beziehungen und Fassungen bleiben erhalten – du kannst ihn über die Zeitleiste zurückholen.',
                  confirmLabel: 'In den Papierkorb',
                  danger: true,
                });
                if (!ok) return;
                await deleteEntry(entry.id);
                navigate(-1);
              }}
            >
              <Trash2 size={18} /> Löschen
            </button>
          )}
        </div>
      </Modal>

      {/* Fassungen */}
      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Fassungen"
        description={`${revisions.length} gespeicherte Stände von „${entry.title}“`}
        size="md"
      >
        {revisions.length === 0 ? (
          <p className="py-6 text-center text-[15px] text-ink-muted">
            Noch keine früheren Fassungen. Sobald du weiterarbeitest, sammeln sie sich hier.
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            {revisions.map((rev) => (
              <li key={rev.id} className="flex items-center gap-3 bg-cream-50 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] text-ink">{rev.snapshot.title}</p>
                  <p className="text-[13px] text-ink-muted">
                    {rev.summary} · {formatDateTime(rev.at)}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-ghost h-10 min-h-0 shrink-0 px-3 text-[14px]"
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Diese Fassung zurückholen?',
                      message:
                        'Der aktuelle Stand wird vorher als Fassung gesichert – du kannst also jederzeit wieder zurück.',
                      confirmLabel: 'Zurückholen',
                    });
                    if (!ok) return;
                    await restoreRevision(rev.id);
                    setHistoryOpen(false);
                  }}
                >
                  Zurückholen
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {printOpen && <PrintPreview entry={entry} onClose={() => setPrintOpen(false)} />}
      {storyOpen && <StoryMode startId={entry.id} onClose={() => setStoryOpen(false)} />}
    </div>
  );
}
