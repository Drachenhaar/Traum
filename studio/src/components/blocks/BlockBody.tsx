/**
 * Darstellung und Bearbeitung der einzelnen Blocktypen.
 *
 * Alle Blöcke sind direkt bearbeitbar – es gibt keinen getrennten
 * Ansichts-/Bearbeitungsmodus. Änderungen laufen sofort in den Store und
 * werden von dort automatisch gespeichert.
 */

import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { Block, BlockData } from '../../types';
import { AutoTextarea, TextInput } from '../ui/Fields';
import { Thumb } from '../images/Thumb';
import { ImagePicker } from '../images/ImagePicker';
import { EntryLinkPicker } from '../entry/EntryLinkPicker';
import { useStudio } from '../../store/useStudio';
import { copyText, cx, moveItem, newId } from '../../lib/utils';
import { templateFor } from '../../lib/templates';
import { Link } from 'react-router-dom';

interface BodyProps {
  block: Block;
  entryId: string;
  onChange: (data: Partial<BlockData>) => void;
  /** Bild in der Vollbildansicht öffnen */
  onOpenImage: (ids: string[], index: number) => void;
}

export function BlockBody(props: BodyProps) {
  switch (props.block.type) {
    case 'heading':
      return <HeadingBlock {...props} />;
    case 'text':
      return <TextBlock {...props} />;
    case 'quote':
      return <QuoteBlock {...props} />;
    case 'note':
      return <NoteBlock {...props} />;
    case 'image':
      return <ImageBlock {...props} />;
    case 'gallery':
      return <GalleryBlock {...props} />;
    case 'moodboard':
      return <MoodboardBlock {...props} />;
    case 'palette':
      return <PaletteBlock {...props} />;
    case 'materials':
      return <MaterialsBlock {...props} />;
    case 'references':
      return <ReferencesBlock {...props} />;
    case 'checklist':
      return <ChecklistBlock {...props} />;
    case 'prompt':
      return <PromptBlock {...props} />;
    case 'assetList':
      return <AssetListBlock {...props} />;
    case 'divider':
      return <div className="py-3"><hr className="border-line" /></div>;
    case 'spacer':
      return <SpacerBlock {...props} />;
    default:
      return null;
  }
}

/* ------------------------------------------------------------------- Text */

function HeadingBlock({ block, onChange }: BodyProps) {
  const level = block.data.level ?? 2;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex gap-1">
        {([1, 2, 3] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => onChange({ level: l })}
            className={cx(
              'h-9 w-9 rounded-lg border text-[13px] font-medium transition-colors',
              level === l
                ? 'border-brass-500 bg-brass-500/12 text-ink'
                : 'border-line bg-cream-50 text-ink-muted hover:bg-cream-200',
            )}
          >
            H{l}
          </button>
        ))}
      </div>
      <input
        value={block.data.text ?? ''}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder="Überschrift"
        className={cx(
          'w-full border-0 bg-transparent px-0 py-1 font-serif text-ink outline-none placeholder:text-ink-faint',
          level === 1 && 'text-3xl',
          level === 2 && 'text-2xl',
          level === 3 && 'text-xl',
        )}
      />
    </div>
  );
}

function TextBlock({ block, onChange }: BodyProps) {
  return (
    <AutoTextarea
      value={block.data.text ?? ''}
      onChange={(e) => onChange({ text: e.target.value })}
      placeholder="Text schreiben …"
      className="border-transparent bg-transparent px-0 text-[16px] leading-relaxed focus:border-transparent focus:ring-0"
    />
  );
}

function QuoteBlock({ block, onChange }: BodyProps) {
  return (
    <div className="border-l-2 border-brass-500 pl-4">
      <AutoTextarea
        value={block.data.text ?? ''}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder="Zitat …"
        minRows={2}
        className="border-transparent bg-transparent px-0 font-serif text-lg italic leading-relaxed focus:border-transparent focus:ring-0"
      />
      <input
        value={block.data.source ?? ''}
        onChange={(e) => onChange({ source: e.target.value })}
        placeholder="Quelle"
        className="w-full border-0 bg-transparent px-0 py-1 text-[14px] text-ink-muted outline-none placeholder:text-ink-faint"
      />
    </div>
  );
}

