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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen, Check, ImagePlus } from 'lucide-react';
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
import { Spread } from '../../components/book/Spread';
import { cx } from '../../lib/utils';

export function EntryEditor({
  entry,
  onDone,
  pageLeft,
}: {
  entry: Entry;
  onDone: () => void;
  pageLeft: number;
}) {
  const entries = useStudio((s) => s.entries);
  const images = useStudio((s) => s.images);
  const updateEntry = useStudio((s) => s.updateEntry);
  const notify = useStudio((s) => s.notify);

  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  /* Steht schon ein Ende da, ist die Frage beantwortet – dann bleibt es offen. */
  const [endeOffen, setEndeOffen] = useState(() => Boolean(entry.ende?.trim()));
  /* Ebenso das Geheimnis: Steht schon eines da, bleibt die Stelle offen. */
  const [geheimOffen, setGeheimOffen] = useState(
    () => Boolean(entry.geheim?.text?.trim() || entry.geheim?.ganzeSeite),
  );
  const tpl = templateFor(entry.type);

  const defaults = useMemo<EntryMetaValues>(
    () => ({
      title: entry.title,
      subtitle: entry.subtitle ?? '',
      category: entry.category ?? '',
      description: entry.description ?? '',
      geheimText: entry.geheim?.text ?? '',
      geheimGanzeSeite: entry.geheim?.ganzeSeite === true,
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
      geheim:
        values.geheimText.trim() || values.geheimGanzeSeite
          ? {
              text: values.geheimText.trim() || undefined,
              ganzeSeite: values.geheimGanzeSeite || undefined,
            }
          : undefined,
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

              Ein Feld, nicht zwei. Die allermeisten Dinge einer Welt bestehen
              noch – ein Dorf, ein Fluss, eine Familie – und fuer die ist ein
              Endfeld eine Frage, die niemand gestellt hat. Wer ein Ende
              braucht, klappt es auf; wer schon eines eingetragen hat, sieht es
              sofort.

              Beide duerfen leer bleiben. Ein Ort ohne Ende besteht bis heute,
              eine Figur ohne Anfang war immer schon da – das ist eine Aussage,
              kein fehlender Wert, und der Zeitstrahl zeichnet es auch so:
              offen.
            */}
            <div className={cx('mt-4 grid gap-3', endeOffen && 'grid-cols-2')}>
              <Field label="Beginn">
                <TextInput {...register('beginn')} onBlur={commit} placeholder="1032" />
              </Field>
              {endeOffen && (
                <Field label="Ende">
                  <TextInput {...register('ende')} onBlur={commit} placeholder="1078" />
                </Field>
              )}
            </div>
            {!endeOffen && (
              <button
                type="button"
                onClick={() => setEndeOffen(true)}
                className="mt-1.5 font-serif text-[13px] italic text-ink-faint transition-colors hover:text-gild-600 no-tap-highlight"
              >
                Und ein Ende?
              </button>
            )}
            <p className="mt-1.5 font-serif text-[12.5px] italic leading-relaxed text-ink-faint">
              Zeit in der Welt, nicht am Schreibtisch. Ein Jahr genügt; genauer geht mit{' '}
              <span className="whitespace-nowrap">1032-04</span> oder{' '}
              <span className="whitespace-nowrap">12.4.1032</span>. Wenn niemand es mehr
              weiß: <span className="whitespace-nowrap">um 874</span>.
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

            {/*
              Was am Tisch nicht gezeigt wird.

              Steht unter der Beschreibung und nicht in einem eigenen Reiter:
              Ein Geheimnis gehoert zu dem, was daneben steht, und wer es in
              einem zweiten Bereich sucht, schreibt es nicht auf.

              Aufgeklappt wird nur, wenn schon etwas drinsteht – sonst traegt
              jede Seite jeder Welt eine Frage, die nur ein Spieltisch stellt.
            */}
            <section className="mt-8 border-t border-paper-300/70 pt-6">
              {geheimOffen ? (
                <>
                  <p className="rubric mb-4">Nur für dich</p>
                  <Field label="Was am Tisch nicht steht" error={errors.geheimText?.message}>
                    <AutoTextarea
                      {...register('geheimText')}
                      onBlur={commit}
                      placeholder="Was nur die Spielleitung weiß."
                      minRows={3}
                    />
                  </Field>
                  <label className="mt-3 flex items-start gap-2.5 font-serif text-[14.5px] text-ink-muted">
                    <input
                      type="checkbox"
                      {...register('geheimGanzeSeite')}
                      onChange={(e) => {
                        /*
                         * Sofort sichern, nicht erst beim Verlassen.
                         *
                         * Ein Haekchen hat kein `blur` – wer es setzt und die
                         * Seite verlaesst, haette sonst eine Seite, die er fuer
                         * verborgen haelt und die es nicht ist. Genau der
                         * Fehler, der am Spieltisch auffliegt.
                         */
                        setValue('geheimGanzeSeite', e.target.checked);
                        updateEntry(entry.id, {
                          geheim:
                            getValues('geheimText').trim() || e.target.checked
                              ? {
                                  text: getValues('geheimText').trim() || undefined,
                                  ganzeSeite: e.target.checked || undefined,
                                }
                              : undefined,
                        });
                      }}
                      className="mt-1 h-4 w-4 accent-gild-600"
                    />
                    <span>
                      Diese ganze Seite bleibt am Tisch zu
                      <span className="mt-0.5 block font-serif text-[12.5px] italic text-ink-faint">
                        Sie verschwindet dann auch aus Inhalt, Register und Suche – ein Titel
                        allein ist oft schon das Geheimnis.
                      </span>
                    </span>
                  </label>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setGeheimOffen(true)}
                  className="min-h-[40px] font-serif text-[14px] italic text-ink-faint transition-colors hover:text-gild-600 no-tap-highlight"
                >
                  Etwas notieren, das am Tisch nicht steht
                </button>
              )}
            </section>

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

            {/*
              Duplizieren und Entfernen standen hier zwischen den Feldern.

              Sie gehoeren nicht hierher: Beides betrifft die Seite als
              Ganzes, nicht ihren Inhalt – und wer eine Seite loeschen will,
              musste sie erst zum Bearbeiten oeffnen. Sie liegen jetzt auf der
              gelesenen Seite unter „Mehr“, zusammen mit allem anderen, was
              man an einer Seite tut statt in ihr. Hier bleibt der einzige
              Weg, der wirklich zum Bearbeiten gehoert: fertig sein.
            */}
            <section className="mt-10 border-t border-paper-300/70 pt-5">
              <button
                type="button"
                className="btn-ghost h-10 min-h-0 px-3 text-[14px]"
                onClick={finish}
              >
                <BookOpen size={15} /> Fertig – weiterlesen
              </button>
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
