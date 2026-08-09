/**
 * Formular für die typspezifischen Felder eines Eintrags.
 *
 * Die Felder kommen aus `lib/templates.ts`; hier wird nur entschieden, welche
 * Eingabeart dazu passt. Jede Änderung wird sofort gespeichert (Autospeichern).
 */

import { useState } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import type { Entry, FieldValue } from '../../types';
import type { FieldDef } from '../../lib/templates';
import { asBool, asList, asText, templateFor } from '../../lib/templates';
import { gruppiere } from '../../lib/feldgruppen';
import { AutoTextarea, Field, SelectInput, TagInput, TextInput, Toggle } from '../ui/Fields';
import { Thumb } from '../images/Thumb';
import { ImagePicker } from '../images/ImagePicker';
import { EntryLinkPicker } from './EntryLinkPicker';
import { Lightbox } from '../images/Lightbox';
import { useStudio } from '../../store/useStudio';
import { cx, moveItem } from '../../lib/utils';
import { Link } from 'react-router-dom';

export function EntryFields({ entry }: { entry: Entry }) {
  const updateEntry = useStudio((s) => s.updateEntry);
  const tpl = templateFor(entry.type);

  if (tpl.fields.length === 0) return null;

  const setField = (key: string, value: FieldValue) => {
    updateEntry(entry.id, { fields: { ...entry.fields, [key]: value } });
  };

  /*
   * Nach Fragen geordnet, nicht nach Speicherreihenfolge.
   *
   * Achtzehn Felder untereinander sind ein Formular. Dieselben achtzehn unter
   * „Wer ist das?", „Was tut es?", „Wo gehört es hin?" sind eine Seite, über
   * die man nachdenken kann. Es ist derselbe Inhalt – kein Feld entfällt,
   * keins wird versteckt, nur die beiden ersten Abschnitte stehen offen.
   */
  const gruppen = gruppiere(tpl.fields);

  return (
    <div className="space-y-2">
      {gruppen.map(({ gruppe, felder }) => (
        <Abschnitt
          key={gruppe.id}
          label={gruppe.label}
          offen={gruppe.offen}
          /*
           * Ein einziger Abschnitt braucht keine Überschrift – und kurze
           * Vorlagen kommen von vornherein ohne Beschriftung zurück.
           */
          nackt={gruppen.length === 1 || !gruppe.label}
          gefuellt={felder.filter((f) => hatWert(entry.fields[f.key])).length}
          gesamt={felder.length}
        >
          <section className="space-y-4">
            {felder.map((def) => (
              <FieldRenderer
                key={def.key}
                def={def}
                entry={entry}
                value={entry.fields[def.key]}
                onChange={(v) => setField(def.key, v)}
              />
            ))}
          </section>
        </Abschnitt>
      ))}
    </div>
  );
}

/** Steht in diesem Feld etwas? */
function hatWert(v: FieldValue | undefined): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return v === true;
}

/**
 * Ein Abschnitt, der sich öffnen lässt.
 *
 * Die Zahl daneben ist kein Fortschrittsbalken, sondern eine Auskunft: Wer
 * zuklappt, soll wissen, ob darunter etwas steht. Ohne sie wäre jedes
 * geschlossene Dreieck eine Frage.
 */
function Abschnitt({
  label,
  offen,
  nackt,
  gefuellt,
  gesamt,
  children,
}: {
  label: string;
  offen: boolean;
  nackt: boolean;
  gefuellt: number;
  gesamt: number;
  children: React.ReactNode;
}) {
  const [auf, setAuf] = useState(offen || gefuellt > 0);
  if (nackt) return <>{children}</>;

  return (
    <section className="border-t border-line pt-3 first:border-0 first:pt-0">
      <button
        type="button"
        onClick={() => setAuf((o) => !o)}
        aria-expanded={auf}
        className="flex min-h-[40px] w-full items-center gap-2 text-left"
      >
        <ChevronDown
          size={14}
          className={cx(
            'shrink-0 text-ink-faint transition-transform duration-300',
            !auf && '-rotate-90',
          )}
        />
        <span className="flex-1 text-[13px] font-medium uppercase tracking-wide text-ink-muted">
          {label}
        </span>
        <span className="shrink-0 text-[12px] tabular-nums text-ink-faint">
          {gefuellt > 0 ? `${gefuellt}/${gesamt}` : gesamt}
        </span>
      </button>
      {auf && <div className="pb-3 pt-2">{children}</div>}
    </section>
  );
}