const NOTE_TONES = {
  info: { label: 'Hinweis', className: 'border-olive-500/25 bg-olive-500/8' },
  warn: { label: 'Achtung', className: 'border-red-800/20 bg-red-50' },
  idea: { label: 'Idee', className: 'border-brass-500/30 bg-brass-500/10' },
} as const;

function NoteBlock({ block, onChange }: BodyProps) {
  const tone = block.data.tone ?? 'info';
  return (
    <div className={cx('rounded-xl border p-3', NOTE_TONES[tone].className)}>
      <div className="mb-2 flex gap-1">
        {(Object.keys(NOTE_TONES) as (keyof typeof NOTE_TONES)[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange({ tone: t })}
            className={cx(
              'rounded-full border px-2.5 py-1 text-[13px] transition-colors',
              tone === t ? 'border-ink/25 bg-cream-50 text-ink' : 'border-transparent text-ink-muted',
            )}
          >
            {NOTE_TONES[t].label}
          </button>
        ))}
      </div>
      <AutoTextarea
        value={block.data.text ?? ''}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder="Notiz …"
        minRows={2}
        className="border-transparent bg-transparent px-0 focus:border-transparent focus:ring-0"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Bilder */

function ImageBlock({ block, onChange, onOpenImage }: BodyProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const imageId = block.data.imageId;

  return (
    <div>
      {imageId ? (
        <div className="group relative overflow-hidden rounded-xl border border-line bg-cream-200">
          <button
            type="button"
            onClick={() => onOpenImage([imageId], 0)}
            className="block w-full"
            aria-label="Bild in Vollbild öffnen"
          >
            <Thumb imageId={imageId} className="max-h-[460px] w-full" fit="contain" rounded="rounded-none" />
          </button>
          <div className="absolute right-2 top-2 flex gap-1.5">
            <button type="button" className="btn-ghost h-9 min-h-0 px-3 text-[13px]" onClick={() => setPickerOpen(true)}>
              Ersetzen
            </button>
            <button
              type="button"
              className="btn-ghost h-9 min-h-0 w-9 px-0"
              onClick={() => onChange({ imageId: undefined })}
              aria-label="Bild entfernen"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-lineStrong bg-cream-50/60 py-8 text-ink-muted transition-colors hover:bg-cream-200"
        >
          <Plus size={22} />
          <span className="text-[15px]">Bild auswählen</span>
        </button>
      )}
      <input
        value={block.data.caption ?? ''}
        onChange={(e) => onChange({ caption: e.target.value })}
        placeholder="Bildunterschrift"
        className="mt-2 w-full border-0 bg-transparent px-0 py-1 text-[14px] text-ink-muted outline-none placeholder:text-ink-faint"
      />
      <ImagePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(ids) => ids[0] && onChange({ imageId: ids[0] })}
      />
    </div>
  );
}

