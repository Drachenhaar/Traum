/**
 * Die Concept-Art-Fläche.
 *
 * Unendliche Fläche, auf der Bilder, Notizen, Skizzen und Einträge liegen
 * dürfen. Zwei Dinge unterscheiden sie von einem Moodboard-Werkzeug:
 *
 *  1. Einträge liegen hier als echte Einträge – ein Klick führt in die Welt.
 *  2. Zwischen zwei Einträgen, die in der Welt verbunden sind, zeichnet die
 *     Fläche die Verbindung von selbst. Man muss sie nicht nachbauen.
 *
 * Alles wird beim Loslassen gespeichert, auch die Kameraposition.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Frame,
  Hand,
  ImagePlus,
  Maximize2,
  MousePointer2,
  Pencil,
  StickyNote,
  Trash2,
  Type as TypeIcon,
} from 'lucide-react';
import { useStudio, livingEntries } from '../store/useStudio';
import type { CanvasItem } from '../types';
import { ImagePicker } from '../components/images/ImagePicker';
import { EntryLinkPicker } from '../components/entry/EntryLinkPicker';
import { useImageUrl } from '../components/images/Thumb';
import { templateFor } from '../lib/templates';
import { cx, newId } from '../lib/utils';

type Tool = 'select' | 'pan' | 'draw';

const NOTE_COLORS = ['#F1EADC', '#E3D3AE', '#D8E0D2', '#E8D5C6', '#DCD9E4'];

export function CanvasBoardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const board = useStudio((s) => s.boards.find((b) => b.id === id));
  const updateBoard = useStudio((s) => s.updateBoard);
  const entries = useStudio((s) => s.entries);
  const relations = useStudio((s) => s.relations);

  const surfaceRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [entryPickerOpen, setEntryPickerOpen] = useState(false);
  const [size, setSize] = useState({ w: 1000, h: 700 });

  const camera = board?.camera ?? { x: 0, y: 0, zoom: 1 };
  const items = useMemo(() => [...(board?.items ?? [])].sort((a, b) => a.z - b.z), [board]);

  const entriesById = useMemo(() => new Map(livingEntries(entries).map((e) => [e.id, e])), [entries]);

  /** Verbindungen zwischen Einträgen, die auf dieser Fläche liegen. */
  const autoLinks = useMemo(() => {
    const placed = new Map<string, CanvasItem>();
    items.forEach((i) => i.kind === 'entry' && i.refId && placed.set(i.refId, i));
    if (placed.size < 2) return [];
    return relations
      .filter((r) => placed.has(r.fromId) && placed.has(r.toId))
      .map((r) => ({ id: r.id, a: placed.get(r.fromId)!, b: placed.get(r.toId)! }));
  }, [items, relations]);

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const observer = new ResizeObserver((obs) => {
      const rect = obs[0].contentRect;
      setSize({ w: rect.width, h: rect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* --------------------------------------------------- Koordinaten & Kamera */

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = surfaceRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - rect.width / 2) / camera.zoom - camera.x,
        y: (clientY - rect.top - rect.height / 2) / camera.zoom - camera.y,
      };
    },
    [camera],
  );

  const setCamera = (next: Partial<typeof camera>) => {
    if (!board) return;
    updateBoard(board.id, { camera: { ...camera, ...next } });
  };

  const patchItems = (mutate: (list: CanvasItem[]) => CanvasItem[]) => {
    if (!board) return;
    updateBoard(board.id, { items: mutate(board.items) });
  };

  const addItem = (item: Omit<CanvasItem, 'id' | 'z'>) => {
    if (!board) return;
    const maxZ = board.items.reduce((m, i) => Math.max(m, i.z), 0);
    const created: CanvasItem = { ...item, id: newId('ci'), z: maxZ + 1 };
    updateBoard(board.id, { items: [...board.items, created] });
    setSelectedId(created.id);
    return created;
  };

  /** Neue Elemente landen in der Mitte des sichtbaren Ausschnitts. */
  const centerOfView = () => ({ x: -camera.x, y: -camera.y });

  /* ------------------------------------------------------------- Zeigereien */

  const drag = useRef<{
    mode: 'none' | 'pan' | 'move' | 'resize' | 'draw';
    itemId?: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    originW: number;
    originH: number;
    moved: boolean;
    pointers: Map<number, { x: number; y: number }>;
    pinch?: { dist: number; zoom: number };
    stroke?: number[];
  }>({
    mode: 'none',
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    originW: 0,
    originH: 0,
    moved: false,
    pointers: new Map(),
  });

  const onPointerDown = (e: React.PointerEvent) => {
    if (!board) return;
    const state = drag.current;
    state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);

    if (state.pointers.size === 2) {
      const [a, b] = [...state.pointers.values()];
      state.pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: camera.zoom };
      state.mode = 'none';
      return;
    }

    const target = e.target as HTMLElement;
    const itemId = target.closest('[data-item]')?.getAttribute('data-item') ?? undefined;
    const handle = target.getAttribute('data-handle');

    state.startX = e.clientX;
    state.startY = e.clientY;
    state.moved = false;

    if (tool === 'draw') {
      const world = toWorld(e.clientX, e.clientY);
      state.mode = 'draw';
      state.stroke = [0, 0];
      state.originX = world.x;
      state.originY = world.y;
      return;
    }

    if (handle && itemId) {
      const item = board.items.find((i) => i.id === itemId);
      if (item) {
        state.mode = 'resize';
        state.itemId = itemId;
        state.originW = item.w;
        state.originH = item.h;
      }
      return;
    }

    if (itemId && tool === 'select') {
      const item = board.items.find((i) => i.id === itemId);
      if (item) {
        state.mode = 'move';
        state.itemId = itemId;
        state.originX = item.x;
        state.originY = item.y;
        setSelectedId(itemId);
      }
      return;
    }

    state.mode = 'pan';
    state.originX = camera.x;
    state.originY = camera.y;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const state = drag.current;
    if (!state.pointers.has(e.pointerId)) return;
    state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (state.pointers.size === 2 && state.pinch) {
      const [a, b] = [...state.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      setCamera({ zoom: clamp((dist / state.pinch.dist) * state.pinch.zoom, 0.1, 4) });
      return;
    }

    const dx = (e.clientX - state.startX) / camera.zoom;
    const dy = (e.clientY - state.startY) / camera.zoom;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) state.moved = true;

    switch (state.mode) {
      case 'pan':
        setCamera({ x: state.originX + dx, y: state.originY + dy });
        break;
      case 'move':
        patchItems((list) =>
          list.map((i) =>
            i.id === state.itemId ? { ...i, x: state.originX + dx, y: state.originY + dy } : i,
          ),
        );
        break;
      case 'resize':
        patchItems((list) =>
          list.map((i) =>
            i.id === state.itemId
              ? { ...i, w: Math.max(60, state.originW + dx), h: Math.max(48, state.originH + dy) }
              : i,
          ),
        );
        break;
      case 'draw': {
        if (!state.stroke) return;
        const world = toWorld(e.clientX, e.clientY);
        state.stroke.push(world.x - state.originX, world.y - state.originY);
        // Während des Zeichnens nur alle paar Punkte neu speichern.
        if (state.stroke.length % 8 === 0) forceRedraw((n) => n + 1);
        break;
      }
      default:
        break;
    }
  };

  const [, forceRedraw] = useState(0);

  const onPointerUp = (e: React.PointerEvent) => {
    const state = drag.current;
    state.pointers.delete(e.pointerId);
    if (state.pointers.size < 2) state.pinch = undefined;

    if (state.mode === 'draw' && state.stroke && state.stroke.length > 6) {
      const xs = state.stroke.filter((_, i) => i % 2 === 0);
      const ys = state.stroke.filter((_, i) => i % 2 === 1);
      addItem({
        kind: 'stroke',
        x: state.originX,
        y: state.originY,
        w: Math.max(...xs) - Math.min(...xs) || 1,
        h: Math.max(...ys) - Math.min(...ys) || 1,
        points: state.stroke,
        color: '#3B2E23',
      });
    } else if (state.mode === 'pan' && !state.moved && tool === 'select') {
      setSelectedId(null);
    }

    state.mode = 'none';
    state.itemId = undefined;
    state.stroke = undefined;
  };

  const onWheel = (e: React.WheelEvent) => {
    setCamera({ zoom: clamp(camera.zoom * (e.deltaY > 0 ? 0.92 : 1.08), 0.1, 4) });
  };

  /** Alles ins Bild rücken. */
  const fit = () => {
    if (!items.length) {
      setCamera({ x: 0, y: 0, zoom: 1 });
      return;
    }
    const minX = Math.min(...items.map((i) => i.x));
    const minY = Math.min(...items.map((i) => i.y));
    const maxX = Math.max(...items.map((i) => i.x + i.w));
    const maxY = Math.max(...items.map((i) => i.y + i.h));
    const w = maxX - minX || 1;
    const h = maxY - minY || 1;
    setCamera({
      x: -(minX + w / 2),
      y: -(minY + h / 2),
      zoom: clamp(Math.min((size.w - 80) / w, (size.h - 80) / h), 0.1, 1.5),
    });
  };

  const selected = items.find((i) => i.id === selectedId);

  if (!board) {
    return (
      <div className="py-20 text-center">
        <h1 className="font-serif text-2xl text-ink">Diese Fläche gibt es nicht mehr</h1>
        <Link to="/canvas" className="btn-accent mt-5 inline-flex">
          Zu den Flächen
        </Link>
      </div>
    );
  }

  return (
    <div className="-mx-4 -mt-5 flex h-[calc(100vh-var(--sat)-56px)] flex-col sm:-mx-6 lg:-mt-8">
      {/* Werkzeugleiste */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 sm:px-5">
        <button
          type="button"
          onClick={() => navigate('/canvas')}
          className="touch-target grid place-items-center rounded-xl text-ink-muted hover:bg-cream-200 hover:text-ink"
          aria-label="Zurück zu den Flächen"
        >
          <ArrowLeft size={20} />
        </button>
        <input
          value={board.name}
          onChange={(e) => updateBoard(board.id, { name: e.target.value })}
          className="min-w-0 max-w-[180px] flex-1 border-0 bg-transparent px-1 font-serif text-[19px] text-ink outline-none sm:max-w-[280px]"
          aria-label="Name der Fläche"
        />

        <div className="flex overflow-hidden rounded-xl border border-line">
          <ToolButton active={tool === 'select'} onClick={() => setTool('select')} label="Auswählen">
            <MousePointer2 size={17} />
          </ToolButton>
          <ToolButton active={tool === 'pan'} onClick={() => setTool('pan')} label="Verschieben">
            <Hand size={17} />
          </ToolButton>
          <ToolButton active={tool === 'draw'} onClick={() => setTool('draw')} label="Zeichnen">
            <Pencil size={17} />
          </ToolButton>
        </div>

        <div className="flex gap-1.5">
          <button
            type="button"
            className="btn-ghost h-11 min-h-0 px-2.5"
            onClick={() => setImagePickerOpen(true)}
            aria-label="Bild hinzufügen"
            title="Bild"
          >
            <ImagePlus size={17} />
          </button>
          <button
            type="button"
            className="btn-ghost h-11 min-h-0 px-2.5"
            aria-label="Notiz hinzufügen"
            title="Notiz"
            onClick={() => {
              const c = centerOfView();
              addItem({
                kind: 'note',
                x: c.x - 90,
                y: c.y - 60,
                w: 180,
                h: 120,
                text: '',
                color: NOTE_COLORS[0],
              });
            }}
          >
            <StickyNote size={17} />
          </button>
          <button
            type="button"
            className="btn-ghost h-11 min-h-0 px-2.5"
            aria-label="Eintrag hinzufügen"
            title="Eintrag"
            onClick={() => setEntryPickerOpen(true)}
          >
            <TypeIcon size={17} />
          </button>
          <button
            type="button"
            className="btn-ghost h-11 min-h-0 px-2.5"
            aria-label="Rahmen hinzufügen"
            title="Rahmen"
            onClick={() => {
              const c = centerOfView();
              addItem({
                kind: 'frame',
                x: c.x - 200,
                y: c.y - 150,
                w: 400,
                h: 300,
                text: 'Gruppe',
                color: '#A8853F',
              });
            }}
          >
            <Frame size={17} />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" className="btn-ghost h-11 min-h-0 px-2.5" onClick={fit} aria-label="Einpassen">
            <Maximize2 size={17} />
          </button>
          <span className="hidden text-[13px] text-ink-faint sm:inline">
            {Math.round(camera.zoom * 100)} %
          </span>
        </div>
      </div>

      {/* Die Fläche */}
      <div
        ref={surfaceRef}
        className={cx(
          'relative flex-1 touch-none overflow-hidden border-y border-line',
          tool === 'draw' ? 'cursor-crosshair' : tool === 'pan' ? 'cursor-grab' : 'cursor-default',
        )}
        style={{
          background:
            'radial-gradient(circle at 1px 1px, rgba(124,106,87,0.18) 1px, transparent 0) 0 0/22px 22px, #F7F2E8',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <div
          className="absolute left-1/2 top-1/2 h-0 w-0"
          style={{ transform: `scale(${camera.zoom}) translate(${camera.x}px, ${camera.y}px)` }}
        >
          {/* Automatische Verbindungen zwischen verwandten Einträgen */}
          {autoLinks.length > 0 && (
            <svg
              className="pointer-events-none absolute"
              style={{ left: -5000, top: -5000, width: 10000, height: 10000, overflow: 'visible' }}
            >
              {autoLinks.map((link) => (
                <line
                  key={link.id}
                  x1={link.a.x + link.a.w / 2 + 5000}
                  y1={link.a.y + link.a.h / 2 + 5000}
                  x2={link.b.x + link.b.w / 2 + 5000}
                  y2={link.b.y + link.b.h / 2 + 5000}
                  stroke="#A8853F"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  opacity={0.55}
                />
              ))}
            </svg>
          )}

          {items.map((item) => (
            <CanvasItemView
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              entryTitle={item.kind === 'entry' ? entriesById.get(item.refId ?? '')?.title : undefined}
              entryType={item.kind === 'entry' ? entriesById.get(item.refId ?? '')?.type : undefined}
              onChangeText={(text) => patchItems((list) => list.map((i) => (i.id === item.id ? { ...i, text } : i)))}
            />
          ))}

          {/* Die Linie, die gerade gezeichnet wird */}
          {drag.current.mode === 'draw' && drag.current.stroke && (
            <svg
              className="pointer-events-none absolute"
              style={{
                left: drag.current.originX,
                top: drag.current.originY,
                overflow: 'visible',
              }}
            >
              <path
                d={pointsToPath(drag.current.stroke)}
                fill="none"
                stroke="#3B2E23"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        {items.length === 0 && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center px-8 text-center">
            <div>
              <p className="font-serif text-[22px] text-ink">Eine leere Fläche</p>
              <p className="mt-1.5 max-w-sm text-[15px] text-ink-muted">
                Lege Bilder ab, schreibe Notizen, zeichne. Einträge, die in deiner Welt verbunden
                sind, verbinden sich hier von selbst.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Auswahlleiste */}
      {selected && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line bg-cream-50 px-3 py-2 pb-safe sm:px-5">
          <span className="text-[13px] text-ink-muted">
            {selected.kind === 'note'
              ? 'Notiz'
              : selected.kind === 'image'
                ? 'Bild'
                : selected.kind === 'entry'
                  ? 'Eintrag'
                  : selected.kind === 'frame'
                    ? 'Rahmen'
                    : 'Zeichnung'}
          </span>

          {(selected.kind === 'note' || selected.kind === 'frame' || selected.kind === 'stroke') && (
            <div className="flex gap-1">
              {(selected.kind === 'stroke' ? ['#3B2E23', '#A8853F', '#55604A', '#8B3A2F'] : NOTE_COLORS).map(
                (color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() =>
                      patchItems((list) => list.map((i) => (i.id === selected.id ? { ...i, color } : i)))
                    }
                    className={cx(
                      'h-8 w-8 rounded-lg border transition-transform',
                      selected.color === color ? 'border-ink scale-105' : 'border-line',
                    )}
                    style={{ background: color }}
                    aria-label={`Farbe ${color}`}
                  />
                ),
              )}
            </div>
          )}

          <button
            type="button"
            className="btn-ghost h-10 min-h-0 px-2.5 text-[13px]"
            onClick={() =>
              patchItems((list) => {
                const maxZ = list.reduce((m, i) => Math.max(m, i.z), 0);
                return list.map((i) => (i.id === selected.id ? { ...i, z: maxZ + 1 } : i));
              })
            }
          >
            Nach vorn
          </button>

          {selected.kind === 'entry' && selected.refId && (
            <Link to={`/eintrag/${selected.refId}`} className="btn-ghost h-10 min-h-0 px-2.5 text-[13px]">
              Öffnen
            </Link>
          )}

          <button
            type="button"
            className="btn-danger ml-auto h-10 min-h-0 px-2.5"
            aria-label="Element entfernen"
            onClick={() => {
              patchItems((list) => list.filter((i) => i.id !== selected.id));
              setSelectedId(null);
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {/* Dialoge */}
      <ImagePicker
        open={imagePickerOpen}
        onClose={() => setImagePickerOpen(false)}
        multiple
        title="Bilder auf die Fläche legen"
        onSelect={(ids) => {
          const c = centerOfView();
          ids.forEach((imageId, i) => {
            addItem({
              kind: 'image',
              x: c.x - 140 + (i % 4) * 30,
              y: c.y - 105 + Math.floor(i / 4) * 30,
              w: 280,
              h: 210,
              refId: imageId,
            });
          });
        }}
      />

      <EntryLinkPicker
        open={entryPickerOpen}
        onClose={() => setEntryPickerOpen(false)}
        selected={[]}
        title="Einträge auf die Fläche legen"
        onChange={(ids) => {
          const c = centerOfView();
          ids.forEach((entryId, i) => {
            addItem({
              kind: 'entry',
              x: c.x - 110 + (i % 4) * 40,
              y: c.y - 45 + Math.floor(i / 4) * 40,
              w: 220,
              h: 90,
              refId: entryId,
            });
          });
        }}
      />

    </div>
  );
}

/* ------------------------------------------------------------- Einzelstücke */

function ToolButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cx(
        'grid h-11 w-11 place-items-center border-l border-line first:border-l-0 transition-colors',
        active ? 'bg-cream-300 text-ink' : 'bg-cream-50 text-ink-muted hover:bg-cream-200',
      )}
    >
      {children}
    </button>
  );
}

function CanvasItemView({
  item,
  selected,
  entryTitle,
  entryType,
  onChangeText,
}: {
  item: CanvasItem;
  selected: boolean;
  entryTitle?: string;
  entryType?: string;
  onChangeText: (text: string) => void;
}) {
  const url = useImageUrl(item.kind === 'image' ? item.refId : undefined, 'thumb');

  const frame = (
    <div
      data-item={item.id}
      className={cx(
        'absolute transition-shadow duration-200 ease-calm',
        selected ? 'z-10' : '',
      )}
      style={{ left: item.x, top: item.y, width: item.w, height: item.h, zIndex: item.z }}
    >
      {item.kind === 'image' && (
        <div
          className={cx(
            'h-full w-full overflow-hidden rounded-xl bg-cream-200 shadow-card',
            selected && 'ring-2 ring-brass-500',
          )}
        >
          {url ? (
            <img src={url} alt="" className="h-full w-full object-cover" draggable={false} />
          ) : (
            <div className="grid h-full place-items-center text-[13px] text-ink-faint">Bild fehlt</div>
          )}
        </div>
      )}

      {item.kind === 'note' && (
        <div
          className={cx(
            'h-full w-full overflow-hidden rounded-xl border border-black/5 p-2.5 shadow-card',
            selected && 'ring-2 ring-brass-500',
          )}
          style={{ background: item.color ?? NOTE_COLORS[0] }}
        >
          <textarea
            value={item.text ?? ''}
            onChange={(e) => onChangeText(e.target.value)}
            placeholder="Notiz …"
            className="h-full w-full resize-none border-0 bg-transparent text-[14px] leading-snug text-ink outline-none placeholder:text-ink-faint"
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {item.kind === 'entry' && (
        <div
          className={cx(
            'flex h-full w-full flex-col justify-center overflow-hidden rounded-xl border border-line bg-cream-50 px-3 shadow-card',
            selected && 'ring-2 ring-brass-500',
          )}
        >
          <p
            className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide"
            style={{ color: entryType ? templateFor(entryType).accent : '#7C6A57' }}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: entryType ? templateFor(entryType).accent : '#7C6A57' }}
            />
            {entryType ? templateFor(entryType).label : 'Eintrag'}
          </p>
          <p className="mt-0.5 truncate font-serif text-[17px] text-ink">
            {entryTitle ?? 'Nicht mehr vorhanden'}
          </p>
        </div>
      )}

      {item.kind === 'frame' && (
        <div
          className={cx(
            'h-full w-full rounded-2xl border-2 border-dashed',
            selected && 'ring-2 ring-brass-500',
          )}
          style={{ borderColor: item.color ?? '#A8853F' }}
        >
          <input
            value={item.text ?? ''}
            onChange={(e) => onChangeText(e.target.value)}
            className="w-full border-0 bg-transparent px-3 py-1.5 font-serif text-[16px] text-ink outline-none"
            placeholder="Gruppe"
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {item.kind === 'stroke' && item.points && (
        <svg className="pointer-events-none absolute left-0 top-0 overflow-visible">
          <path
            d={pointsToPath(item.points)}
            fill="none"
            stroke={item.color ?? '#3B2E23'}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* Griff zum Vergrößern */}
      {selected && item.kind !== 'stroke' && (
        <span
          data-item={item.id}
          data-handle="se"
          className="absolute -bottom-1.5 -right-1.5 h-5 w-5 cursor-se-resize rounded-full border-2 border-cream-50 bg-brass-500"
        />
      )}
    </div>
  );

  // Zeichnungen sollen sich anklicken lassen, ohne die Fläche zu blockieren.
  if (item.kind === 'stroke') {
    return (
      <div
        data-item={item.id}
        className="absolute"
        style={{ left: item.x, top: item.y, width: item.w, height: item.h, zIndex: item.z }}
      >
        <svg className="absolute left-0 top-0 overflow-visible" style={{ width: 1, height: 1 }}>
          <path
            d={pointsToPath(item.points ?? [])}
            fill="none"
            stroke={item.color ?? '#3B2E23'}
            strokeWidth={selected ? 3.5 : 2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={selected ? 1 : 0.92}
          />
          {/* Unsichtbare, dickere Linie zum leichteren Treffen */}
          <path
            data-item={item.id}
            d={pointsToPath(item.points ?? [])}
            fill="none"
            stroke="transparent"
            strokeWidth={16}
            style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
          />
        </svg>
      </div>
    );
  }

  return frame;
}

/* ------------------------------------------------------------------ Helfer */

function pointsToPath(points: number[]): string {
  if (points.length < 4) return '';
  let d = `M ${points[0]} ${points[1]}`;
  for (let i = 2; i < points.length; i += 2) {
    d += ` L ${points[i]} ${points[i + 1]}`;
  }
  return d;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
