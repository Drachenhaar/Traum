/**
 * Block-Editor einer Seite.
 *
 * Reihenfolge ändern:
 *  - Desktop: Ziehen am Griff (dnd-kit)
 *  - Überall (und besonders auf dem iPhone): Hoch-/Runter-Schaltflächen,
 *    die immer zuverlässig funktionieren.
 */

import { useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  MoreHorizontal,
  Plus,
  Trash2,
} from 'lucide-react';
import type { Block, Entry } from '../../types';
import { BLOCK_DEFS, blockDef, blockSummary } from '../../lib/blocks';
import { iconByName } from '../../lib/icons';
import { BlockBody } from './BlockBody';
import { Modal } from '../ui/Modal';
import { confirm } from '../ui/Confirm';
import { Lightbox } from '../images/Lightbox';
import { EmptyState } from '../ui/EmptyState';
import { useStudio } from '../../store/useStudio';
import { cx } from '../../lib/utils';
import { LayoutGrid } from 'lucide-react';

export function BlockEditor({ entry }: { entry: Entry }) {
  const addBlock = useStudio((s) => s.addBlock);
  const updateBlock = useStudio((s) => s.updateBlock);
  const moveBlock = useStudio((s) => s.moveBlock);
  const deleteBlock = useStudio((s) => s.deleteBlock);
  const duplicateBlockAt = useStudio((s) => s.duplicateBlockAt);
  const setBlockCollapsed = useStudio((s) => s.setBlockCollapsed);

  const [addOpen, setAddOpen] = useState(false);
  const [addIndex, setAddIndex] = useState<number | undefined>(undefined);
  const [lightbox, setLightbox] = useState<{ ids: string[]; index: number } | null>(null);

  const sensors = useSensors(
    // Etwas Verzögerung, damit Scrollen auf dem Touchscreen nicht als Ziehen gilt.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = entry.blocks.findIndex((b) => b.id === active.id);
    const to = entry.blocks.findIndex((b) => b.id === over.id);
    moveBlock(entry.id, from, to);
  };

  const openAdd = (index?: number) => {
    setAddIndex(index);
    setAddOpen(true);
  };

  return (
    <div>
      {entry.blocks.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="Diese Seite ist noch leer"
          message="Füge einen ersten Block hinzu – Text, Bild, Farbpalette oder Checkliste."
          action={
            <button type="button" className="btn-accent" onClick={() => openAdd(0)}>
              <Plus size={18} /> Block hinzufügen
            </button>
          }
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={entry.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {entry.blocks.map((block, index) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  index={index}
                  total={entry.blocks.length}
                  entryId={entry.id}
                  onChange={(data) => updateBlock(entry.id, block.id, data)}
                  onMove={(delta) => moveBlock(entry.id, index, index + delta)}
                  onDuplicate={() => duplicateBlockAt(entry.id, block.id)}
                  onDelete={async () => {
                    const ok = await confirm({
                      title: 'Block löschen?',
                      message: `„${blockDef(block.type).label}“ wird entfernt. Bilder bleiben in der Mediathek erhalten.`,
                      confirmLabel: 'Löschen',
                      danger: true,
                    });
                    if (ok) deleteBlock(entry.id, block.id);
                  }}
                  onToggleCollapse={() => setBlockCollapsed(entry.id, block.id, !block.collapsed)}
                  onInsertAfter={() => openAdd(index + 1)}
                  onOpenImage={(ids, i) => setLightbox({ ids, index: i })}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {entry.blocks.length > 0 && (
        <button
          type="button"
          onClick={() => openAdd(undefined)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-lineStrong py-3 text-[15px] text-ink-muted transition-colors hover:bg-cream-200 hover:text-ink"
          style={{ minHeight: 44 }}
        >
          <Plus size={18} /> Block hinzufügen
        </button>
      )}

      <AddBlockModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onPick={(type) => {
          addBlock(entry.id, type, addIndex);
          setAddOpen(false);
        }}
      />

      {lightbox && (
        <Lightbox
          ids={lightbox.ids}
          index={lightbox.index}
          onIndexChange={(i) => setLightbox({ ...lightbox, index: i })}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------- Einzelblock */

interface SortableBlockProps {
  block: Block;
  index: number;
  total: number;
  entryId: string;
  onChange: (data: Partial<Block['data']>) => void;
  onMove: (delta: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleCollapse: () => void;
  onInsertAfter: () => void;
  onOpenImage: (ids: string[], index: number) => void;
}

function SortableBlock({
  block,
  index,
  total,
  entryId,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
  onToggleCollapse,
  onInsertAfter,
  onOpenImage,
}: SortableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const def = blockDef(block.type);
  const Icon = iconByName(def.icon);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx(
        'group rounded-2xl border bg-cream-50 transition-shadow duration-200 ease-calm',
        isDragging ? 'z-10 border-brass-400 shadow-lift' : 'border-line shadow-card',
      )}
    >
      {/* Kopfzeile mit allen Blockaktionen */}
      <div className="flex items-center gap-1 border-b border-line px-1.5 py-1">
        <button
          type="button"
          className="hidden h-9 w-7 cursor-grab touch-none place-items-center rounded-lg text-ink-faint hover:bg-cream-200 hover:text-ink active:cursor-grabbing sm:grid"
          aria-label="Block verschieben (ziehen)"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex min-h-[36px] min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left text-[13px] text-ink-muted transition-colors hover:bg-cream-200"
          aria-expanded={!block.collapsed}
        >
          <Icon size={14} className="shrink-0 text-brass-600" />
          <span className="shrink-0 font-medium uppercase tracking-wide">{def.label}</span>
          {block.collapsed && (
            <span className="truncate text-ink-faint">— {blockSummary(block)}</span>
          )}
        </button>

        <div className="flex items-center">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="grid h-11 w-9 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-cream-200 hover:text-ink disabled:opacity-30"
            aria-label="Block nach oben"
          >
            <ChevronUp size={17} />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="grid h-11 w-9 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-cream-200 hover:text-ink disabled:opacity-30"
            aria-label="Block nach unten"
          >
            <ChevronDown size={17} />
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="grid h-11 w-9 place-items-center rounded-lg text-ink-faint transition-colors hover:bg-cream-200 hover:text-ink"
            aria-label={`Aktionen für Block „${def.label}“`}
          >
            <MoreHorizontal size={17} />
          </button>
        </div>
      </div>

      {!block.collapsed && (
        <div className="px-3 py-3 sm:px-4">
          <BlockBody block={block} entryId={entryId} onChange={onChange} onOpenImage={onOpenImage} />
        </div>
      )}

      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} title={def.label} size="sm">
        <div className="space-y-1.5">
          <button
            type="button"
            className="btn-ghost w-full justify-start"
            onClick={() => {
              onDuplicate();
              setMenuOpen(false);
            }}
          >
            <Copy size={18} /> Block duplizieren
          </button>
          <button
            type="button"
            className="btn-ghost w-full justify-start"
            onClick={() => {
              onInsertAfter();
              setMenuOpen(false);
            }}
          >
            <Plus size={18} /> Block darunter einfügen
          </button>
          <button
            type="button"
            className="btn-ghost w-full justify-start"
            onClick={() => {
              onToggleCollapse();
              setMenuOpen(false);
            }}
          >
            {block.collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            {block.collapsed ? 'Ausklappen' : 'Einklappen'}
          </button>
          <button
            type="button"
            className="btn-danger w-full justify-start"
            onClick={() => {
              setMenuOpen(false);
              void onDelete();
            }}
          >
            <Trash2 size={18} /> Block löschen
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------- Block wählen */

function AddBlockModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (type: Block['type']) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Block hinzufügen" size="lg">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {BLOCK_DEFS.map((def) => {
          const Icon = iconByName(def.icon);
          return (
            <button
              key={def.type}
              type="button"
              onClick={() => onPick(def.type)}
              className="flex min-h-[86px] flex-col items-start gap-1.5 rounded-xl border border-line bg-cream-50 p-3 text-left transition-all duration-200 ease-calm hover:border-brass-400 hover:bg-cream-200 active:scale-[0.99]"
            >
              <Icon size={19} className="text-brass-600" />
              <span className="text-[15px] font-medium text-ink">{def.label}</span>
              <span className="text-[13px] leading-snug text-ink-muted">{def.description}</span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