function FieldRenderer({
  def,
  entry,
  value,
  onChange,
}: {
  def: FieldDef;
  entry: Entry;
  value: FieldValue | undefined;
  onChange: (v: FieldValue) => void;
}) {
  switch (def.kind) {
    case 'text':
      return (
        <Field label={def.label} hint={def.hint}>
          <TextInput
            value={asText(value)}
            placeholder={def.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );

    case 'textarea':
      return (
        <Field label={def.label} hint={def.hint}>
          <AutoTextarea
            value={asText(value)}
            placeholder={def.placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      );

    case 'select':
      return (
        <Field label={def.label} hint={def.hint}>
          <SelectInput value={asText(value)} onChange={(e) => onChange(e.target.value)}>
            {(def.options ?? []).map((o) => (
              <option key={o} value={o}>
                {o === '' ? '– nicht gesetzt –' : o}
              </option>
            ))}
          </SelectInput>
        </Field>
      );

    case 'boolean':
      return <Toggle checked={asBool(value)} onChange={onChange} label={def.label} description={def.hint} />;

    case 'tags':
      return (
        <Field label={def.label} hint={def.hint}>
          <TagInput value={asList(value)} onChange={onChange} />
        </Field>
      );

    case 'images':
      return <ImageListField def={def} value={asList(value)} onChange={onChange} />;

    case 'entries':
      return <EntryListField def={def} entry={entry} value={asList(value)} onChange={onChange} />;

    case 'palette':
      return <PaletteField def={def} value={asList(value)} onChange={onChange} />;

    default:
      return null;
  }
}

/* --------------------------------------------------------------- Bildlisten */

function ImageListField({
  def,
  value,
  onChange,
}: {
  def: FieldDef;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);

  return (
    <div>
      <span className="label-base">{def.label}</span>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {value.map((id, i) => (
          <div key={`${id}-${i}`} className="group relative">
            <button type="button" onClick={() => setLightbox(i)} className="block w-full">
              <Thumb imageId={id} className="aspect-square w-full" />
            </button>
            <div className="absolute inset-x-0.5 bottom-0.5 flex justify-between">
              <button
                type="button"
                onClick={() => onChange(moveItem(value, i, i - 1))}
                disabled={i === 0}
                className="grid h-7 w-7 place-items-center rounded-md bg-cream-50/90 text-[13px] text-ink shadow disabled:opacity-0"
                aria-label="Nach vorn"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, x) => x !== i))}
                className="grid h-7 w-7 place-items-center rounded-md bg-cream-50/90 text-red-700 shadow"
                aria-label="Bild entfernen"
              >
                <X size={13} />
              </button>
              <button
                type="button"
                onClick={() => onChange(moveItem(value, i, i + 1))}
                disabled={i === value.length - 1}
                className="grid h-7 w-7 place-items-center rounded-md bg-cream-50/90 text-[13px] text-ink shadow disabled:opacity-0"
                aria-label="Nach hinten"
              >
                ›
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="grid aspect-square place-items-center rounded-xl border border-dashed border-lineStrong text-ink-muted transition-colors hover:bg-cream-200"
          aria-label={`${def.label} hinzufügen`}
        >
          <Plus size={20} />
        </button>
      </div>
      {def.hint && <p className="mt-1 text-[13px] text-ink-faint">{def.hint}</p>}

      <ImagePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        multiple
        title={def.label}
        onSelect={(ids) => onChange([...value, ...ids.filter((id) => !value.includes(id))])}
      />
      {lightbox !== null && (
        <Lightbox
          ids={value}
          index={lightbox}
          onIndexChange={setLightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------ Eintragslisten */

function EntryListField({
  def,
  entry,
  value,
  onChange,
}: {
  def: FieldDef;
  entry: Entry;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const entries = useStudio((s) => s.entries);
  const listed = value.map((id) => entries.find((e) => e.id === id)).filter(Boolean) as Entry[];

  return (
    <div>
      <span className="label-base">{def.label}</span>
      <div className="flex flex-wrap gap-1.5">
        {listed.map((e) => (
          <span key={e.id} className="chip pr-1">
            <Link to={`/eintrag/${e.id}`} className="text-ink hover:text-brass-600">
              {e.title}
            </Link>
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== e.id))}
              className="grid h-7 w-7 place-items-center rounded-full text-ink-faint hover:bg-cream-300 hover:text-ink"
              aria-label="Verknüpfung entfernen"
            >
              <X size={13} />
            </button>
          </span>
        ))}
        <button type="button" className="chip hover:bg-cream-200" onClick={() => setPickerOpen(true)}>
          <Plus size={13} /> Auswählen
        </button>
      </div>
      {def.hint && <p className="mt-1 text-[13px] text-ink-faint">{def.hint}</p>}

      <EntryLinkPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selected={value}
        onChange={onChange}
        excludeId={entry.id}
        title={def.label}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Palette */

/** Farbwerte werden als „#RRGGBB|Name“ gespeichert – einfach und exportierbar. */
function parseSwatch(raw: string): { color: string; name: string } {
  const [color, ...rest] = raw.split('|');
  return { color: color || '#000000', name: rest.join('|') };
}

function PaletteField({
  def,
  value,
  onChange,
}: {
  def: FieldDef;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div>
      <span className="label-base">{def.label}</span>
      <div className="flex flex-wrap gap-2">
        {value.map((raw, i) => {
          const { color, name } = parseSwatch(raw);
          return (
            <div key={i} className="w-28 overflow-hidden rounded-xl border border-line bg-cream-50">
              <label className="relative block h-12 cursor-pointer" style={{ background: color }}>
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(color) ? color : '#000000'}
                  onChange={(e) =>
                    onChange(value.map((v, x) => (x === i ? `${e.target.value}|${name}` : v)))
                  }
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label="Farbe wählen"
                />
              </label>
              <div className="flex items-center gap-0.5 p-1">
                <input
                  value={name}
                  onChange={(e) => onChange(value.map((v, x) => (x === i ? `${color}|${e.target.value}` : v)))}
                  placeholder="Name"
                  className="min-w-0 flex-1 border-0 bg-transparent px-1 py-1 text-[13px] outline-none placeholder:text-ink-faint"
                />
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, x) => x !== i))}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink-faint hover:bg-cream-200 hover:text-red-700"
                  aria-label="Farbe entfernen"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => onChange([...value, '#A8853F|'])}
          className={cx(
            'grid h-[86px] w-28 place-items-center rounded-xl border border-dashed border-lineStrong',
            'text-ink-muted transition-colors hover:bg-cream-200',
          )}
          aria-label="Farbe hinzufügen"
        >
          <Plus size={20} />
        </button>
      </div>
      {def.hint && <p className="mt-1 text-[13px] text-ink-faint">{def.hint}</p>}
    </div>
  );
}