function GalleryBlock({ block, onChange, onOpenImage }: BodyProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const ids = block.data.imageIds ?? [];
  const columns = block.data.columns ?? 3;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[13px] text-ink-muted">Spalten</span>
        {[2, 3, 4].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange({ columns: c })}
            className={cx(
              'h-8 w-8 rounded-lg border text-[13px] transition-colors',
              columns === c ? 'border-brass-500 bg-brass-500/12' : 'border-line bg-cream-50 text-ink-muted',
            )}
          >
            {c}
          </button>
        ))}
        <button type="button" className="btn-ghost ml-auto h-9 min-h-0 px-3 text-[13px]" onClick={() => setPickerOpen(true)}>
          <Plus size={15} /> Bilder
        </button>
      </div>

      {ids.length === 0 ? (
        <p className="rounded-xl border border-dashed border-lineStrong px-4 py-6 text-center text-[15px] text-ink-muted">
          Noch keine Bilder in dieser Galerie.
        </p>
      ) : (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${Math.min(columns, 3)}, minmax(0, 1fr))` }}
        >
          {ids.map((id, i) => (
            <div key={`${id}-${i}`} className="group relative">
              <button type="button" onClick={() => onOpenImage(ids, i)} className="block w-full">
                <Thumb imageId={id} className="aspect-square w-full" />
              </button>
              <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-lg bg-cream-50/90 text-ink shadow"
                  onClick={() => onChange({ imageIds: moveItem(ids, i, i - 1) })}
                  disabled={i === 0}
                  aria-label="Nach vorn"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-lg bg-cream-50/90 text-red-700 shadow"
                  onClick={() => onChange({ imageIds: ids.filter((_, x) => x !== i) })}
                  aria-label="Aus Galerie entfernen"
                >
                  <X size={15} />
                </button>
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-lg bg-cream-50/90 text-ink shadow"
                  onClick={() => onChange({ imageIds: moveItem(ids, i, i + 1) })}
                  disabled={i === ids.length - 1}
                  aria-label="Nach hinten"
                >
                  ›
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ImagePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        multiple
        title="Bilder zur Galerie hinzufügen"
        onSelect={(picked) => onChange({ imageIds: [...ids, ...picked.filter((p) => !ids.includes(p))] })}
      />
    </div>
  );
}

function MoodboardBlock({ block, onChange, onOpenImage }: BodyProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const tiles = block.data.tiles ?? [];
  const imageIds = tiles.map((t) => t.imageId).filter(Boolean) as string[];

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button type="button" className="btn-ghost h-9 min-h-0 px-3 text-[13px]" onClick={() => setPickerOpen(true)}>
          <Plus size={15} /> Kacheln
        </button>
      </div>

      {tiles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-lineStrong px-4 py-6 text-center text-[15px] text-ink-muted">
          Bilder hinzufügen und mit kurzen Notizen versehen.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {tiles.map((tile, i) => (
            <div key={tile.id} className="overflow-hidden rounded-xl border border-line bg-cream-50">
              <button
                type="button"
                className="block w-full"
                onClick={() => {
                  const idx = imageIds.indexOf(tile.imageId ?? '');
                  if (idx >= 0) onOpenImage(imageIds, idx);
                }}
              >
                <Thumb imageId={tile.imageId} className="aspect-[4/3] w-full" rounded="rounded-none" />
              </button>
              <div className="flex items-center gap-1 p-1.5">
                <input
                  value={tile.caption}
                  onChange={(e) =>
                    onChange({
                      tiles: tiles.map((t, x) => (x === i ? { ...t, caption: e.target.value } : t)),
                    })
                  }
                  placeholder="Notiz"
                  className="min-w-0 flex-1 border-0 bg-transparent px-1 py-1 text-[13px] outline-none placeholder:text-ink-faint"
                />
                <button
                  type="button"
                  onClick={() => onChange({ tiles: tiles.filter((_, x) => x !== i) })}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-faint hover:bg-cream-200 hover:text-red-700"
                  aria-label="Kachel entfernen"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ImagePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        multiple
        title="Bilder aufs Moodboard"
        onSelect={(picked) =>
          onChange({
            tiles: [...tiles, ...picked.map((id) => ({ id: newId('tile'), imageId: id, caption: '' }))],
          })
        }
      />
    </div>
  );
}

/* ---------------------------------------------------------------- Paletten */

function PaletteBlock({ block, onChange }: BodyProps) {
  const swatches = block.data.swatches ?? [];
  const notify = useStudio((s) => s.notify);

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {swatches.map((sw, i) => (
          <div key={sw.id} className="overflow-hidden rounded-xl border border-line bg-cream-50">
            <label className="relative block h-20 cursor-pointer" style={{ background: sw.color }}>
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(sw.color) ? sw.color : '#000000'}
                onChange={(e) =>
                  onChange({
                    swatches: swatches.map((s, x) => (x === i ? { ...s, color: e.target.value } : s)),
                  })
                }
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Farbe wählen"
              />
            </label>
            <div className="space-y-1 p-2">
              <input
                value={sw.name}
                onChange={(e) =>
                  onChange({ swatches: swatches.map((s, x) => (x === i ? { ...s, name: e.target.value } : s)) })
                }
                placeholder="Name"
                className="w-full border-0 bg-transparent px-0 text-[14px] outline-none placeholder:text-ink-faint"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await copyText(sw.color);
                    notify(ok ? `${sw.color} kopiert.` : 'Kopieren nicht möglich.', ok ? 'success' : 'error');
                  }}
                  className="flex-1 rounded-md px-1 py-0.5 text-left font-mono text-[12px] uppercase text-ink-muted hover:bg-cream-200"
                >
                  {sw.color}
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ swatches: swatches.filter((_, x) => x !== i) })}
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-faint hover:bg-cream-200 hover:text-red-700"
                  aria-label="Farbe entfernen"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() =>
            onChange({
              swatches: [...swatches, { id: newId('sw'), color: '#A8853F', name: '', note: '' }],
            })
          }
          className="flex min-h-[120px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-lineStrong text-ink-muted transition-colors hover:bg-cream-200"
        >
          <Plus size={20} />
          <span className="text-[14px]">Farbe</span>
        </button>
      </div>
    </div>
  );
}

function MaterialsBlock({ block, onChange }: BodyProps) {
  const materials = block.data.materials ?? [];
  return (
    <div className="space-y-2">
      {materials.map((m, i) => (
        <div key={m.id} className="flex items-center gap-2 rounded-xl border border-line bg-cream-50 p-2">
          <label className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line" style={{ background: m.color }}>
            <input
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(m.color) ? m.color : '#888888'}
              onChange={(e) =>
                onChange({ materials: materials.map((x, k) => (k === i ? { ...x, color: e.target.value } : x)) })
              }
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Materialfarbe"
            />
          </label>
          <div className="min-w-0 flex-1 space-y-1">
            <input
              value={m.name}
              onChange={(e) =>
                onChange({ materials: materials.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })
              }
              placeholder="Material"
              className="w-full border-0 bg-transparent px-0 text-[15px] outline-none placeholder:text-ink-faint"
            />
            <div className="flex gap-2">
              <input
                value={m.finish}
                onChange={(e) =>
                  onChange({ materials: materials.map((x, k) => (k === i ? { ...x, finish: e.target.value } : x)) })
                }
                placeholder="Oberfläche"
                className="w-1/2 border-0 bg-transparent px-0 text-[13px] text-ink-muted outline-none placeholder:text-ink-faint"
              />
              <input
                value={m.note}
                onChange={(e) =>
                  onChange({ materials: materials.map((x, k) => (k === i ? { ...x, note: e.target.value } : x)) })
                }
                placeholder="Notiz"
                className="w-1/2 border-0 bg-transparent px-0 text-[13px] text-ink-muted outline-none placeholder:text-ink-faint"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange({ materials: materials.filter((_, k) => k !== i) })}
            className="touch-target grid shrink-0 place-items-center rounded-lg text-ink-faint hover:bg-cream-200 hover:text-red-700"
            aria-label="Material entfernen"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn-ghost w-full"
        onClick={() =>
          onChange({
            materials: [...materials, { id: newId('mat'), name: '', color: '#8C7A62', finish: '', note: '' }],
          })
        }
      >
        <Plus size={18} /> Material hinzufügen
      </button>
    </div>
  );
}

function ReferencesBlock({ block, onChange }: BodyProps) {
  const cards = block.data.cards ?? [];
  const [pickerFor, setPickerFor] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {cards.map((c, i) => (
        <div key={c.id} className="flex gap-3 rounded-xl border border-line bg-cream-50 p-2">
          <button
            type="button"
            onClick={() => setPickerFor(i)}
            className="shrink-0"
            aria-label="Referenzbild wählen"
          >
            <Thumb imageId={c.imageId} className="h-20 w-20" />
          </button>
          <div className="min-w-0 flex-1 space-y-1">
            <input
              value={c.title}
              onChange={(e) => onChange({ cards: cards.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)) })}
              placeholder="Titel der Referenz"
              className="w-full border-0 bg-transparent px-0 text-[15px] outline-none placeholder:text-ink-faint"
            />
            <input
              value={c.note}
              onChange={(e) => onChange({ cards: cards.map((x, k) => (k === i ? { ...x, note: e.target.value } : x)) })}
              placeholder="Was genau ist hier wichtig?"
              className="w-full border-0 bg-transparent px-0 text-[13px] text-ink-muted outline-none placeholder:text-ink-faint"
            />
            <input
              value={c.source}
              onChange={(e) => onChange({ cards: cards.map((x, k) => (k === i ? { ...x, source: e.target.value } : x)) })}
              placeholder="Quelle"
              className="w-full border-0 bg-transparent px-0 text-[13px] text-ink-faint outline-none placeholder:text-ink-faint"
            />
          </div>
          <button
            type="button"
            onClick={() => onChange({ cards: cards.filter((_, k) => k !== i) })}
            className="touch-target grid shrink-0 place-items-center rounded-lg text-ink-faint hover:bg-cream-200 hover:text-red-700"
            aria-label="Referenz entfernen"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn-ghost w-full"
        onClick={() => onChange({ cards: [...cards, { id: newId('ref'), title: '', note: '', source: '' }] })}
      >
        <Plus size={18} /> Referenz hinzufügen
      </button>

      <ImagePicker
        open={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        onSelect={(ids) => {
          if (pickerFor === null || !ids[0]) return;
          onChange({ cards: cards.map((x, k) => (k === pickerFor ? { ...x, imageId: ids[0] } : x)) });
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------- Checkliste */

function ChecklistBlock({ block, onChange }: BodyProps) {
  const items = block.data.items ?? [];
  const done = items.filter((i) => i.done).length;

  return (
    <div>
      {items.length > 0 && (
        <p className="mb-2 text-[13px] text-ink-muted">
          {done} von {items.length} erledigt
        </p>
      )}
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={item.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onChange({ items: items.map((x, k) => (k === i ? { ...x, done: !x.done } : x)) })}
              className={cx(
                'grid h-11 w-11 shrink-0 place-items-center rounded-lg transition-colors',
                item.done ? 'text-brass-600' : 'text-ink-faint hover:bg-cream-200',
              )}
              aria-label={item.done ? 'Als offen markieren' : 'Als erledigt markieren'}
            >
              <span
                className={cx(
                  'grid h-5 w-5 place-items-center rounded border',
                  item.done ? 'border-brass-500 bg-brass-500 text-cream-50' : 'border-lineStrong',
                )}
              >
                {item.done && '✓'}
              </span>
            </button>
            <input
              value={item.text}
              onChange={(e) => onChange({ items: items.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)) })}
              placeholder="Aufgabe"
              className={cx(
                'min-w-0 flex-1 border-0 bg-transparent px-0 py-2 text-[15px] outline-none placeholder:text-ink-faint',
                item.done && 'text-ink-faint line-through',
              )}
            />
            <button
              type="button"
              onClick={() => onChange({ items: items.filter((_, k) => k !== i) })}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-faint hover:bg-cream-200 hover:text-red-700"
              aria-label="Aufgabe entfernen"
            >
              <X size={16} />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn-quiet mt-1 w-full justify-start px-2"
        onClick={() => onChange({ items: [...items, { id: newId('itm'), text: '', done: false }] })}
      >
        <Plus size={18} /> Aufgabe hinzufügen
      </button>
    </div>
  );
}

/* ----------------------------------------------------------------- Prompt */

function PromptBlock({ block, onChange }: BodyProps) {
  const notify = useStudio((s) => s.notify);
  const prompt = block.data.prompt ?? '';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          value={block.data.model ?? ''}
          onChange={(e) => onChange({ model: e.target.value })}
          placeholder="Modell"
          className="input-base h-10 min-h-0 max-w-[220px] py-1.5 text-[14px]"
        />
        <button
          type="button"
          className="btn-ghost ml-auto h-10 min-h-0 px-3 text-[14px]"
          onClick={async () => {
            const ok = await copyText(prompt);
            notify(ok ? 'Prompt kopiert.' : 'Kopieren nicht möglich.', ok ? 'success' : 'error');
          }}
          disabled={!prompt}
        >
          Kopieren
        </button>
      </div>
      <AutoTextarea
        value={prompt}
        onChange={(e) => onChange({ prompt: e.target.value })}
        placeholder="Prompt …"
        className="font-mono text-[14px]"
      />
      <AutoTextarea
        value={block.data.negativePrompt ?? ''}
        onChange={(e) => onChange({ negativePrompt: e.target.value })}
        placeholder="Negativer Prompt …"
        minRows={2}
        className="font-mono text-[14px]"
      />
    </div>
  );
}

/* ------------------------------------------------------------- Asset-Liste */

function AssetListBlock({ block, entryId, onChange }: BodyProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const entries = useStudio((s) => s.entries);
  const ids = block.data.entryIds ?? [];
  const listed = ids.map((id) => entries.find((e) => e.id === id)).filter(Boolean);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <TextInput
          value={block.data.title ?? ''}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Titel der Liste"
          className="h-10 min-h-0 py-1.5 text-[14px]"
        />
        <button type="button" className="btn-ghost h-10 min-h-0 shrink-0 px-3 text-[14px]" onClick={() => setPickerOpen(true)}>
          <Plus size={16} /> Wählen
        </button>
      </div>

      {listed.length === 0 ? (
        <p className="rounded-xl border border-dashed border-lineStrong px-4 py-5 text-center text-[15px] text-ink-muted">
          Noch keine Einträge in dieser Liste.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {listed.map((e) => (
            <li key={e!.id} className="flex items-center gap-3 bg-cream-50 px-3 py-2">
              <Thumb imageId={e!.coverImage} className="h-10 w-10 shrink-0" />
              <Link to={`/eintrag/${e!.id}`} className="min-w-0 flex-1">
                <span className="block truncate text-[15px] text-ink hover:text-brass-600">{e!.title}</span>
                <span className="block truncate text-[13px] text-ink-muted">
                  {templateFor(e!.type).label}
                  {e!.category ? ` · ${e!.category}` : ''}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => onChange({ entryIds: ids.filter((x) => x !== e!.id) })}
                className="touch-target grid shrink-0 place-items-center rounded-lg text-ink-faint hover:bg-cream-200 hover:text-red-700"
                aria-label="Aus Liste entfernen"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <EntryLinkPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selected={ids}
        onChange={(next) => onChange({ entryIds: next })}
        excludeId={entryId}
        title="Einträge für die Liste"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Abstand */

const SPACER_SIZES: Record<string, string> = { sm: 'h-6', md: 'h-12', lg: 'h-24' };

function SpacerBlock({ block, onChange }: BodyProps) {
  const size = block.data.size ?? 'md';
  return (
    <div className="flex items-center gap-2">
      <div className={cx('flex-1 rounded-lg border border-dashed border-line', SPACER_SIZES[size])} />
      <div className="flex gap-1">
        {(['sm', 'md', 'lg'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange({ size: s })}
            className={cx(
              'h-9 w-9 rounded-lg border text-[13px] uppercase transition-colors',
              size === s ? 'border-brass-500 bg-brass-500/12' : 'border-line bg-cream-50 text-ink-muted',
            )}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
